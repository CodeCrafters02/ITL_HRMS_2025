import PerfectScrollbar from 'react-perfect-scrollbar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconSearch from '../../components/Icon/IconSearch';
import IconSend from '../../components/Icon/IconSend';
import IconPlus from '../../components/Icon/IconPlus';
import IconUserPlus from '../../components/Icon/IconUserPlus';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type ChatUser = { id: number; username: string; email: string; first_name?: string; last_name?: string };
type ChatMember = {
    id: number;
    user: ChatUser;
    role: 'owner' | 'admin' | 'member';
    can_add_members: boolean;
    can_remove_members: boolean;
    can_revoke_roles: boolean;
};
type Conversation = {
    id: number;
    type: 'dm' | 'group';
    name?: string | null;
    members: ChatMember[];
    last_message?: { id: number; content: string; created_at: string } | null;
    unread_count?: number;
};
type Message = {
    id: number;
    conversation_id?: number;
    conversation?: number;
    sender: ChatUser;
    content: string;
    attachment_url?: string | null;
    attachment_name?: string | null;
    attachment_mime?: string | null;
    created_at: string;
};

const AdminChat = () => {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageText, setMessageText] = useState('');
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
    const [people, setPeople] = useState<ChatUser[]>([]);
    const [unreadByConv, setUnreadByConv] = useState<Record<number, number>>({});

    const wsRef = useRef<WebSocket | null>(null);
    const activeIdRef = useRef<number | null>(null);
    const pendingJoinRef = useRef<number | null>(null);
    const reconnectTimerRef = useRef<any>(null);
    const reconnectAttemptRef = useRef(0);
    const syncTimerRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const messagesScrollElRef = useRef<HTMLElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const wsDisabledRef = useRef(false);
    const wsManualCloseRef = useRef(false);
    const isMountedRef = useRef(false);
    const wsEverOpenedRef = useRef(false);
    const wsFailedEstablishRef = useRef(0);

    useEffect(() => {
        dispatch(setPageTitle('Chat'));
    }, [dispatch]);

    const myUserId = Number(localStorage.getItem('user_id') || 0);
    const myUsername = localStorage.getItem('username') || '';
    const isMine = (m: Message) => {
        const sid = Number((m.sender as any)?.id || 0);
        const sun = (m.sender as any)?.username || '';
        if (myUserId && sid) return sid === myUserId;
        if (myUsername && sun) return sun === myUsername;
        return false;
    };

    const lastSeenKey = (conversationId: number) => `chat_last_seen_${myUserId || myUsername || 'anon'}_${conversationId}`;
    const getLastSeen = (conversationId: number): number => {
        const raw = localStorage.getItem(lastSeenKey(conversationId));
        const n = raw ? Number(raw) : 0;
        return Number.isFinite(n) ? n : 0;
    };
    const setLastSeen = (conversationId: number, tsMs: number) => {
        try {
            localStorage.setItem(lastSeenKey(conversationId), String(tsMs));
        } catch {
            // ignore storage issues
        }
    };

    const headers = (): Record<string, string> => {
        const token = localStorage.getItem('access_token');
        const h: Record<string, string> = {};
        if (token) h.Authorization = `Bearer ${token}`;
        return h;
    };

    const resolveFileUrl = (u?: string | null) => {
        if (!u) return null;
        if (String(u).startsWith('http')) return u;
        return `${API_BASE_URL}${u}`;
    };

    const setPending = (file: File | null) => {
        setPendingFile(file);
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        if (file && file.type?.startsWith('image/')) {
            setPendingPreviewUrl(URL.createObjectURL(file));
        } else {
            setPendingPreviewUrl(null);
        }
    };

    useEffect(() => {
        return () => {
            if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchConversations = async () => {
        setLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/app/chat-conversations/`);
            if (search.trim()) url.searchParams.set('search', search.trim());
            const resp = await fetch(url.toString(), { headers: headers() });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to load conversations');
            const list = data.results || data;
            const arr = Array.isArray(list) ? (list as Conversation[]) : [];
            setConversations(arr);

            // Prefer backend-provided unread_count (accurate for multiple messages)
            setUnreadByConv(() => {
                const next: Record<number, number> = {};
                for (const c of arr) {
                    if (!c?.id) continue;
                    if (activeIdRef.current && c.id === activeIdRef.current) continue;
                    const n = Number((c as any).unread_count || 0);
                    if (n > 0) next[c.id] = n;
                }
                return next;
            });
            if (!activeId && Array.isArray(list) && list.length) setActiveId(list[0].id);
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to load conversations', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchPeople = async (q: string): Promise<ChatUser[]> => {
        try {
            const url = new URL(`${API_BASE_URL}/app/chat/users/`);
            if (q.trim()) url.searchParams.set('q', q.trim());
            const resp = await fetch(url.toString(), { headers: headers() });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to load users');
            const next = Array.isArray(data.results) ? data.results : [];
            setPeople(next);
            return next;
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to load users', 'error');
            return [];
        }
    };

    const startDm = async (userId: number) => {
        try {
            const resp = await fetch(`${API_BASE_URL}/app/chat-conversations/dm/`, {
                method: 'POST',
                headers: { ...headers(), 'Content-Type': 'application/json' } as any,
                body: JSON.stringify({ user_id: userId }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to start chat');
            await fetchConversations();
            setActiveId(data.id);
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to start chat', 'error');
        }
    };

    const openNewChat = async () => {
        const initial = await fetchPeople('');
        const inputId = 'chat_user_search_input';
        const listId = 'chat_user_list';

        const renderList = (items: ChatUser[]) => {
            const el = document.getElementById(listId);
            if (!el) return;
            if (!items.length) {
                el.innerHTML = `<div class="text-sm text-gray-500">No users found.</div>`;
                return;
            }
            el.innerHTML = items
                .map((u) => {
                    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
                    const title = name ? `${name} (${u.username})` : u.username;
                    return `
<button type="button" data-user-id="${u.id}" class="w-full text-left px-3 py-2 rounded-md border border-[#e0e6ed] hover:bg-[#f5f5f5] mb-2">
  <div class="font-semibold">${title}</div>
  <div class="text-xs text-gray-500">${u.email}</div>
</button>`;
                })
                .join('');

            el.querySelectorAll('button[data-user-id]').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const idStr = (btn as any).getAttribute('data-user-id');
                    const id = Number(idStr);
                    if (!id) return;
                    Swal.close();
                    await startDm(id);
                });
            });
        };

        await Swal.fire({
            title: 'New chat',
            html: `
<div class="space-y-3">
  <input id="${inputId}" class="swal2-input" placeholder="Search employees/admins..." />
  <div id="${listId}" style="max-height:320px; overflow:auto;"></div>
</div>`,
            showConfirmButton: false,
            showCancelButton: true,
            didOpen: () => {
                const input = document.getElementById(inputId) as HTMLInputElement | null;
                renderList(initial);
                let t: any;
                input?.addEventListener('input', async () => {
                    clearTimeout(t);
                    t = setTimeout(async () => {
                        const q = input.value || '';
                        const next = await fetchPeople(q);
                        renderList(next);
                    }, 300);
                });
            },
        });
    };

    const fetchMessages = async (conversationId: number) => {
        setLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/app/chat-messages/`);
            url.searchParams.set('conversation', String(conversationId));
            url.searchParams.set('page_size', '100');
            const resp = await fetch(url.toString(), { headers: headers() });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to load messages');
            const list = data.results || data;
            const arr = Array.isArray(list) ? list : [];
            // API returns newest first; reverse for chat display
            setMessages(arr.slice().reverse());
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to load messages', 'error');
        } finally {
            setLoading(false);
        }
    };

    const joinConversation = (conversationId: number) => {
        pendingJoinRef.current = conversationId;
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'join', conversation_id: conversationId }));
        }
    };

    const connectWs = () => {
        if (wsDisabledRef.current) return;

        // Avoid spawning multiple sockets
        const existing = wsRef.current;
        if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
            return;
        }

        const token = localStorage.getItem('access_token') || '';
        const base = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
        // close any previous socket before creating a new one
        try {
            wsManualCloseRef.current = true;
            existing?.close();
        } catch {
            // ignore
        }
        wsManualCloseRef.current = false;

        const ws = new WebSocket(`${base}/ws/chat/?token=${encodeURIComponent(token)}`);
        wsRef.current = ws;

        ws.onopen = () => {
            wsEverOpenedRef.current = true;
            wsFailedEstablishRef.current = 0;
            reconnectAttemptRef.current = 0;
            const convId = pendingJoinRef.current || activeIdRef.current;
            if (convId) ws.send(JSON.stringify({ type: 'join', conversation_id: convId }));
        };

        ws.onerror = () => {
            // Let onclose handle reconnect/backoff
        };

        ws.onmessage = (ev) => {
            try {
                const msg = JSON.parse(ev.data);
                if (msg.type === 'message') {
                    const convId = Number(msg.conversation_id);
                    // Use ref to avoid stale closure; otherwise messages appear only after refresh.
                    if (activeIdRef.current && convId === activeIdRef.current) {
                        setMessages((prev) => prev.concat([msg as any]));
                        // mark as read for active conversation
                        const tsMs = Date.parse(msg.created_at || '') || Date.now();
                        if (convId) setLastSeen(convId, tsMs);
                        setUnreadByConv((prev) => {
                            if (!prev[convId]) return prev;
                            const next = { ...prev };
                            delete next[convId];
                            return next;
                        });
                    } else if (convId) {
                        // increment unread badge for other conversations
                        setUnreadByConv((prev) => ({ ...prev, [convId]: (prev[convId] || 0) + 1 }));
                    }

                    // Update conversation preview immediately.
                    setConversations((prev) => {
                        const idx = prev.findIndex((c) => c.id === convId);
                        if (idx === -1) return prev;
                        const updated = {
                            ...prev[idx],
                            last_message: { id: msg.id, content: msg.content, created_at: msg.created_at },
                        };
                        const next = prev.slice();
                        next.splice(idx, 1);
                        next.unshift(updated);
                        return next;
                    });
                }
            } catch {
                // ignore
            }
        };

        ws.onclose = () => {
            // In React StrictMode (dev), effects mount/unmount twice; cleanup closes the socket.
            // Don't auto-reconnect for intentional/manual closes or when unmounted.
            if (wsManualCloseRef.current || !isMountedRef.current) return;

            // If the socket never successfully opened, disable WS quickly to avoid console spam.
            if (!wsEverOpenedRef.current) {
                wsFailedEstablishRef.current += 1;
                if (wsFailedEstablishRef.current >= 1) {
                    wsDisabledRef.current = true;
                }
                return;
            }

            // Auto-reconnect (only after at least one successful open)
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            const attempt = reconnectAttemptRef.current + 1;
            reconnectAttemptRef.current = attempt;
            // If WS keeps failing to establish, stop and rely on polling (prevents console spam)
            if (attempt >= 6) {
                wsDisabledRef.current = true;
                return;
            }
            const delay = Math.min(10000, 500 * attempt); // 0.5s, 1s, 1.5s... max 10s
            reconnectTimerRef.current = setTimeout(() => {
                connectWs();
            }, delay);
        };
    };

    useEffect(() => {
        isMountedRef.current = true;
        fetchConversations();
        connectWs();
        return () => {
            isMountedRef.current = false;
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (syncTimerRef.current) clearInterval(syncTimerRef.current);
            wsManualCloseRef.current = true;
            wsRef.current?.close();
            wsManualCloseRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!activeId) return;
        activeIdRef.current = activeId;
        fetchMessages(activeId);
        // join on ws (reliable even if socket opens later)
        joinConversation(activeId);
        // opening a conversation clears unread badge
        setLastSeen(activeId, Date.now());
        setUnreadByConv((prev) => {
            if (!prev[activeId]) return prev;
            const next = { ...prev };
            delete next[activeId];
            return next;
        });

        // Fallback auto-sync: some setups drop WS/group messages; polling keeps UI live
        if (syncTimerRef.current) clearInterval(syncTimerRef.current);
        syncTimerRef.current = setInterval(() => {
            const convId = activeIdRef.current;
            if (!convId) return;
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
            fetchMessages(convId);
            fetchConversations();
        }, 4000);

        return () => {
            if (syncTimerRef.current) clearInterval(syncTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeId]);

    useEffect(() => {
        // Auto-scroll to bottom when messages change.
        // With `react-perfect-scrollbar`, scrolling an inner anchor isn't reliable; scroll the container instead.
        const el = messagesScrollElRef.current;
        if (!el) return;
        // Schedule to ensure DOM + PerfectScrollbar layout is applied
        const t = setTimeout(() => {
            try {
                el.scrollTop = el.scrollHeight;
            } catch {
                // ignore
            }
        }, 0);
        return () => clearTimeout(t);
    }, [activeId, messages.length]);

    const activeConversation = useMemo(() => conversations.find((c) => c.id === activeId) || null, [conversations, activeId]);

    const displayName = (c: Conversation) => {
        if (c.type === 'group') return c.name || 'Group';
        // DM: show other member name
        const me = localStorage.getItem('username') || '';
        const other = c.members.map((m) => m.user).find((u) => u.username !== me) || c.members[0]?.user;
        return other ? other.username : 'Direct message';
    };

    const handleSend = async () => {
        if (!activeId) return;
        const text = messageText.trim();
        if (pendingFile && !text) {
            Swal.fire('Text required', 'Please type a message with the attached file/image.', 'warning');
            return;
        }
        if (!text && !pendingFile) return;

        // Optimistic UI append so sending doesn't require refresh even if WS echo fails
        if (text) {
            const optimistic: Message = {
                id: Date.now(),
                conversation_id: activeId,
                sender: {
                    id: Number(localStorage.getItem('user_id') || 0),
                    username: localStorage.getItem('username') || 'me',
                    email: localStorage.getItem('email') || '',
                    first_name: localStorage.getItem('first_name') || undefined,
                    last_name: localStorage.getItem('last_name') || undefined,
                },
                content: text,
                created_at: new Date().toISOString(),
            };
            setMessages((prev) => prev.concat([optimistic]));
        }

        // Attachments must be sent via REST (multipart). For text-only we can use WS.
        if (pendingFile) {
            try {
                const token = localStorage.getItem('access_token') || '';
                const fd = new FormData();
                // Send both keys to match backend expectations across versions
                fd.append('conversation', String(activeId));
                fd.append('conversation_id', String(activeId));
                fd.append('content', text || '');
                fd.append('attachment', pendingFile);
                const resp = await fetch(`${API_BASE_URL}/app/chat-messages/`, {
                    method: 'POST',
                    headers: token ? ({ Authorization: `Bearer ${token}` } as any) : undefined,
                    body: fd,
                });
                const data = await resp.json();
                if (!resp.ok) throw new Error(data?.detail || 'Failed to send attachment');
                setMessageText('');
                setPending(null);
                fetchMessages(activeId);
                fetchConversations();
                return;
            } catch (e: any) {
                Swal.fire('Error', e?.message || 'Failed to send attachment', 'error');
                return;
            }
        }

        // Prefer WS send; fallback to REST
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'message', conversation_id: activeId, content: text }));
            setMessageText('');
            return;
        }

        try {
            const resp = await fetch(`${API_BASE_URL}/app/chat-messages/`, {
                method: 'POST',
                headers: { ...headers(), 'Content-Type': 'application/json' } as any,
                body: JSON.stringify({ conversation: activeId, content: text }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to send');
            setMessageText('');
            fetchMessages(activeId);
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to send', 'error');
        }
    };

    const createGroup = async () => {
        const res = await Swal.fire({
            title: 'Create group',
            input: 'text',
            inputLabel: 'Group name',
            inputPlaceholder: 'e.g. HR Team',
            showCancelButton: true,
        });
        if (!res.isConfirmed) return;
        const name = (res.value || '').trim();
        if (!name) return;
        try {
            const resp = await fetch(`${API_BASE_URL}/app/chat-conversations/`, {
                method: 'POST',
                headers: { ...headers(), 'Content-Type': 'application/json' } as any,
                body: JSON.stringify({ type: 'group', name }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to create group');
            await fetchConversations();
            setActiveId(data.id);
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to create group', 'error');
        }
    };

    return (
        <div className="panel p-0 overflow-hidden border-0">
            <div className="flex h-[calc(100vh-180px)] min-h-[520px]">
                {/* Left: conversation list */}
                <div className="w-full max-w-[320px] border-r border-[#e0e6ed] dark:border-[#1b2e4b] flex flex-col">
                    <div className="p-4 flex items-center gap-2">
                        <div className="relative flex-1">
                            <input className="form-input pl-10" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                                <IconSearch className="w-4 h-4" />
                            </span>
                        </div>
                        <button type="button" className="btn btn-primary px-3" onClick={createGroup} title="Create group">
                            <IconPlus />
                        </button>
                        <button type="button" className="btn btn-outline-primary px-3" onClick={openNewChat} title="New chat">
                            <IconUserPlus />
                        </button>
                    </div>
                    <div className="px-4 pb-3">
                        <button type="button" className="btn btn-outline-primary w-full" onClick={fetchConversations} disabled={loading}>
                            {loading ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>
                    <PerfectScrollbar className="flex-1">
                        <div className="space-y-1 p-2">
                            {conversations.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setActiveId(c.id)}
                                    className={`w-full text-left px-3 py-2 rounded-md hover:bg-white-light/60 dark:hover:bg-[#1b2e4b] ${
                                        activeId === c.id ? 'bg-white-light/60 dark:bg-[#1b2e4b]' : ''
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="font-semibold truncate">{displayName(c)}</div>
                                        {!!unreadByConv[c.id] && (
                                            <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-success text-white text-xs flex items-center justify-center">
                                                {unreadByConv[c.id]}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-white-dark truncate">{c.last_message?.content || 'No messages yet'}</div>
                                </button>
                            ))}
                            {!conversations.length && <div className="p-4 text-sm text-white-dark">No conversations.</div>}
                        </div>
                    </PerfectScrollbar>
                </div>

                {/* Right: messages */}
                <div className="flex-1 flex flex-col">
                    <div className="p-4 border-b border-[#e0e6ed] dark:border-[#1b2e4b]">
                        <div className="font-bold">{activeConversation ? displayName(activeConversation) : 'Chat'}</div>
                        <div className="text-xs text-white-dark">
                            {activeConversation?.type === 'group' ? 'Group chat' : 'Direct message'}
                        </div>
                    </div>
                    <PerfectScrollbar className="flex-1 p-4" containerRef={(ref) => (messagesScrollElRef.current = ref)}>
                        <div className="space-y-4">
                            {messages.map((m) => (
                                <div key={m.id} className={`flex ${isMine(m) ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] ${isMine(m) ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                                        <div className={`text-[11px] ${isMine(m) ? 'text-right' : 'text-left'} text-white-dark`}>
                                            {!isMine(m) ? `${m.sender?.username || 'User'} • ` : ''}
                                            {new Date(m.created_at).toLocaleString()}
                                        </div>
                                        <div
                                            className={`rounded-2xl px-4 py-2 shadow-sm ${
                                                isMine(m)
                                                    ? 'bg-primary text-white rounded-br-md'
                                                    : 'bg-white-light text-dark dark:bg-[#1b2e4b] dark:text-white rounded-bl-md'
                                            }`}
                                        >
                                            <div className="whitespace-pre-wrap break-words">{m.content}</div>
                                            {!!m.attachment_url && (
                                                <div className="mt-2">
                                                    {String(m.attachment_mime || '').startsWith('image/') ? (
                                                        <a href={resolveFileUrl(m.attachment_url) || '#'} target="_blank" rel="noreferrer">
                                                            <img
                                                                src={resolveFileUrl(m.attachment_url) || ''}
                                                                alt={m.attachment_name || 'attachment'}
                                                                className="max-h-[240px] rounded-lg border border-white/10"
                                                            />
                                                        </a>
                                                    ) : (
                                                        <a
                                                            className={`underline ${isMine(m) ? 'text-white' : 'text-primary'}`}
                                                            href={resolveFileUrl(m.attachment_url) || '#'}
                                                            download={m.attachment_name || undefined}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            {m.attachment_name || 'Download file'}
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!messages.length && <div className="text-sm text-white-dark">No messages yet.</div>}
                            <div ref={messagesEndRef} />
                        </div>
                    </PerfectScrollbar>
                    <div className="p-4 border-t border-[#e0e6ed] dark:border-[#1b2e4b] flex items-center gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0] || null;
                                setPending(f);
                            }}
                        />
                        <button
                            type="button"
                            className="btn btn-outline-primary px-3"
                            title="Attach"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!activeId}
                        >
                            +
                        </button>
                        <input
                            className="form-input flex-1"
                            placeholder="Type a message..."
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onPaste={(e) => {
                                const items = e.clipboardData?.items;
                                if (!items) return;
                                for (const it of Array.from(items)) {
                                    if (it.type && it.type.startsWith('image/')) {
                                        const f = it.getAsFile();
                                        if (f) {
                                            e.preventDefault();
                                            setPending(f);
                                        }
                                        break;
                                    }
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSend();
                            }}
                            disabled={!activeId}
                        />
                        <button type="button" className="btn btn-primary px-4" onClick={handleSend} disabled={!activeId}>
                            <IconSend className="w-5 h-5" />
                        </button>
                    </div>
                    {(pendingFile || pendingPreviewUrl) && (
                        <div className="px-4 pb-4">
                            <div className="p-3 rounded-lg border border-[#e0e6ed] dark:border-[#1b2e4b] flex items-center gap-3">
                                {pendingPreviewUrl ? (
                                    <img src={pendingPreviewUrl} className="h-14 w-14 rounded-md object-cover border border-[#e0e6ed] dark:border-[#1b2e4b]" alt="preview" />
                                ) : (
                                    <div className="h-14 w-14 rounded-md bg-white-light dark:bg-[#1b2e4b] flex items-center justify-center text-xs">
                                        FILE
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold truncate">{pendingFile?.name}</div>
                                    <div className="text-xs text-white-dark truncate">{pendingFile?.type || 'document'}</div>
                                </div>
                                <button type="button" className="btn btn-outline-danger px-3" onClick={() => setPending(null)}>
                                    Remove
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminChat;

