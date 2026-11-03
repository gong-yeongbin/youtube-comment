// 백엔드 /api 호출 함수와 응답 타입 — NestJS 오류 본문의 message를 Error로 던진다
export interface Video {
	videoId: string;
	url: string;
	title: string;
	channelTitle: string;
	publishedAt: string;
	thumbnail: string;
	viewCount: number;
	description: string;
	alreadyCommented: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...init });
	const body: unknown = await res.json().catch(() => null);
	if (!res.ok) {
		const message = body && typeof body === 'object' && 'message' in body ? String((body as { message: unknown }).message) : `요청 실패 (${res.status})`;
		throw new Error(message);
	}
	return body as T;
}

export function fetchVideos(q?: string): Promise<Video[]> {
	return request<Video[]>(q ? `/videos?q=${encodeURIComponent(q)}` : '/videos');
}

export function resolveVideo(url: string): Promise<Video> {
	return request<Video>('/videos/resolve', { method: 'POST', body: JSON.stringify({ url }) });
}

export interface Draft {
	videoId: string;
	concern: string;
	comment: string;
	violations: string[];
	hasTranscript: boolean;
	transcriptLang: string | null;
	rules: { minChars: number; maxChars: number; brand: string };
}

export function createDraft(videoId: string): Promise<Draft> {
	return request<Draft>('/draft', { method: 'POST', body: JSON.stringify({ videoId }) });
}

export interface LogEntry {
	id: string;
	at: string;
	videoId: string;
	videoTitle: string;
	profile: string;
	comment: string;
	status: 'success' | 'failed';
	reason?: string;
	screenshot?: string;
}

export function fetchLog(): Promise<LogEntry[]> {
	return request<LogEntry[]>('/log');
}
