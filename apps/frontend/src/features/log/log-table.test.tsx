// LogTable 렌더 테스트 — 빈 기록 안내, 최신순 정렬, 실패 사유·캡처 링크 표시
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import type { LogEntry } from '@/shared/api';
import { LogTable } from './log-table';

vi.mock('@/shared/api', () => ({ fetchLog: vi.fn() }));
import { fetchLog } from '@/shared/api';

const entries: LogEntry[] = [
	{ id: '1', at: '2026-11-03T01:00:00Z', videoId: 'aaaaaaaaaaa', videoTitle: '첫 영상', profile: 'youtube1', comment: '첫 댓글', status: 'success' },
	{ id: '2', at: '2026-11-03T02:00:00Z', videoId: 'bbbbbbbbbbb', videoTitle: '둘째 영상', profile: 'youtube2', comment: '둘째 댓글', status: 'failed', reason: 'not_logged_in', screenshot: '/screenshots/2.png' },
];

function renderTable() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={client}>
			<LogTable />
		</QueryClientProvider>
	);
}

describe('LogTable', () => {
	it('기록이 없으면 안내 문구', async () => {
		vi.mocked(fetchLog).mockResolvedValue([]);
		renderTable();
		expect(await screen.findByText('아직 게시 기록이 없습니다.')).toBeTruthy();
	});

	it('최신 기록이 위에 오고 실패 사유와 캡처 링크를 보여 준다', async () => {
		vi.mocked(fetchLog).mockResolvedValue(entries);
		renderTable();
		await screen.findByText('첫 영상');
		const rows = screen.getAllByRole('row').slice(1);
		expect(rows[0]?.textContent).toContain('둘째 영상');
		expect(rows[0]?.textContent).toContain('실패 (not_logged_in)');
		expect(screen.getByRole('link', { name: '캡처' }).getAttribute('href')).toBe('/screenshots/2.png');
		expect(rows[1]?.textContent).toContain('성공');
	});
});
