import { createBrowserRouter } from 'react-router-dom';
import BlankLayout from '../components/Layouts/BlankLayout';
import DefaultLayout from '../components/Layouts/DefaultLayout';
import { routes } from './routes';

const RouteError = () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-base font-semibold dark:text-white-light">This page could not be loaded. A newer version of HRMS may be available.</p>
        <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('_v', String(Date.now()));
                window.location.replace(url.href);
            }}
        >
            Reload
        </button>
    </div>
);

const finalRoutes = routes.map((route) => {
    return {
        ...route,
        errorElement: <RouteError />,
        element: route.layout === 'blank' ? <BlankLayout>{route.element}</BlankLayout> : <DefaultLayout>{route.element}</DefaultLayout>,
    };
});

const router = createBrowserRouter(finalRoutes);

export default router;
