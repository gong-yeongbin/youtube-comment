// ② 영상 선택 패널 — 선택한 영상의 고민 한 줄과 수정 가능한 댓글 초안, 검증 결과 표시 (초안 생성은 App이 선택 즉시 호출)
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

	if (!selected) {
		return (
			<section className="panel">
				<h2>② 영상 선택</h2>
				<p className="hint">왼쪽 목록에서 영상을 고르면 고민 한 줄과 댓글 초안이 자동으로 만들어집니다.</p>
			</section>
		);
	}

	return (
		<section className="panel">
			<h2>② 영상 선택</h2>
			<p className="selected-title">
				<strong>{selected.title}</strong>
				<small>{selected.channelTitle}</small>
			</p>
			{generating && <p className="hint">AI가 자막과 댓글을 읽고 초안을 쓰는 중…</p>}
			{error && <p className="error">{error.message}</p>}
			{!generating && (
				<button type="button" onClick={onRegenerate}>
					{draft ? '초안 다시 생성' : '다시 시도'}
				</button>
			)}
			{draft && draft.videoId === selected.videoId && (
				<>
					<p className="badge">{draft.hasTranscript ? `자막 사용 (${draft.transcriptLang})` : '자막 없음 · 제목·설명·댓글로 생성'}</p>
					<p className="concern">
						<span>고민</span> {draft.concern}
					</p>
					<label className="draft-label">
						댓글 초안 (수정 가능)
						<textarea value={comment} onChange={(e) => onCommentChange(e.target.value)} rows={5} />
					</label>
					<p className={violations.length ? 'error' : 'hint'}>
						공백 제외 {countChars(comment)}자 / {draft.rules.minChars}~{draft.rules.maxChars}자
						{violations.length > 0 && ` · ${violations.join(' · ')}`}
					</p>
				</>
			)}
		</section>
	);
}
