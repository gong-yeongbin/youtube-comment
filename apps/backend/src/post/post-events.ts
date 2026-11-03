// 게시 작업 진행 이벤트 타입 — SSE로 프론트에 전달된다
export type PostStep = 'opening' | 'typing' | 'posted' | 'verified';
export type FailReason = 'not_logged_in' | 'comment_box_not_found' | 'not_visible' | 'browser_error';

export type PostEvent = { type: PostStep; message?: string } | { type: 'failed'; reason: FailReason; message: string; screenshot?: string };

export const TERMINAL_TYPES = new Set<PostEvent['type']>(['verified', 'failed']);
