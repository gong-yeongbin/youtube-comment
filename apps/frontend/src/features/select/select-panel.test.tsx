// SelectPanel 렌더 테스트 — 초안 생성 결과 표시, 수정 시 검증 메시지 표시
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { vi } from 'vitest';
import type { Draft, Video } from '@/shared/api';
import { SelectPanel } from './select-panel';

vi.mock('@/shared/api', () => ({ createDraft: vi.fn() }));
import { createDraft } from '@/shared/api';

const video: Video = {
	videoId: 'dQw4w9WgXcQ',
	url: '',
	title: '썸남이 연락이 줄었어요',
	channelTitle: '연애상담소',
	publishedAt: '2026-11-01T00:00:00Z',
	thumbnail: '',
	viewCount: 0,
	description: '',
	alreadyCommented: false,
};

const draft: Draft = {
	videoId: video.videoId,
	concern: '썸 상대의 연락 빈도가 줄어 불안함',
	comment: '답장 세 시간 걸리면 하루 망한다는 말 진짜 공감이에요. 운명원 연애사주가 잘 본다던데 나도 보고 싶다',
	violations: [],
	hasTranscript: true,
	transcriptLang: 'ko',
	rules: { minChars: 40, maxChars: 120, brand: '운명원' },
};

function Harness() {
	const [d, setD] = useState<Draft | null>(null);
	const [comment, setComment] = useState('');
	return (
		<SelectPanel
			selected={video}
			draft={d}
			comment={comment}
			onDraft={(next) => {
				setD(next);
				setComment(next.comment);
			}}
			onCommentChange={setComment}
		/>
	);
}

function renderPanel() {
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	return render(
		<QueryClientProvider client={client}>
			<Harness />
		</QueryClientProvider>
	);
}

describe('SelectPanel', () => {
	it('초안을 생성하면 고민·초안·자막 표시가 나온다', async () => {
		vi.mocked(createDraft).mockResolvedValue(draft);
		renderPanel();
		fireEvent.click(screen.getByRole('button', { name: '댓글 초안 생성' }));
		expect(await screen.findByText(draft.concern)).toBeTruthy();
		expect(screen.getByDisplayValue(draft.comment)).toBeTruthy();
		expect(screen.getByText('자막 사용 (ko)')).toBeTruthy();
		expect(screen.getByText(/자 \/ 40~120자$/)).toBeTruthy();
	});

	it('초안을 규칙에 어긋나게 고치면 위반 메시지가 뜬다', async () => {
		vi.mocked(createDraft).mockResolvedValue(draft);
		renderPanel();
		fireEvent.click(screen.getByRole('button', { name: '댓글 초안 생성' }));
		const textarea = await screen.findByDisplayValue(draft.comment);
		fireEvent.change(textarea, { target: { value: '짧음 #태그' } });
		expect(screen.getByText(/40자 이상이어야 합니다/)).toBeTruthy();
		expect(screen.getByText(/해시태그를 넣을 수 없습니다/)).toBeTruthy();
		expect(screen.getByText(/'운명원' 언급이 없습니다/)).toBeTruthy();
	});

	it('실패하면 오류 메시지를 표시한다', async () => {
		vi.mocked(createDraft).mockRejectedValue(new Error('GEMINI_API_KEY가 설정되지 않았습니다.'));
		renderPanel();
		fireEvent.click(screen.getByRole('button', { name: '댓글 초안 생성' }));
		expect(await screen.findByText('GEMINI_API_KEY가 설정되지 않았습니다.')).toBeTruthy();
	});
});
