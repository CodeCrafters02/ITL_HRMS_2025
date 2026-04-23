import { getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { messaging } from '../utils/firebase';
import Swal from 'sweetalert2';

const VAPID_KEY = 'BGpsX5ZRU1qgUMCjDOC3501_1UnI3dvQCqS9QmG68-Ykliw1YzqcRjMCSbe7JluixMMV_3TmEU8PJhHfgbGgQAI'; // User needs to replace this
const DEVICE_TOKEN_ENDPOINT = '/notifications/devices/';

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
        const accessToken = localStorage.getItem('accessToken');

        if (!accessToken) {
            console.warn('No access token found, skipping FCM token registration.');
            return;
        }

        try {
            const response = await fetch(`${baseUrl}${DEVICE_TOKEN_ENDPOINT}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
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

        onMessage(messaging, (payload: MessagePayload) => {
            console.log('Message received. ', payload);
            
            // Show SweetAlert2 toast
            Swal.fire({
                title: payload.data?.title || 'Notification',
                text: payload.data?.body || '',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 5000,
                timerProgressBar: true,
                showCloseButton: true,
                icon: 'info',
            });
        });
    }
}

export const notificationService = new NotificationService();
