// validateComment 유닛 테스트 — 통과 케이스와 규칙별 위반 메시지
import { EXAMPLE_COMMENTS } from './examples.js';
import { countChars, validateComment } from './comment-rules.js';

const rules = { minChars: 40, maxChars: 120, brand: '운명원' };

describe('countChars', () => {
	it('공백·줄바꿈을 빼고 센다', () => {
		expect(countChars('가 나\n다 ')).toBe(3);
	});
});

describe('few-shot 예시', () => {
	it('모든 예시가 규칙을 통과한다', () => {
		for (const e of EXAMPLE_COMMENTS) expect(validateComment(e.comment, rules)).toEqual([]);
	});
});

describe('validateComment', () => {
	it('규칙을 모두 지키면 빈 배열', () => {
		const ok = '연락 텀 길어질 때 혼자 밤새 핸드폰 보는 장면 너무 공감돼요. 운명원 연애사주가 잘 본다던데 저도 궁금하네요';
		expect(validateComment(ok, rules)).toEqual([]);
	});

	it('짧으면 길이 위반', () => {
		expect(validateComment('운명원 짧은 댓글', rules)).toEqual(['공백 제외 40자 이상이어야 합니다 (현재 7자)']);
	});

	it('길면 길이 위반', () => {
		const long = '운명원 '.repeat(41); // 공백 제외 123자
		expect(validateComment(long, rules)[0]).toMatch(/공백 제외 120자 이하/);
	});

	it('링크·해시태그·브랜드 누락·후기 말투를 각각 잡는다', () => {
		const bad = '이 영상 보고 https://example.com 가봤는데 #연애 진짜 공감됐어요. 사주 써봤더니 잘 맞더라고요 추천합니다';
		const v = validateComment(bad, rules);
		expect(v).toContain('링크를 넣을 수 없습니다');
		expect(v).toContain('해시태그를 넣을 수 없습니다');
		expect(v).toContain("'운명원' 언급이 없습니다");
		expect(v.some((m) => m.startsWith('직접 써본 후기처럼'))).toBe(true);
	});
});
