import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import IconMenuChat from './Icon/Menu/IconMenuChat';

import { openTeamsChat } from '../utils/teams';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type Conversation = { id: number; unread_count?: number };

const ChatFloatingButton = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const role = localStorage.getItem('user_role') || '';

    const [unreadTotal, setUnreadTotal] = useState(0);
    const [isGhost, setIsGhost] = useState(false);

    const buttonRef = useRef<HTMLButtonElement>(null);
    const pollTimerRef = useRef<any>(null);
    const inactivityTimerRef = useRef<any>(null);
    const lastClickTimeRef = useRef<number>(0);
    const singleClickTimeoutRef = useRef<any>(null);

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

    // Polling for unread messages
    useEffect(() => {
        if (!chatPath) return;
        refreshUnread();
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = setInterval(() => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
            refreshUnread();
        }, 5000);
        return () => {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatPath]);

    // Inactivity timer: after 5 seconds, becomes transparent (ghost mode)
    const resetInactivityTimer = () => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = setTimeout(() => {
            setIsGhost(true);
        }, 5000);
    };

    useEffect(() => {
        resetInactivityTimer();
        return () => {
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
            if (singleClickTimeoutRef.current) clearTimeout(singleClickTimeoutRef.current);
        };
    }, []);

    // Forward single click in ghost mode to whatever button/element is behind the chat button
    const forwardClickToUnderlyingElement = (x: number, y: number) => {
        if (!buttonRef.current) return;
        // Temporarily disable pointer events on the chat button to sample what is directly behind it
        buttonRef.current.style.pointerEvents = 'none';
        const elementBehind = document.elementFromPoint(x, y);
        buttonRef.current.style.pointerEvents = 'auto';

        if (elementBehind && elementBehind !== document.body && elementBehind !== document.documentElement) {
            (elementBehind as HTMLElement).click?.();
            (elementBehind as HTMLElement).focus?.();
        }
    };

    const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (isGhost) {
            // Ghost / Transparent Mode:
            // Check if clicked two times within 350ms to wake up / enable
            const now = Date.now();
            const timeDiff = now - lastClickTimeRef.current;
            lastClickTimeRef.current = now;

            if (timeDiff < 350) {
                // Double click: wake up and enable the chat button!
                if (singleClickTimeoutRef.current) {
                    clearTimeout(singleClickTimeoutRef.current);
                    singleClickTimeoutRef.current = null;
                }
                setIsGhost(false);
                resetInactivityTimer();
                return;
            }

            // Single click in ghost mode: pass through to the element behind it
            const { clientX, clientY } = e;
            singleClickTimeoutRef.current = setTimeout(() => {
                forwardClickToUnderlyingElement(clientX, clientY);
            }, 300);
            return;
        }

        // Active Mode: navigate to chat
        resetInactivityTimer();
        if (chatPath) {
            if (!openTeamsChat()) Swal.fire('Allow pop-ups', 'Your browser blocked the Microsoft Teams tab. Please allow pop-ups for this site.', 'info');
        }
    };

    const handleDoubleClick = () => {
        if (isGhost) {
            if (singleClickTimeoutRef.current) {
                clearTimeout(singleClickTimeoutRef.current);
                singleClickTimeoutRef.current = null;
            }
            setIsGhost(false);
            resetInactivityTimer();
        }
    };

    if (!chatPath) return null;
    if (isChatRoute) return null;

    return (
        <button
            ref={buttonRef}
            type="button"
            className={`fixed bottom-6 ltr:right-6 rtl:left-6 z-[60] rounded-full flex items-center gap-2.5 select-none transition-all duration-300 group ${
                isGhost
                    ? 'opacity-25 bg-slate-900/30 dark:bg-slate-900/50 backdrop-blur-[1px] border border-white/10 text-white/50 shadow-none hover:opacity-40 scale-95 cursor-default'
                    : 'opacity-100 bg-gradient-to-r from-brand via-brand-dark to-brand-mid text-white shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/50 hover:scale-105 active:scale-95 border border-white/20 scale-100 cursor-pointer px-4 py-3'
            }`}
            style={{
                padding: isGhost ? '0.625rem 0.875rem' : '0.75rem 1rem',
            }}
            onClick={handleButtonClick}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={() => {
                if (!isGhost) resetInactivityTimer();
            }}
            title={isGhost ? 'Click behind to interact, or double-click to enable chat' : 'Open chat in Microsoft Teams'}
        >
            <span className="relative flex items-center justify-center">
                <IconMenuChat className={`w-5 h-5 transition-transform duration-200 ${!isGhost ? 'group-hover:rotate-12' : ''}`} />
                {unreadTotal > 0 && (
                    <span
                        className={`absolute -top-2.5 -right-2.5 min-w-[20px] h-[20px] px-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center shadow-md ${
                            !isGhost ? 'animate-pulse' : 'opacity-50'
                        }`}
                    >
                        {unreadTotal > 99 ? '99+' : unreadTotal}
                    </span>
                )}
            </span>
            <span className={`font-semibold text-sm hidden sm:inline tracking-wide ${isGhost ? 'text-white/40' : 'text-white'}`}>
                {isGhost ? 'Chat (Click 2x)' : 'Chat'}
            </span>
        </button>
    );
};

export default ChatFloatingButton;
