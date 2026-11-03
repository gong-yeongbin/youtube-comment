// FetchPanel 렌더 테스트 — 버튼 클릭 시 목록 표시, 실패 시 오류 메시지 표시
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import type { Video } from '@/shared/api';
import { FetchPanel } from './fetch-panel';

vi.mock('@/shared/api', () => ({ fetchVideos: vi.fn(), resolveVideo: vi.fn() }));
import { fetchVideos } from '@/shared/api';

const video: Video = {
	videoId: 'dQw4w9WgXcQ',
	url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
	title: '썸 타는 중인데 연락이 줄었어요',
	channelTitle: '연애상담소',
	publishedAt: '2026-11-01T00:00:00Z',
	thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
	viewCount: 1234,
	description: '',
	alreadyCommented: false,
};

function renderPanel() {
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	return render(
		<QueryClientProvider client={client}>
			<FetchPanel selected={null} onSelect={() => {}} />
		</QueryClientProvider>
	);
}

describe('FetchPanel', () => {
	it('버튼을 누르면 영상 목록을 표시한다', async () => {
		vi.mocked(fetchVideos).mockResolvedValue([video]);
		renderPanel();
		fireEvent.click(screen.getByRole('button', { name: '연애 고민 영상 불러오기' }));
		expect(await screen.findByText(video.title)).toBeTruthy();
		expect(screen.getByText(/연애상담소/)).toBeTruthy();
	});

	it('실패하면 오류 메시지를 표시한다', async () => {
		vi.mocked(fetchVideos).mockRejectedValue(new Error('YOUTUBE_API_KEY가 설정되지 않았습니다.'));
		renderPanel();
		fireEvent.click(screen.getByRole('button', { name: '연애 고민 영상 불러오기' }));
		expect(await screen.findByText('YOUTUBE_API_KEY가 설정되지 않았습니다.')).toBeTruthy();
	});
});
