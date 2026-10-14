import { authFetch } from '../utils/authFetch';
import { OutlookMessage } from './outlookService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const BASE = `${API_BASE_URL}/app/outlook`;

export interface MailPerson {
    name: string;
    email: string;
}

export interface MailFolder {
    id: string;
    name: string;
    unread: number;
    total: number;
    system: boolean;
}

export interface MailListItem extends OutlookMessage {
    to: MailPerson[];
    flagged: boolean;
    is_draft: boolean;
}

export interface MailAttachment {
    id: string;
    name: string;
    size: number;
    content_type: string;
}

export interface MailDetail extends MailListItem {
    cc: MailPerson[];
    bcc: MailPerson[];
    sent_at: string | null;
    body_html: string;
    attachments: MailAttachment[];
}

export type ComposeMode = 'new' | 'reply' | 'reply_all' | 'forward';

export interface ComposePayload {
    mode: ComposeMode;
    message_id?: string;
    to: string;
    cc: string;
    bcc: string;
    subject: string;
    body_html: string;
    attachments: File[];
}

/** Thrown for every failed call. `reason` is set for "not connected" and "cannot send yet". */
export class OutlookError extends Error {
    reason?: string;
    status: number;
    constructor(message: string, status: number, reason?: string) {
        super(message);
        this.status = status;
        this.reason = reason;
    }
}

export const isNotConnected = (error: unknown) => error instanceof OutlookError && error.status === 409;

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const res = await authFetch(`${BASE}${path}`, init);
    if (res.status === 204) return undefined as T;
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new OutlookError(body.detail || 'Outlook request failed.', res.status, body.reason);
    return body as T;
};

const json = (method: string, data: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const fetchFolders = () => request<{ folders: MailFolder[] }>('/folders/').then((data) => data.folders);

interface ListQuery {
    folder: string;
    search?: string;
    unread?: boolean;
    /** Opaque link to another page, as returned by a previous call */
    cursor?: string | null;
}

/** One page of messages. Search, the unread filter and paging are all applied by the server. */
export const fetchMessages = ({ folder, search, unread, cursor }: ListQuery) => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    else {
        params.set('folder', folder);
        params.set('top', '25');
        if (search) params.set('search', search);
        if (unread) params.set('unread', '1');
    }
    return request<{ messages: MailListItem[]; next_cursor: string | null }>(`/messages/?${params.toString()}`);
};

export const fetchMessage = (id: string) => request<MailDetail>(`/messages/${encodeURIComponent(id)}/`);

export const updateMessage = (id: string, changes: { is_read?: boolean; flagged?: boolean; move_to?: string }) => request<{ id: string }>(`/messages/${encodeURIComponent(id)}/`, json('PATCH', changes));

export const deleteMessage = (id: string, permanent = false) => request<void>(`/messages/${encodeURIComponent(id)}/${permanent ? '?permanent=1' : ''}`, { method: 'DELETE' });

export const sendMail = (payload: ComposePayload) => {
    const form = new FormData();
    form.append('mode', payload.mode);
    if (payload.message_id) form.append('message_id', payload.message_id);
    form.append('to', payload.to);
    form.append('cc', payload.cc);
    form.append('bcc', payload.bcc);
    form.append('subject', payload.subject);
    form.append('body_html', payload.body_html);
    payload.attachments.forEach((file) => form.append('attachments', file));
    return request<{ sent: boolean }>('/send/', { method: 'POST', body: form });
};

export const downloadAttachment = async (messageId: string, attachment: MailAttachment) => {
    const res = await authFetch(`${BASE}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachment.id)}/`);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new OutlookError(body.detail || 'Could not download the attachment.', res.status);
    }
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

/** In-app mailbox route for the signed-in role. */
export const outlookPath = () => (localStorage.getItem('user_role') === 'admin' ? '/admin/outlook' : '/employee/outlook');

export const formatBytes = (bytes: number) => (bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

/** Address suggestions for the compose window, searched on the server. */
export const suggestRecipients = (query: string, signal?: AbortSignal) =>
    request<{ results: MailPerson[] }>(`/recipients/?q=${encodeURIComponent(query)}`, { signal }).then((data) => data.results);
