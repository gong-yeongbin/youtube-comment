// Playwright로 크롬 프로필을 열어 댓글을 한 글자씩 타이핑·게시·확인한다. 실패하면 캡처를 남긴다
import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { type BrowserContext, chromium, type Locator, type Page } from 'playwright';
import type { FailReason, PostEvent } from './post-events.js';

// src/post 와 dist/post 모두 저장소 루트까지 4단계 위다
export const PROFILES_DIR = resolve(__dirname, '../../../../profiles');
export const SCREENSHOT_DIR = resolve(__dirname, '../../../../data/screenshots');

const SEL = {
	avatar: 'ytd-masthead #avatar-btn',
	signIn: 'ytd-masthead a[href*="ServiceLogin"], ytd-masthead a[aria-label="로그인"]',
	placeholder: 'ytd-comment-simplebox-renderer #placeholder-area',
	editor: 'ytd-comment-simplebox-renderer #contenteditable-root',
	submit: 'ytd-comment-simplebox-renderer #submit-button',
	commentText: 'ytd-comment-thread-renderer #content-text',
};

export interface PostJob {
	jobId: string;
	videoId: string;
	comment: string;
	profile: string;
}

@Injectable()
export class PosterService {
	private readonly logger = new Logger(PosterService.name);

	hasProfile(name: string): boolean {
		return existsSync(join(PROFILES_DIR, name));
	}

	/** 프로필 폴더로 크롬을 열어 구글 로그인 페이지를 띄운다. 사용자가 직접 로그인하고 창을 닫는다 */
	async openForLogin(name: string): Promise<void> {
		const context = await this.launch(name);
		const page = context.pages()[0] ?? (await context.newPage());
		await page.goto('https://accounts.google.com/ServiceLogin?hl=ko&continue=https%3A%2F%2Fwww.youtube.com%2F');
		context.on('close', () => this.logger.log(`프로필 ${name} 로그인 창 닫힘`));
	}

	async *post(job: PostJob): AsyncGenerator<PostEvent> {
		yield { type: 'opening', message: `${job.profile} 프로필로 크롬을 엽니다` };
		const context = await this.launch(job.profile);
		const page = context.pages()[0] ?? (await context.newPage());
		try {
			await page.goto(`https://www.youtube.com/watch?v=${job.videoId}`, { waitUntil: 'domcontentloaded' });

			if (!(await this.isLoggedIn(page))) {
				yield await this.fail(page, job.jobId, 'not_logged_in', `${job.profile} 프로필이 유튜브에 로그인되어 있지 않습니다. 프로필 로그인 버튼으로 먼저 로그인하세요.`);
				return;
			}

			const placeholder = page.locator(SEL.placeholder);
			if (!(await this.scrollUntilVisible(page, placeholder))) {
				yield await this.fail(page, job.jobId, 'comment_box_not_found', '댓글 입력창을 찾지 못했습니다. 댓글이 막힌 영상일 수 있습니다.');
				return;
			}
			await placeholder.click();
			const editor = page.locator(SEL.editor);
			await editor.waitFor({ state: 'visible', timeout: 10_000 });
			await editor.click();

			yield { type: 'typing', message: '한 글자씩 입력 중' };
			await page.keyboard.type(job.comment, { delay: 60 });

			await page.locator(SEL.submit).click();
			yield { type: 'posted', message: '댓글 버튼을 눌렀습니다. 목록에 보이는지 확인 중' };

			let visible = await this.waitForComment(page, job.comment, 15_000);
			if (!visible) {
				await page.reload({ waitUntil: 'domcontentloaded' });
				await this.scrollUntilVisible(page, page.locator(SEL.placeholder));
				visible = await this.waitForComment(page, job.comment, 10_000);
			}
			if (!visible) {
				yield await this.fail(page, job.jobId, 'not_visible', '댓글을 눌렀지만 목록에서 확인하지 못했습니다. 스팸 필터에 걸렸을 수 있습니다.');
				return;
			}

			yield { type: 'verified', message: '댓글이 목록 최상단에 보입니다' };
			await page.waitForTimeout(4_000); // 시연용으로 잠시 유지
		} finally {
			await context.close().catch(() => undefined);
		}
	}

	private launch(profile: string): Promise<BrowserContext> {
		mkdirSync(PROFILES_DIR, { recursive: true });
		return chromium.launchPersistentContext(join(PROFILES_DIR, profile), {
			channel: 'chrome',
			headless: false,
			locale: 'ko-KR',
			viewport: null,
			args: ['--window-size=1280,900'],
		});
	}

	private async isLoggedIn(page: Page): Promise<boolean> {
		const avatar = page.locator(SEL.avatar);
		const signIn = page.locator(SEL.signIn).first();
		await Promise.race([avatar.waitFor({ timeout: 15_000 }), signIn.waitFor({ timeout: 15_000 })]).catch(() => undefined);
		return avatar.isVisible();
	}

	private async scrollUntilVisible(page: Page, target: Locator): Promise<boolean> {
		for (let i = 0; i < 12; i++) {
			if (await target.isVisible().catch(() => false)) {
				await target.scrollIntoViewIfNeeded();
				return true;
			}
			await page.mouse.wheel(0, 700);
			await page.waitForTimeout(500);
		}
		return target.isVisible().catch(() => false);
	}

	private async waitForComment(page: Page, comment: string, timeout: number): Promise<boolean> {
		const want = normalize(comment);
		const deadline = Date.now() + timeout;
		while (Date.now() < deadline) {
			const texts = await page.locator(SEL.commentText).allInnerTexts().catch(() => [] as string[]);
			if (texts.slice(0, 5).some((t) => normalize(t) === want)) return true;
			await page.waitForTimeout(1_000);
		}
		return false;
	}

	private async fail(page: Page, jobId: string, reason: FailReason, message: string): Promise<PostEvent> {
		let screenshot: string | undefined;
		try {
			mkdirSync(SCREENSHOT_DIR, { recursive: true });
			await page.screenshot({ path: join(SCREENSHOT_DIR, `${jobId}.png`) });
			screenshot = `/api/screenshots/${jobId}.png`;
		} catch (error) {
			this.logger.warn(`캡처 실패: ${(error as Error).message}`);
		}
		this.logger.warn(`게시 실패 ${reason}: ${message}`);
		return { type: 'failed', reason, message, screenshot };
	}
}

function normalize(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}
