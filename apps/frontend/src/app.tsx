// 대시보드 루트 — 세 칸(영상 불러오기 → 영상 선택 → 댓글 달기) 레이아웃 + 하단 기록 테이블
import { useState } from 'react';
import { FetchPanel } from '@/features/fetch/fetch-panel';
import { LogTable } from '@/features/log/log-table';
import { SelectPanel } from '@/features/select/select-panel';
import type { Draft, Video } from '@/shared/api';

export function App() {
	const [selected, setSelected] = useState<Video | null>(null);
	const [draft, setDraft] = useState<Draft | null>(null);
	const [comment, setComment] = useState('');

	const select = (video: Video) => {
		setSelected(video);
		if (video.videoId !== draft?.videoId) {
			setDraft(null);
			setComment('');
		}
	};

	return (
		<main>
			<h1>유튜브 댓글 에이전트</h1>
			<div className="panels">
				<FetchPanel selected={selected} onSelect={select} />
				<SelectPanel
					selected={selected}
					draft={draft}
					comment={comment}
					onDraft={(next) => {
						setDraft(next);
						setComment(next.comment);
					}}
					onCommentChange={setComment}
				/>
				<section className="panel">
					<h2>③ 댓글 달기</h2>
					{comment ? <p className="hint">게시 기능은 5단계에서 추가됩니다.</p> : <p className="hint">②에서 초안을 만들면 여기서 게시합니다.</p>}
				</section>
			</div>
			<LogTable />
		</main>
	);
}
