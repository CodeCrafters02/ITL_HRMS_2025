import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useLocation } from 'react-router-dom';
import IconMenuDocumentation from '../../components/Icon/Menu/IconMenuDocumentation';

const AdminComingSoon = () => {
    const dispatch = useDispatch();
    const location = useLocation();

    // Extract the page name from the URL path
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const pageName = pathSegments[pathSegments.length - 1]
        ?.replace(/-/g, ' ')
        ?.replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Page';

    useEffect(() => {
        dispatch(setPageTitle(pageName));
    }, [dispatch, pageName]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate__animated animate__fadeIn">
            <div className="relative mb-8">
                <div className="w-28 h-28 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 rounded-full flex items-center justify-center">
                    <IconMenuDocumentation className="w-14 h-14 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs font-bold">!</span>
                </div>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-3">{pageName}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
                This module is under active development and will be available soon. Stay tuned for updates!
            </p>
            <div className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 rounded-full">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span className="text-primary font-semibold text-sm">Under Development</span>
            </div>
        </div>
    );
};

export default AdminComingSoon;
