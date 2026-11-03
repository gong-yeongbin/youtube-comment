// 대시보드 루트 — 상단(제목·오늘 게시 배지) + 진행 띠 + 세 칸 + 기록. 영상을 고르면 초안을 바로 생성한다
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FetchPanel } from '@/features/fetch/fetch-panel';
import { LogTable } from '@/features/log/log-table';
import { PostPanel } from '@/features/post/post-panel';
import { SelectPanel } from '@/features/select/select-panel';
import { createDraft, fetchToday, type Draft, type Video } from '@/shared/api';

export const TODAY_QUERY_KEY = ['today'];

function TodayBadge() {
	const { data } = useQuery({ queryKey: TODAY_QUERY_KEY, queryFn: fetchToday });
	if (!data) return null;
	return (
		<p className={data.count >= data.max ? 'today full' : 'today'}>
			오늘 게시 <strong>{data.count}</strong> / {data.max}
		</p>
	);
}

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

	const step = !selected ? 1 : !draft ? 2 : 3;
	const flowClass = (n: number) => (n === step ? 'active' : n < step ? 'done' : '');

	return (
		<main>
			<header className="top">
				<div>
					<h1>
						<em>운명원</em> 댓글 에이전트
					</h1>
					<p className="tagline">연애 고민 영상을 고르면, 그 영상을 본 사람의 말로 댓글을 쓰고 크롬에서 직접 올립니다.</p>
				</div>
				<TodayBadge />
			</header>

			<ol className="flow">
				<li className={flowClass(1)}>
					<span className="num">1</span>영상 불러오기
				</li>
				<li className={flowClass(2)}>
					<span className="num">2</span>영상 선택 · 초안
				</li>
				<li className={flowClass(3)}>
					<span className="num">3</span>댓글 달기
				</li>
			</ol>

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
