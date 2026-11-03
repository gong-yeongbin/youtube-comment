// ② 영상 선택 패널 — 선택한 영상의 고민 한 줄과 수정 가능한 댓글 초안, 검증 결과 표시
import { useMutation } from '@tanstack/react-query';
import { createDraft, type Draft, type Video } from '@/shared/api';
import { validateComment } from '@/shared/comment-rules';

interface Props {
	selected: Video | null;
	draft: Draft | null;
	comment: string;
	onDraft: (draft: Draft) => void;
	onCommentChange: (comment: string) => void;
}

export function SelectPanel({ selected, draft, comment, onDraft, onCommentChange }: Props) {
	const generate = useMutation({ mutationFn: createDraft, onSuccess: onDraft });
	const violations = draft ? validateComment(comment, draft.rules) : [];

	if (!selected) {
		return (
			<section className="panel">
				<h2>② 영상 선택</h2>
				<p className="hint">왼쪽 목록에서 영상을 고르세요.</p>
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
			<button type="button" onClick={() => generate.mutate(selected.videoId)} disabled={generate.isPending}>
				{generate.isPending ? '초안 생성 중…' : draft ? '초안 다시 생성' : '댓글 초안 생성'}
			</button>
			{generate.error && <p className="error">{generate.error.message}</p>}
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
						{comment.trim().length}자 / {draft.rules.minChars}~{draft.rules.maxChars}자
						{violations.length > 0 && ` · ${violations.join(' · ')}`}
					</p>
				</>
			)}
		</section>
	);
}
