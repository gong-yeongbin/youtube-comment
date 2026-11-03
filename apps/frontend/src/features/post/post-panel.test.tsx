// PostPanel 렌더 테스트 — 게시 시작 후 SSE 이벤트에 따라 스텝이 진행되고, 실패 시 사유·캡처를 보여 준다
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import type { PostEvent, Video } from '@/shared/api';
import { PostPanel } from './post-panel';

vi.mock('@/shared/api', () => ({
	fetchProfiles: vi.fn(),
	loginProfile: vi.fn(),
	startPost: vi.fn(),
	postEventsUrl: (id: string) => `/api/post/${id}/events`,
}));
import { fetchProfiles, startPost } from '@/shared/api';

class FakeEventSource {
	static instances: FakeEventSource[] = [];
	onmessage: ((e: MessageEvent<string>) => void) | null = null;
	onerror: (() => void) | null = null;
	closed = false;
	constructor(public url: string) {
		FakeEventSource.instances.push(this);
	}
	emit(event: PostEvent) {
		this.onmessage?.({ data: JSON.stringify(event) } as MessageEvent<string>);
	}
	close() {
		this.closed = true;
	}
}
vi.stubGlobal('EventSource', FakeEventSource);

const video: Video = { videoId: 'dQw4w9WgXcQ', url: '', title: '영상', channelTitle: 'ch', publishedAt: '2026-11-01T00:00:00Z', thumbnail: '', viewCount: 0, description: '', alreadyCommented: false };
const rules = { minChars: 40, maxChars: 120, brand: '운명원' };
const comment = '답장 세 시간 걸리면 하루 망한다는 말 진짜 공감이에요. 운명원 연애사주가 잘 본다던데 나도 보고 싶다';

function renderPanel(props: Partial<React.ComponentProps<typeof PostPanel>> = {}) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
	return render(
		<QueryClientProvider client={client}>
			<PostPanel selected={video} comment={comment} rules={rules} {...props} />
		</QueryClientProvider>
	);
}

beforeEach(() => {
	FakeEventSource.instances = [];
	vi.mocked(fetchProfiles).mockResolvedValue([
		{ name: 'youtube1', todayCount: 1, hasProfileDir: true },
		{ name: 'youtube2', todayCount: 0, hasProfileDir: false },
	]);
});

describe('PostPanel', () => {
	it('프로필 목록을 보여 주고 규칙 위반 댓글이면 게시 버튼을 막는다', async () => {
		renderPanel({ comment: '짧음' });
		expect(await screen.findByText('youtube2 · 오늘 0개 · 로그인 필요')).toBeTruthy();
		expect(screen.getByText(/규칙 위반/)).toBeTruthy();
		expect((screen.getByRole('button', { name: '댓글 게시' }) as HTMLButtonElement).disabled).toBe(true);
	});

	it('게시하면 SSE 이벤트대로 스텝이 완료되고 실패 시 캡처를 보여 준다', async () => {
		vi.mocked(startPost).mockResolvedValue({ jobId: 'job1', profile: 'youtube1' });
		renderPanel();
		await screen.findByText('youtube1 · 오늘 1개');
		fireEvent.click(screen.getByRole('button', { name: '댓글 게시' }));
		await vi.waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
		const es = FakeEventSource.instances[0]!;
		expect(es.url).toBe('/api/post/job1/events');

		es.emit({ type: 'opening', message: 'youtube1 프로필로 크롬을 엽니다' });
		expect(await screen.findByText('youtube1 프로필로 크롬을 엽니다')).toBeTruthy();
		expect(screen.getByRole('button', { name: '게시 중…' })).toBeTruthy();

		es.emit({ type: 'failed', reason: 'not_logged_in', message: '로그인되어 있지 않습니다.', screenshot: '/api/screenshots/job1.png' });
		expect(await screen.findByText(/실패 \(not_logged_in\)/)).toBeTruthy();
		expect(screen.getByAltText('실패 시점 캡처').getAttribute('src')).toBe('/api/screenshots/job1.png');
		expect(es.closed).toBe(true);
		expect(screen.getByRole('button', { name: '댓글 게시' })).toBeTruthy();
	});
});
