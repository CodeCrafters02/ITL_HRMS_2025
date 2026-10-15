import { PropsWithChildren, useEffect } from 'react';
import App from '../../App';
import { loadBranding } from '../../theme/brandingStore';

const BlankLayout = ({ children }: PropsWithChildren) => {
    useEffect(() => {
        loadBranding(); // login & signed-out pages always fall back to the default Innovyx theme
    }, []);

    return (
        <App>
            <div className="text-black dark:text-white-dark min-h-screen">{children} </div>
        </App>
    );
};

export default BlankLayout;
