// ② 영상 선택 패널 — 고민 한 줄, 근거 장면, 수정 가능한 댓글 초안, 검증 결과 (초안 생성은 App이 선택 즉시 호출)
import { type Draft, type Video } from '@/shared/api';
import { countChars, validateComment } from '@/shared/comment-rules';

interface Props {
	selected: Video | null;
	draft: Draft | null;
	comment: string;
	generating: boolean;
	error: Error | null;
	onRegenerate: () => void;
	onCommentChange: (comment: string) => void;
}

export function SelectPanel({ selected, draft, comment, generating, error, onRegenerate, onCommentChange }: Props) {
	const violations = draft ? validateComment(comment, draft.rules) : [];

	return (
		<section className="panel">
			<div className="panel-head">
				<span className="num">②</span>
				<h2>영상 선택</h2>
				<p className="lead">고르면 AI가 초안을 씁니다</p>
			</div>
			{!selected && <p className="hint">왼쪽에서 영상을 고르면 영상 속 고민 한 줄과 댓글 초안이 자동으로 만들어집니다.</p>}
			{selected && (
				<>
					<p className="selected-title">
						<strong>{selected.title}</strong>
						<small>{selected.channelTitle}</small>
					</p>
					{generating && <p className="hint">AI가 자막과 댓글을 읽고 초안을 쓰는 중…</p>}
					{error && <p className="error">{error.message}</p>}
					{draft && draft.videoId === selected.videoId && (
						<>
							<p className="badge">{draft.hasTranscript ? `자막 사용 (${draft.transcriptLang})` : '자막 없음 · 제목·설명·댓글로 생성'}</p>
							<p className="concern">
								<span className="label">영상 속 고민</span>
								{draft.concern}
							</p>
							{draft.evidence && (
								<p className="evidence">
									<span className="label">근거 장면</span>
									{draft.evidence}
								</p>
							)}
							<label className="draft-label">
								댓글 초안 (수정 가능)
								<textarea value={comment} onChange={(e) => onCommentChange(e.target.value)} rows={5} />
							</label>
							<p className={violations.length ? 'count bad' : 'count'}>
								공백 제외 {countChars(comment)}자 / {draft.rules.minChars}~{draft.rules.maxChars}자
								{violations.length > 0 && ` · ${violations.join(' · ')}`}
							</p>
						</>
					)}
					{!generating && (
						<button type="button" onClick={onRegenerate}>
							{draft ? '초안 다시 생성' : '다시 시도'}
						</button>
					)}
				</>
			)}
		</section>
	);
}
