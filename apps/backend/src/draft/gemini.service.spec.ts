// GeminiService 유닛 테스트 — 규칙 통과 시 1회 호출, 위반 시 1회 재생성, 키 없음·한도 초과 오류 매핑
import { ConfigService } from '@nestjs/config';
import { GeminiService } from './gemini.service.js';

const generateContent = jest.fn();
jest.mock('@google/genai', () => ({
	GoogleGenAI: jest.fn().mockImplementation(() => ({ models: { generateContent } })),
}));

const settings: Record<string, unknown> = {
	'comment.min_chars': 40,
	'comment.max_chars': 120,
	'comment.brand': '운명원',
	'gemini.model': 'test-model',
	GEMINI_API_KEY: 'key',
};

function makeService(overrides: Record<string, unknown> = {}) {
	const values = { ...settings, ...overrides };
	const config = {
		get: (k: string) => values[k],
		getOrThrow: (k: string) => {
			if (values[k] === undefined) throw new Error(k);
			return values[k];
		},
	} as unknown as ConfigService;
	return new GeminiService(config);
}

const input = { title: '썸남 연락 텀', description: '', transcript: null, comments: [] };
const good = '답장 세 시간 걸리면 하루 망한다는 말 진짜 공감이에요. 운명원 연애사주가 잘 본다던데 나도 보고 싶다';
const bad = '운명원 써봤는데 잘 맞아요 https://x.com';

beforeEach(() => generateContent.mockReset());

describe('GeminiService.draft', () => {
	it('규칙을 지키면 한 번만 호출한다', async () => {
		generateContent.mockResolvedValueOnce({ text: JSON.stringify({ concern: '연락 텀', comment: good }) });
		const result = await makeService().draft(input);
		expect(result).toEqual({ concern: '연락 텀', comment: good, violations: [] });
		expect(generateContent).toHaveBeenCalledTimes(1);
	});

	it('위반 시 위반 내용을 담아 한 번 더 호출한다', async () => {
		generateContent
			.mockResolvedValueOnce({ text: JSON.stringify({ concern: 'c', comment: bad }) })
			.mockResolvedValueOnce({ text: JSON.stringify({ concern: 'c', comment: good }) });
		const result = await makeService().draft(input);
		expect(result.comment).toBe(good);
		expect(result.violations).toEqual([]);
		expect(generateContent).toHaveBeenCalledTimes(2);
		const [retryParams] = generateContent.mock.calls[1] as [{ contents: string }];
		const retryPrompt = retryParams.contents;
		expect(retryPrompt).toContain('이전 초안은 규칙을 어겼다');
		expect(retryPrompt).toContain('링크를 넣을 수 없습니다');
	});

	it('두 번째도 위반이면 위반 목록과 함께 돌려준다', async () => {
		generateContent.mockResolvedValue({ text: JSON.stringify({ concern: 'c', comment: bad }) });
		const result = await makeService().draft(input);
		expect(result.comment).toBe(bad);
		expect(result.violations.length).toBeGreaterThan(0);
		expect(generateContent).toHaveBeenCalledTimes(2);
	});

	it('JSON이 아니면 502', async () => {
		generateContent.mockResolvedValueOnce({ text: 'not json' });
		await expect(makeService().draft(input)).rejects.toMatchObject({ status: 502 });
	});

	it('키가 없으면 503', async () => {
		await expect(makeService({ GEMINI_API_KEY: undefined }).draft(input)).rejects.toMatchObject({ status: 503 });
		expect(generateContent).not.toHaveBeenCalled();
	});

	it('API 429는 429로 매핑한다', async () => {
		generateContent.mockRejectedValueOnce(Object.assign(new Error('quota'), { status: 429 }));
		await expect(makeService().draft(input)).rejects.toMatchObject({ status: 429 });
	});
});
