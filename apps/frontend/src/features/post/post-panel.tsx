// ③ 댓글 달기 패널 — 프로필 선택·로그인, 게시 시작, SSE 진행 스텝, 실패 사유와 캡처 표시
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { LOG_QUERY_KEY } from '@/features/log/log-table';
import { fetchProfiles, loginProfile, postEventsUrl, startPost, type PostEvent, type Video } from '@/shared/api';
import { validateComment, type CommentRules } from '@/shared/comment-rules';

interface Props {
	selected: Video | null;
	comment: string;
	rules: CommentRules | null;
}

const STEPS: { type: Exclude<PostEvent['type'], 'failed'>; label: string }[] = [
	{ type: 'opening', label: '크롬 프로필 열기' },
	{ type: 'typing', label: '한 글자씩 입력' },
	{ type: 'posted', label: '댓글 게시' },
	{ type: 'verified', label: '목록에서 확인' },
];

export function PostPanel({ selected, comment, rules }: Props) {
	const queryClient = useQueryClient();
	const [profile, setProfile] = useState('');
	const [events, setEvents] = useState<PostEvent[]>([]);
	const [assigned, setAssigned] = useState<string | null>(null);
	const source = useRef<EventSource | null>(null);

	const profiles = useQuery({ queryKey: ['profiles'], queryFn: fetchProfiles });
	const login = useMutation({ mutationFn: loginProfile });
	const post = useMutation({
		mutationFn: startPost,
		onSuccess: ({ jobId, profile: picked }) => {
			setAssigned(picked);
			setEvents([]);
			source.current?.close();
			const es = new EventSource(postEventsUrl(jobId));
			source.current = es;
			es.onmessage = (e: MessageEvent<string>) => {
				const event = JSON.parse(e.data) as PostEvent;
				setEvents((prev) => [...prev, event]);
				if (event.type === 'verified' || event.type === 'failed') {
					es.close();
					void queryClient.invalidateQueries({ queryKey: LOG_QUERY_KEY });
					void queryClient.invalidateQueries({ queryKey: ['profiles'] });
				}
			};
			es.onerror = () => {
				es.close();
				setEvents((prev) => (prev.some((ev) => ev.type === 'verified' || ev.type === 'failed') ? prev : [...prev, { type: 'failed', reason: 'connection_lost', message: '서버와 연결이 끊겼습니다.' }]));
			};
		},
	});

	useEffect(() => () => source.current?.close(), []);

	const violations = rules ? validateComment(comment, rules) : [];
	const running = events.length > 0 && !events.some((e) => e.type === 'verified' || e.type === 'failed');
	const canPost = !!selected && !!comment.trim() && !!rules && violations.length === 0 && !post.isPending && !running;
	const failed = events.find((e) => e.type === 'failed');
	const doneIndex = STEPS.findLastIndex((s) => events.some((e) => e.type === s.type));

	return (
		<section className="panel">
			<h2>③ 댓글 달기</h2>
			{!selected || !rules ? (
				<p className="hint">②에서 초안을 만들면 여기서 게시합니다.</p>
			) : (
				<>
					<label className="draft-label">
						프로필
						<div className="profile-row">
							<select value={profile} onChange={(e) => setProfile(e.target.value)} disabled={running}>
								<option value="">자동 배정 (성공 기록이 가장 적은 프로필)</option>
								{profiles.data?.map((p) => (
									<option key={p.name} value={p.name}>
										{p.name} · 오늘 {p.todayCount}개{p.hasProfileDir ? '' : ' · 로그인 필요'}
									</option>
								))}
							</select>
							<button type="button" onClick={() => login.mutate(profile || profiles.data?.[0]?.name || '')} disabled={login.isPending || !profiles.data?.length}>
								프로필 로그인
							</button>
						</div>
					</label>
					{login.data && <p className="hint">{login.data.message}</p>}
					{login.error && <p className="error">{login.error.message}</p>}
					<p className="preview">{comment}</p>
					{violations.length > 0 && <p className="error">규칙 위반: {violations.join(' · ')}</p>}
					<button type="button" className="primary" onClick={() => post.mutate({ videoId: selected.videoId, videoTitle: selected.title, comment: comment.trim(), profile: profile || undefined })} disabled={!canPost}>
						{running ? '게시 중…' : '댓글 게시'}
					</button>
					{post.error && <p className="error">{post.error.message}</p>}
					{events.length > 0 && (
						<ol className="steps">
							{STEPS.map((step, i) => {
								const state = failed && i === doneIndex + 1 ? 'failed' : i <= doneIndex ? 'done' : running && i === doneIndex + 1 ? 'active' : 'pending';
								const message = events.find((e) => e.type === step.type)?.message;
								return (
									<li key={step.type} className={state}>
										<span>{step.label}</span>
										{message && <small>{message}</small>}
									</li>
								);
							})}
						</ol>
					)}
					{assigned && events.length > 0 && <p className="hint">사용 프로필: {assigned}</p>}
					{failed && failed.type === 'failed' && (
						<div className="failure">
							<p className="error">
								실패 ({failed.reason}): {failed.message}
							</p>
							{failed.screenshot && (
								<a href={failed.screenshot} target="_blank" rel="noreferrer">
									<img src={failed.screenshot} alt="실패 시점 캡처" />
								</a>
							)}
						</div>
					)}
				</>
			)}
		</section>
	);
}
