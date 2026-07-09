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
    const userId = localStorage.getItem('user_id') || 'anonymous';

    const [unreadTotal, setUnreadTotal] = useState(0);
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const buttonRef = useRef<HTMLButtonElement>(null);
    const timerRef = useRef<any>(null);

    const dragInfo = useRef<{
        isDragging: boolean;
        startX: number;
        startY: number;
        buttonX: number;
        buttonY: number;
        hasMoved: boolean;
    }>({
        isDragging: false,
        startX: 0,
        startY: 0,
        buttonX: 0,
        buttonY: 0,
        hasMoved: false,
    });

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

    // Load saved position or set default position
    useEffect(() => {
        const saved = localStorage.getItem(`chat_pos_${userId}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                    const maxX = window.innerWidth - 130;
                    const maxY = window.innerHeight - 60;
                    const clampedX = Math.max(10, Math.min(parsed.x, maxX));
                    const clampedY = Math.max(10, Math.min(parsed.y, maxY));
                    setPosition({ x: clampedX, y: clampedY });
                    return;
                }
            } catch {
                // ignore
            }
        }
        // Default position: bottom-6 right-6
        const defaultX = window.innerWidth - 130;
        const defaultY = window.innerHeight - 70;
        setPosition({ x: defaultX, y: defaultY });
    }, [userId]);

    // Handle viewport resize
    useEffect(() => {
        const handleResize = () => {
            setPosition((prev) => {
                if (!prev) return null;
                const buttonWidth = buttonRef.current?.offsetWidth || 120;
                const buttonHeight = buttonRef.current?.offsetHeight || 48;
                const clampedX = Math.max(10, Math.min(prev.x, window.innerWidth - buttonWidth - 10));
                const clampedY = Math.max(10, Math.min(prev.y, window.innerHeight - buttonHeight - 10));
                return { x: clampedX, y: clampedY };
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Refs for drag handlers to avoid stale closure issues
    const mouseMoveRef = useRef<(e: MouseEvent) => void>();
    const touchMoveRef = useRef<(e: TouchEvent) => void>();
    const mouseUpRef = useRef<() => void>();
    const touchEndRef = useRef<() => void>();

    useEffect(() => {
        mouseMoveRef.current = (e: MouseEvent) => {
            if (!dragInfo.current.isDragging) return;
            const deltaX = e.clientX - dragInfo.current.startX;
            const deltaY = e.clientY - dragInfo.current.startY;
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                dragInfo.current.hasMoved = true;
            }
            const newX = dragInfo.current.buttonX + deltaX;
            const newY = dragInfo.current.buttonY + deltaY;
            const buttonWidth = buttonRef.current?.offsetWidth || 120;
            const buttonHeight = buttonRef.current?.offsetHeight || 48;
            const clampedX = Math.max(10, Math.min(newX, window.innerWidth - buttonWidth - 10));
            const clampedY = Math.max(10, Math.min(newY, window.innerHeight - buttonHeight - 10));
            setPosition({ x: clampedX, y: clampedY });
        };

        touchMoveRef.current = (e: TouchEvent) => {
            if (!dragInfo.current.isDragging) return;
            e.preventDefault();
            const touch = e.touches[0];
            const deltaX = touch.clientX - dragInfo.current.startX;
            const deltaY = touch.clientY - dragInfo.current.startY;
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                dragInfo.current.hasMoved = true;
            }
            const newX = dragInfo.current.buttonX + deltaX;
            const newY = dragInfo.current.buttonY + deltaY;
            const buttonWidth = buttonRef.current?.offsetWidth || 120;
            const buttonHeight = buttonRef.current?.offsetHeight || 48;
            const clampedX = Math.max(10, Math.min(newX, window.innerWidth - buttonWidth - 10));
            const clampedY = Math.max(10, Math.min(newY, window.innerHeight - buttonHeight - 10));
            setPosition({ x: clampedX, y: clampedY });
        };

        mouseUpRef.current = () => {
            setIsDragging(false);
            if (dragInfo.current.isDragging) {
                dragInfo.current.isDragging = false;
                const currentUserId = localStorage.getItem('user_id') || 'anonymous';
                setPosition((pos) => {
                    if (pos) {
                        localStorage.setItem(`chat_pos_${currentUserId}`, JSON.stringify(pos));
                    }
                    return pos;
                });
            }
            if (mouseMoveRef.current) document.removeEventListener('mousemove', mouseMoveRef.current);
            if (mouseUpRef.current) document.removeEventListener('mouseup', mouseUpRef.current);
        };

        touchEndRef.current = () => {
            setIsDragging(false);
            if (dragInfo.current.isDragging) {
                dragInfo.current.isDragging = false;
                const currentUserId = localStorage.getItem('user_id') || 'anonymous';
                setPosition((pos) => {
                    if (pos) {
                        localStorage.setItem(`chat_pos_${currentUserId}`, JSON.stringify(pos));
                    }
                    return pos;
                });
            }
            if (touchMoveRef.current) document.removeEventListener('touchmove', touchMoveRef.current);
            if (touchEndRef.current) document.removeEventListener('touchend', touchEndRef.current);
        };
    });

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (e.button !== 0) return;
        setIsDragging(true);
        dragInfo.current = {
            isDragging: true,
            startX: e.clientX,
            startY: e.clientY,
            buttonX: position?.x || 0,
            buttonY: position?.y || 0,
            hasMoved: false,
        };
        if (mouseMoveRef.current) document.addEventListener('mousemove', mouseMoveRef.current);
        if (mouseUpRef.current) document.addEventListener('mouseup', mouseUpRef.current);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
        setIsDragging(true);
        const touch = e.touches[0];
        dragInfo.current = {
            isDragging: true,
            startX: touch.clientX,
            startY: touch.clientY,
            buttonX: position?.x || 0,
            buttonY: position?.y || 0,
            hasMoved: false,
        };
        if (touchMoveRef.current) document.addEventListener('touchmove', touchMoveRef.current, { passive: false });
        if (touchEndRef.current) document.addEventListener('touchend', touchEndRef.current);
    };

    useEffect(() => {
        return () => {
            if (mouseMoveRef.current) document.removeEventListener('mousemove', mouseMoveRef.current);
            if (mouseUpRef.current) document.removeEventListener('mouseup', mouseUpRef.current);
            if (touchMoveRef.current) document.removeEventListener('touchmove', touchMoveRef.current);
            if (touchEndRef.current) document.removeEventListener('touchend', touchEndRef.current);
        };
    }, []);

    if (!chatPath) return null;
    if (isChatRoute) return null;

    const style: React.CSSProperties = position
        ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
              bottom: 'auto',
              right: 'auto',
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              transition: isDragging ? 'none' : 'box-shadow 0.15s ease-in-out, opacity 0.15s ease-in-out',
          }
        : {
              opacity: 0,
          };

    return (
        <button
            ref={buttonRef}
            type="button"
            style={style}
            className="fixed z-[70] rounded-full bg-primary text-white shadow-lg hover:shadow-xl px-4 py-3 flex items-center gap-2 select-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onClick={async () => {
                if (dragInfo.current.hasMoved) {
                    return;
                }
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
