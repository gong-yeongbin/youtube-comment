// 대시보드 루트 — 세 칸(영상 불러오기 → 영상 선택 → 댓글 달기) 레이아웃 + 하단 기록 테이블. 영상을 고르면 초안을 바로 생성한다
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { FetchPanel } from '@/features/fetch/fetch-panel';
import { LogTable } from '@/features/log/log-table';
import { PostPanel } from '@/features/post/post-panel';
import { SelectPanel } from '@/features/select/select-panel';
import { createDraft, type Draft, type Video } from '@/shared/api';

export function App() {
	const [selected, setSelected] = useState<Video | null>(null);
	const [draft, setDraft] = useState<Draft | null>(null);
	const [comment, setComment] = useState('');

	const generate = useMutation({
		mutationFn: createDraft,
		onSuccess: (next) => {
			setDraft(next);
			setComment(next.comment);
		},
	});

	const select = (video: Video) => {
		setSelected(video);
		if (video.videoId === draft?.videoId) return;
		setDraft(null);
		setComment('');
		generate.mutate(video.videoId);
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
					generating={generate.isPending}
					error={generate.error}
					onRegenerate={() => selected && generate.mutate(selected.videoId)}
					onCommentChange={setComment}
				/>
				{/* 영상이 바뀌면 진행 상태를 초기화하도록 key로 다시 마운트한다 */}
				<PostPanel key={selected?.videoId ?? ''} selected={selected} comment={comment} rules={draft?.rules ?? null} />
			</div>
			<LogTable />
		</main>
	);
}
