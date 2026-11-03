// 유튜브 링크 또는 11자리 ID 문자열에서 videoId를 추출하는 순수 함수
const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function extractVideoId(input: string): string | null {
	const text = input.trim();
	if (ID_PATTERN.test(text)) return text;

	let url: URL;
	try {
		url = new URL(text.includes('://') ? text : `https://${text}`);
	} catch {
		return null;
	}

	const host = url.hostname.replace(/^(www|m)\./, '');
	let candidate: string | undefined;

	if (host === 'youtu.be') {
		candidate = url.pathname.split('/')[1];
	} else if (host === 'youtube.com') {
		const [, first, second] = url.pathname.split('/');
		if (first === 'watch') candidate = url.searchParams.get('v') ?? undefined;
		else if (first === 'shorts' || first === 'live' || first === 'embed' || first === 'v') candidate = second;
	}

	return candidate && ID_PATTERN.test(candidate) ? candidate : null;
}
