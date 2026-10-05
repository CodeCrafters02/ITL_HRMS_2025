import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client'

// Perfect Scrollbar
import 'react-perfect-scrollbar/dist/css/styles.css';

// Tailwind css
import './tailwind.css';

// i18n (needs to be bundled)
import './i18n';

// Router
import { RouterProvider } from 'react-router-dom';
import router from './router/index';

// Redux
import { Provider } from 'react-redux';
import store from './store/index';

// Keep the session alive: refresh expired access tokens for every fetch/axios call
import { installAuthInterceptors } from './utils/authFetch';
installAuthInterceptors();

// Microsoft Teams tab: silent SSO + theme sync before first render (no-op outside Teams)
import { bootstrapTeams } from './utils/teams';
import { toggleTheme } from './store/themeConfigSlice';

// After a deploy, a cached page still points at old chunk hashes: reload once to pick up the new build
window.addEventListener('vite:preloadError', (e) => {
    const last = Number(sessionStorage.getItem('chunk_reload_at') || 0);
    if (Date.now() - last < 30000) return;
    e.preventDefault();
    sessionStorage.setItem('chunk_reload_at', String(Date.now()));
    window.location.reload();
});

// Notifications
import { notificationService } from './services/notificationService';

// Initialize notifications
notificationService.initForegroundListener();

// Register Service Worker for FCM
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/firebase-messaging-sw.js')
            .then(registration => {
                console.log('FCM Service Worker registered with scope:', registration.scope);
            })
            .catch(err => {
                console.error('FCM Service Worker registration failed:', err);
            });
    });
}


const render = () => ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <Suspense>
            <Provider store={store}>
                <RouterProvider router={router} />
            </Provider>
        </Suspense>
    </React.StrictMode>
);

bootstrapTeams((dark) => store.dispatch(toggleTheme(dark ? 'dark' : 'light'))).finally(render);
