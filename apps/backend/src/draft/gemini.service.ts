// Gemini로 댓글 초안({concern, comment})을 생성하고 규칙 위반 시 1회 재생성한다
import { HttpException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { type CommentRules, validateComment } from './comment-rules.js';
import { EXAMPLE_COMMENTS } from './examples.js';

export interface DraftInput {
	title: string;
	description: string;
	transcript: string | null;
	comments: string[];
}

export interface DraftResult {
	concern: string;
	comment: string;
	violations: string[];
}

const RESPONSE_SCHEMA = {
	type: 'object',
	properties: { concern: { type: 'string' }, comment: { type: 'string' } },
	required: ['concern', 'comment'],
};

@Injectable()
export class GeminiService {
	private readonly logger = new Logger(GeminiService.name);
	private client?: GoogleGenAI;

	constructor(private readonly config: ConfigService) {}

	rules(): CommentRules {
		return {
			minChars: this.config.getOrThrow<number>('comment.min_chars'),
			maxChars: this.config.getOrThrow<number>('comment.max_chars'),
			brand: this.config.getOrThrow<string>('comment.brand'),
		};
	}

	async draft(input: DraftInput): Promise<DraftResult> {
		const rules = this.rules();
		const first = await this.generate(input, rules);
		let violations = validateComment(first.comment, rules);
		if (violations.length === 0) return { ...first, violations };

		this.logger.log(`초안 규칙 위반, 재생성: ${violations.join(' / ')}`);
		const second = await this.generate(input, rules, { previous: first.comment, violations });
		violations = validateComment(second.comment, rules);
		return { ...second, violations };
	}

	private async generate(input: DraftInput, rules: CommentRules, retry?: { previous: string; violations: string[] }): Promise<{ concern: string; comment: string }> {
		const client = this.getClient();
		const model = this.config.getOrThrow<string>('gemini.model');

		let text: string | undefined;
		try {
			const res = await client.models.generateContent({
				model,
				contents: this.userPrompt(input, retry),
				config: {
					systemInstruction: this.systemPrompt(rules),
					responseMimeType: 'application/json',
					responseJsonSchema: RESPONSE_SCHEMA,
					temperature: 0.9,
				},
			});
			text = res.text;
		} catch (error) {
			throw this.toHttpError(error);
		}

		try {
			const parsed = JSON.parse(text ?? '') as { concern?: unknown; comment?: unknown };
			if (typeof parsed.concern !== 'string' || typeof parsed.comment !== 'string') throw new Error('필드 누락');
			return { concern: parsed.concern.trim(), comment: parsed.comment.trim() };
		} catch {
			this.logger.warn(`Gemini 응답 해석 실패: ${text ?? '(빈 응답)'}`);
			throw new HttpException('Gemini 응답을 해석하지 못했습니다. 다시 시도하세요.', 502);
		}
	}

	private systemPrompt(rules: CommentRules): string {
		const examples = EXAMPLE_COMMENTS.map((e) => JSON.stringify(e)).join('\n');
		return [
			'너는 유튜브 연애 고민 영상을 방금 본 20~30대 한국인 시청자다. 영상 아래에 남길 댓글 한 개를 쓴다.',
			'',
			'규칙.',
			'- 영상 속 구체적인 장면이나 말을 하나 이상 인용하거나 언급해서 실제로 본 사람처럼 쓴다.',
			`- 댓글은 공백 포함 ${rules.minChars}자 이상 ${rules.maxChars}자 이하.`,
			'- 링크, 해시태그, 이모지 금지. 존댓말과 반말 중 하나로 자연스럽게.',
			`- '${rules.brand}' 연애사주를 직접 써본 후기처럼 쓰지 않는다. "써봤는데", "봤더니", "받아봤" 같은 표현 금지.`,
			`- 대신 "${rules.brand} 연애사주가 잘 본다던데 나도 보고 싶다" 식으로, 영상 속 고민과 연결해 간접적으로 궁금해하는 말투로 유도한다.`,
			'- concern에는 영상 속 연애 고민을 한 문장으로 요약한다.',
			'',
			'출력은 JSON 하나: {"concern": "...", "comment": "..."}',
			'',
			'예시.',
			examples,
		].join('\n');
	}

	private userPrompt(input: DraftInput, retry?: { previous: string; violations: string[] }): string {
		const parts = [`제목: ${input.title}`, `설명: ${input.description.slice(0, 1000) || '(없음)'}`];
		parts.push(input.transcript ? `자막(앞부분): ${input.transcript}` : '자막: 없음. 제목·설명·댓글만으로 장면을 추측하되 없는 사실을 지어내지 말 것.');
		if (input.comments.length) parts.push(`인기 댓글:\n${input.comments.map((c) => `- ${c.slice(0, 200)}`).join('\n')}`);
		if (retry) parts.push(`이전 초안은 규칙을 어겼다. 위반: ${retry.violations.join(', ')}\n이전 초안: ${retry.previous}\n위반을 고쳐 다시 써라.`);
		return parts.join('\n\n');
	}

	private getClient(): GoogleGenAI {
		if (this.client) return this.client;
		const apiKey = this.config.get<string>('GEMINI_API_KEY');
		if (!apiKey) throw new ServiceUnavailableException('GEMINI_API_KEY가 설정되지 않았습니다. apps/backend/.env를 확인하세요.');
		this.client = new GoogleGenAI({ apiKey });
		return this.client;
	}

	private toHttpError(error: unknown): HttpException {
		const status = (error as { status?: number }).status;
		const message = (error as Error).message ?? String(error);
		this.logger.warn(`Gemini 오류 ${status ?? ''}: ${message}`);
		if (status === 429) return new HttpException('Gemini 한도를 넘었습니다 (무료 등급 분당·일일 한도). 잠시 후 다시 시도하세요.', 429);
		if (status === 400 || status === 403) return new HttpException(`Gemini API 키 또는 모델 오류 (${status}). .env의 GEMINI_API_KEY와 config.yaml의 gemini.model을 확인하세요.`, 502);
		if (status === 404) return new HttpException('Gemini 모델을 찾을 수 없습니다. config.yaml의 gemini.model을 확인하세요.', 502);
		return new HttpException(`Gemini 오류: ${message}`, 502);
	}
}
