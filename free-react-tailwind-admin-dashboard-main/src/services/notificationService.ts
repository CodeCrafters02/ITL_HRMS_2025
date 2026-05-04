import { getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { messaging } from '../utils/firebase';
import Swal from 'sweetalert2';

const VAPID_KEY = 'BGpsX5ZRU1qgUMCjDOC3501_1UnI3dvQCqS9QmG68-Ykliw1YzqcRjMCSbe7JluixMMV_3TmEU8PJhHfgbGgQAI'; // User needs to replace this
const DEVICE_TOKEN_ENDPOINT = '/notifications/devices/';

/** Character count before description is collapsed with "See more". */
const DESCRIPTION_PREVIEW_MAX = 120;

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getPushTitleBody(payload: MessagePayload): { title: string; body: string } {
    const title =
        payload.notification?.title ||
        (payload.data?.title as string | undefined) ||
        'Notification';
    const body =
        payload.notification?.body ||
        (payload.data?.body as string | undefined) ||
        '';
    return { title: String(title), body: String(body) };
}

function showPushToast(payload: MessagePayload) {
    const { title, body } = getPushTitleBody(payload);
    const safeTitle = escapeHtml(title);
    const safeBody = escapeHtml(body);
    const needsTruncate = body.length > DESCRIPTION_PREVIEW_MAX;
    const previewText = needsTruncate
        ? `${body.slice(0, DESCRIPTION_PREVIEW_MAX).trimEnd()}…`
        : body;
    const safePreview = escapeHtml(previewText);

    const html = `
        <div class="hrms-fcm-toast-inner">
            <div class="hrms-fcm-toast-title">${safeTitle}</div>
            <div class="hrms-fcm-toast-description-wrap">
                <p class="hrms-fcm-toast-desc hrms-fcm-toast-desc--short">${needsTruncate ? safePreview : safeBody}</p>
                ${
                    needsTruncate
                        ? `<p class="hrms-fcm-toast-desc hrms-fcm-toast-desc--full" style="display:none">${safeBody}</p>`
                        : ''
                }
            </div>
            ${
                needsTruncate
                    ? `<button type="button" class="hrms-fcm-toast-toggle" data-expanded="false">See more</button>`
                    : ''
            }
        </div>
    `;

    void Swal.fire({
        html,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 8000,
        timerProgressBar: true,
        showCloseButton: true,
        width: 'min(100vw - 24px, 400px)',
        padding: '14px 16px',
        customClass: {
            popup: 'hrms-fcm-toast-popup',
            htmlContainer: 'hrms-fcm-toast-html',
        },
        didOpen: (popup) => {
            const btn = popup.querySelector('.hrms-fcm-toast-toggle') as HTMLButtonElement | null;
            const shortEl = popup.querySelector('.hrms-fcm-toast-desc--short') as HTMLElement | null;
            const fullEl = popup.querySelector('.hrms-fcm-toast-desc--full') as HTMLElement | null;
            if (!btn || !shortEl || !fullEl) return;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const expanded = btn.getAttribute('data-expanded') === 'true';
                if (!expanded) {
                    shortEl.style.display = 'none';
                    fullEl.style.display = 'block';
                    btn.textContent = 'See less';
                    btn.setAttribute('data-expanded', 'true');
                } else {
                    shortEl.style.display = 'block';
                    fullEl.style.display = 'none';
                    btn.textContent = 'See more';
                    btn.setAttribute('data-expanded', 'false');
                }
            });
        },
    });
}

class NotificationService {
    async requestPermission() {
        if (!messaging) return;

        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('Notification permission granted.');
                await this.registerToken();
            } else {
                console.warn('Unable to get permission to notify.');
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    }

    async registerToken() {
        if (!messaging) return;

        try {
            const currentToken = await getToken(messaging, {
                vapidKey: VAPID_KEY,
            });

            if (currentToken) {
                console.log('FCM Token:', currentToken);
                await this.sendTokenToBackend(currentToken);
            } else {
                console.warn('No registration token available. Request permission to generate one.');
            }
        } catch (error) {
            console.error('An error occurred while retrieving token:', error);
        }
    }

    async sendTokenToBackend(token: string) {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
        const accessToken = localStorage.getItem('access_token') || localStorage.getItem('accessToken');

        if (!accessToken) {
            console.warn('No access token found, skipping FCM token registration.');
            return;
        }

        try {
            const response = await fetch(`${baseUrl}${DEVICE_TOKEN_ENDPOINT}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ token }),
            });

            if (!response.ok) {
                throw new Error('Failed to register device token with backend');
            }
            console.log('Device token registered successfully');
        } catch (error) {
            console.error('Error registering device token:', error);
        }
    }

    initForegroundListener() {
        if (!messaging) return;

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            // Re-register token on app load so backend always has a current token.
            void this.registerToken();
        }

        onMessage(messaging, (payload: MessagePayload) => {
            console.log('Message received. ', payload);
            showPushToast(payload);
        });
    }
}

export const notificationService = new NotificationService();
