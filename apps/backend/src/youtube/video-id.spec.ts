// extractVideoId 유닛 테스트 — 지원하는 링크 형태와 거부 케이스
import { extractVideoId } from './video-id.js';

describe('extractVideoId', () => {
	const id = 'dQw4w9WgXcQ';

	it.each([
		[`https://www.youtube.com/watch?v=${id}`],
		[`https://youtube.com/watch?v=${id}&t=30s`],
		[`https://m.youtube.com/watch?feature=share&v=${id}`],
		[`https://youtu.be/${id}`],
		[`https://youtu.be/${id}?si=abc`],
		[`https://www.youtube.com/shorts/${id}`],
		[`https://www.youtube.com/live/${id}`],
		[`https://www.youtube.com/embed/${id}`],
		[`youtube.com/watch?v=${id}`],
		[`  ${id}  `],
	])('%s → videoId', (input) => {
		expect(extractVideoId(input)).toBe(id);
	});

	it.each([[''], ['https://www.youtube.com/'], ['https://www.youtube.com/watch'], ['https://vimeo.com/123456'], ['https://www.youtube.com/watch?v=short'], ['not a url']])(
		'%s → null',
		(input) => {
			expect(extractVideoId(input)).toBeNull();
		}
	);
});
