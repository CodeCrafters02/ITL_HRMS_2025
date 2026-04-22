import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import IconMenuChat from './Icon/Menu/IconMenuChat';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type Conversation = { id: number; unread_count?: number };

const ChatFloatingButton = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const role = localStorage.getItem('user_role') || '';

    const [unreadTotal, setUnreadTotal] = useState(0);
    const timerRef = useRef<any>(null);

    const isChatRoute = useMemo(() => {
        const p = location.pathname || '';
        return p.startsWith('/admin/chat') || p.startsWith('/employee/chat');
    }, [location.pathname]);

    const chatPath = role === 'employee' ? '/employee/chat' : role === 'admin' ? '/admin/chat' : null;

    const headers = (): Record<string, string> => {
        const token = localStorage.getItem('access_token');
        const h: Record<string, string> = {};
        if (token) h.Authorization = `Bearer ${token}`;
        return h;
    };

    const refreshUnread = async () => {
        if (!chatPath) return;
        try {
            const resp = await fetch(`${API_BASE_URL}/app/chat-conversations/`, { headers: headers() });
            const data = await resp.json();
            if (!resp.ok) return;
            const list = (data?.results || data) as Conversation[];
            const arr = Array.isArray(list) ? list : [];
            const total = arr.reduce((sum, c) => sum + (Number(c.unread_count || 0) || 0), 0);
            setUnreadTotal(total);
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        if (!chatPath) return;
        refreshUnread();
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
            refreshUnread();
        }, 5000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatPath]);

    if (!chatPath) return null; // show only for admin/employee
    if (isChatRoute) return null; // don't show on chat page itself

    return (
        <button
            type="button"
            className="fixed bottom-6 ltr:right-6 rtl:left-6 z-[70] rounded-full bg-primary text-white shadow-lg hover:shadow-xl transition px-4 py-3 flex items-center gap-2"
            onClick={async () => {
                try {
                    navigate(chatPath);
                } catch (e: any) {
                    Swal.fire('Error', e?.message || 'Unable to open chat', 'error');
                }
            }}
            title="Chat"
        >
            <span className="relative">
                <IconMenuChat className="w-5 h-5" />
                {unreadTotal > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[20px] h-[20px] px-1 rounded-full bg-success text-white text-[11px] flex items-center justify-center">
                        {unreadTotal > 99 ? '99+' : unreadTotal}
                    </span>
                )}
            </span>
            <span className="font-semibold hidden sm:inline">Chat</span>
        </button>
    );
};

export default ChatFloatingButton;

