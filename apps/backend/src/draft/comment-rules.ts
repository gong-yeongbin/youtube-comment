// 댓글 초안 검증 규칙 — 길이, 링크·해시태그 금지, 브랜드 언급, 후기 말투 금지 (프론트 shared/comment-rules.ts와 동일 규칙)
export interface CommentRules {
	minChars: number;
	maxChars: number;
	brand: string;
}

const LINK = /https?:\/\/|www\.|\.com|\.kr|\.net/i;
const REVIEW_PATTERNS = ['써봤', '써 봤', '봤더니', '받아봤', '받아 봤', '보고 왔', '보고왔', '해봤', '해 봤', '이용해', '결제'];

/** 글자 수는 공백을 제외하고 센다 (과제 예시 댓글이 공백 포함 139자, 제외 104자) */
export function countChars(text: string): number {
	return text.replace(/\s/g, '').length;
}

export function validateComment(comment: string, rules: CommentRules): string[] {
	const text = comment.trim();
	const length = countChars(text);
	const violations: string[] = [];
	if (length < rules.minChars) violations.push(`공백 제외 ${rules.minChars}자 이상이어야 합니다 (현재 ${length}자)`);
	if (length > rules.maxChars) violations.push(`공백 제외 ${rules.maxChars}자 이하여야 합니다 (현재 ${length}자)`);
	if (LINK.test(text)) violations.push('링크를 넣을 수 없습니다');
	if (text.includes('#')) violations.push('해시태그를 넣을 수 없습니다');
	if (!text.includes(rules.brand)) violations.push(`'${rules.brand}' 언급이 없습니다`);
	const review = REVIEW_PATTERNS.find((p) => text.includes(p));
	if (review) violations.push(`직접 써본 후기처럼 들립니다 ('${review}')`);
	return violations;
}
