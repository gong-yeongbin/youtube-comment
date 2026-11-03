// SelectPanel 렌더 테스트 — 생성 중 안내, 초안 표시, 수정 시 검증 메시지, 오류 표시
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { vi } from 'vitest';
import type { Draft, Video } from '@/shared/api';
import { SelectPanel } from './select-panel';

const video: Video = { videoId: 'dQw4w9WgXcQ', url: '', title: '썸남이 연락이 줄었어요', channelTitle: '연애상담소', publishedAt: '2026-11-01T00:00:00Z', thumbnail: '', viewCount: 0, description: '', alreadyCommented: false };

const draft: Draft = {
	videoId: video.videoId,
	concern: '썸 상대의 연락 빈도가 줄어 불안함',
	comment: '답장 세 시간 걸리면 하루 망한다는 말 진짜 공감이에요. 운명원 연애사주가 잘 본다던데 나도 보고 싶다',
	violations: [],
	hasTranscript: true,
	transcriptLang: 'ko',
	rules: { minChars: 40, maxChars: 120, brand: '운명원' },
};

function Harness(props: Partial<React.ComponentProps<typeof SelectPanel>>) {
	const [comment, setComment] = useState(draft.comment);
	return <SelectPanel selected={video} draft={draft} comment={comment} generating={false} error={null} onRegenerate={() => {}} onCommentChange={setComment} {...props} />;
}

describe('SelectPanel', () => {
	it('생성 중이면 안내만 보이고 버튼은 없다', () => {
		render(<Harness draft={null} generating />);
		expect(screen.getByText(/초안을 쓰는 중/)).toBeTruthy();
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('초안이 있으면 고민·초안·자막·공백 제외 글자 수를 보여 준다', () => {
		render(<Harness />);
		expect(screen.getByText(draft.concern)).toBeTruthy();
		expect(screen.getByDisplayValue(draft.comment)).toBeTruthy();
		expect(screen.getByText('자막 사용 (ko)')).toBeTruthy();
		expect(screen.getByText(/^공백 제외 \d+자 \/ 40~120자$/)).toBeTruthy();
		expect(screen.getByRole('button', { name: '초안 다시 생성' })).toBeTruthy();
	});

	it('초안을 규칙에 어긋나게 고치면 위반 메시지가 뜬다', () => {
		render(<Harness />);
		fireEvent.change(screen.getByDisplayValue(draft.comment), { target: { value: '짧음 #태그' } });
		expect(screen.getByText(/공백 제외 40자 이상이어야 합니다/)).toBeTruthy();
		expect(screen.getByText(/해시태그를 넣을 수 없습니다/)).toBeTruthy();
		expect(screen.getByText(/'운명원' 언급이 없습니다/)).toBeTruthy();
	});

	it('실패하면 오류 메시지와 다시 시도 버튼을 보여 준다', () => {
		const onRegenerate = vi.fn();
		render(<Harness draft={null} error={new Error('GEMINI_API_KEY가 설정되지 않았습니다.')} onRegenerate={onRegenerate} />);
		expect(screen.getByText('GEMINI_API_KEY가 설정되지 않았습니다.')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
		expect(onRegenerate).toHaveBeenCalled();
	});
});
