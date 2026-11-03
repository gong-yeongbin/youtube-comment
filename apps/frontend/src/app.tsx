// 대시보드 루트 — 세 칸(영상 불러오기 → 영상 선택 → 댓글 달기) 레이아웃 + 하단 기록 테이블
import { useState } from 'react';
import { FetchPanel } from '@/features/fetch/fetch-panel';
import type { Video } from '@/shared/api';

export function App() {
	const [selected, setSelected] = useState<Video | null>(null);

	return (
		<main>
			<h1>유튜브 댓글 에이전트</h1>
			<div className="panels">
				<FetchPanel selected={selected} onSelect={setSelected} />
				<section className="panel">
					<h2>② 영상 선택</h2>
					{selected ? <p>{selected.title}</p> : <p className="hint">왼쪽 목록에서 영상을 고르세요.</p>}
				</section>
				<section className="panel">
					<h2>③ 댓글 달기</h2>
				</section>
			</div>
		</main>
	);
}
