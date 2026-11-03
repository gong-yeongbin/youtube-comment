// 하단 기록 테이블 — data/log.json을 최신순으로 표시 (영상·프로필·댓글·결과·시각)
import { useQuery } from '@tanstack/react-query';
import { fetchLog } from '@/shared/api';

export const LOG_QUERY_KEY = ['log'];

export function LogTable() {
	const { data, error, isPending } = useQuery({ queryKey: LOG_QUERY_KEY, queryFn: fetchLog });

	return (
		<section className="panel log-panel">
			<h2>기록</h2>
			{isPending && <p className="hint">불러오는 중…</p>}
			{error && <p className="error">{error.message}</p>}
			{data && data.length === 0 && <p className="hint">아직 게시 기록이 없습니다.</p>}
			{data && data.length > 0 && (
				<table className="log-table">
					<thead>
						<tr>
							<th>시각</th>
							<th>영상</th>
							<th>프로필</th>
							<th>댓글</th>
							<th>결과</th>
						</tr>
					</thead>
					<tbody>
						{[...data].reverse().map((e) => (
							<tr key={e.id} className={e.status}>
								<td>{new Date(e.at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}</td>
								<td>
									<a href={`https://www.youtube.com/watch?v=${e.videoId}`} target="_blank" rel="noreferrer">
										{e.videoTitle || e.videoId}
									</a>
								</td>
								<td>{e.profile}</td>
								<td className="comment-cell">{e.comment}</td>
								<td>
									{e.status === 'success' ? (
										'성공'
									) : (
										<>
											실패 ({e.reason}){e.screenshot && <a href={e.screenshot} target="_blank" rel="noreferrer"> 캡처</a>}
										</>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</section>
	);
}
