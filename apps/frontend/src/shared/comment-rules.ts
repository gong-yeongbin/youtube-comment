// 댓글 검증 규칙 (백엔드 draft/comment-rules.ts와 동일) — 초안을 수정할 때 즉시 표시용
export interface CommentRules {
	minChars: number;
	maxChars: number;
	brand: string;
}

const LINK = /https?:\/\/|www\.|\.com|\.kr|\.net/i;
const REVIEW_PATTERNS = ['써봤', '써 봤', '봤더니', '받아봤', '받아 봤', '보고 왔', '보고왔', '해봤', '해 봤', '이용해', '결제'];

export function validateComment(comment: string, rules: CommentRules): string[] {
	const text = comment.trim();
	const violations: string[] = [];
	if (text.length < rules.minChars) violations.push(`${rules.minChars}자 이상이어야 합니다 (현재 ${text.length}자)`);
	if (text.length > rules.maxChars) violations.push(`${rules.maxChars}자 이하여야 합니다 (현재 ${text.length}자)`);
	if (LINK.test(text)) violations.push('링크를 넣을 수 없습니다');
	if (text.includes('#')) violations.push('해시태그를 넣을 수 없습니다');
	if (!text.includes(rules.brand)) violations.push(`'${rules.brand}' 언급이 없습니다`);
	const review = REVIEW_PATTERNS.find((p) => text.includes(p));
	if (review) violations.push(`직접 써본 후기처럼 들립니다 ('${review}')`);
	return violations;
}
