import { useState, useEffect } from 'react';

export const useWindow = () => {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        // @ts-ignore
        if (window.electron) {
            // @ts-ignore
            window.electron.isMaximized().then(setIsMaximized);
            // @ts-ignore
            window.electron.onMaximized(() => setIsMaximized(true));
            // @ts-ignore
            window.electron.onUnmaximized(() => setIsMaximized(false));
        }
    }, []);

    const toggleMaximize = () => {
        // @ts-ignore
        if (window.electron) {
            if (isMaximized) {
                // @ts-ignore
                window.electron.unmaximize();
            } else {
                // @ts-ignore
                window.electron.maximize();
            }
        }
    };

    const handleMinimize = () => {
        // @ts-ignore
        if (window.electron && window.electron.minimize) {
            // @ts-ignore
            window.electron.minimize();
        }
    };

    const handleClose = () => {
        // @ts-ignore
        if (window.electron) window.electron.close();
    };

    return { isMaximized, toggleMaximize, handleMinimize, handleClose };
};
