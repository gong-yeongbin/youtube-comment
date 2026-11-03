// ① 영상 불러오기 패널 — 검색 버튼, 링크 직접 입력, 썸네일 2열 그리드(선택 가능)
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchVideos, resolveVideo, type Video } from '@/shared/api';

interface Props {
	selected: Video | null;
	onSelect: (video: Video) => void;
}

export function FetchPanel({ selected, onSelect }: Props) {
	const [videos, setVideos] = useState<Video[]>([]);
	const [url, setUrl] = useState('');

	const search = useMutation({ mutationFn: () => fetchVideos(), onSuccess: setVideos });
	const resolve = useMutation({
		mutationFn: resolveVideo,
		onSuccess: (video) => {
			setVideos((prev) => [video, ...prev.filter((v) => v.videoId !== video.videoId)]);
			onSelect(video);
			setUrl('');
		},
	});

	const error = search.error ?? resolve.error;

	return (
		<section className="panel">
			<div className="panel-head">
				<span className="num">①</span>
				<h2>영상 불러오기</h2>
				<p className="lead">버튼 한 번에 최신 영상</p>
			</div>
			<button type="button" className="primary" onClick={() => search.mutate()} disabled={search.isPending}>
				{search.isPending ? '불러오는 중…' : '연애 고민 영상 불러오기'}
			</button>
			<form
				className="url-form"
				onSubmit={(e) => {
					e.preventDefault();
					if (url.trim()) resolve.mutate(url.trim());
				}}
			>
				<input type="text" placeholder="또는 유튜브 링크 붙여넣기" value={url} onChange={(e) => setUrl(e.target.value)} disabled={resolve.isPending} />
				<button type="submit" disabled={resolve.isPending || !url.trim()}>
					추가
				</button>
			</form>
			{error && <p className="error">{error.message}</p>}
			{videos.length > 0 && <p className="hint">{videos.length}개 · 고르면 ②에서 초안이 바로 만들어집니다</p>}
			<ul className="video-grid">
				{videos.map((video) => (
					<li key={video.videoId}>
						<button type="button" className={video.videoId === selected?.videoId ? 'video-card selected' : 'video-card'} onClick={() => onSelect(video)}>
							<span className="thumb">
								<img src={video.thumbnail} alt="" />
								{video.alreadyCommented && <span className="tag">댓글 완료</span>}
							</span>
							<span className="meta">
								<strong>{video.title}</strong>
								<small>
									{video.channelTitle} · {new Date(video.publishedAt).toLocaleDateString('ko-KR')} · 조회 {video.viewCount.toLocaleString('ko-KR')}
								</small>
							</span>
						</button>
					</li>
				))}
			</ul>
		</section>
	);
}
