import React from 'react';

export const useResize = () => {
    const handleResizeStart = (e: React.MouseEvent, direction: 'right' | 'bottom' | 'bottom-right' | 'left') => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.screenX;
        const startY = e.screenY;
        const startWidth = document.body.clientWidth;
        const startHeight = document.body.clientHeight;
        const startWindowX = window.screenX;

        const onMouseMove = (moveEvent: MouseEvent) => {
            // @ts-ignore
            if (window.electron && window.electron.resize) {
                const currentX = moveEvent.screenX;
                const currentY = moveEvent.screenY;

                let newBounds: any = {};

                if (direction === 'right' || direction === 'bottom-right') {
                    newBounds.width = startWidth + (currentX - startX);
                }
                if (direction === 'bottom' || direction === 'bottom-right') {
                    newBounds.height = startHeight + (currentY - startY);
                }
                if (direction === 'left') {
                    const delta = currentX - startX;
                    newBounds.width = startWidth - delta;
                    newBounds.x = startWindowX + delta;
                }

                // Ensure we don't send undefined if not changing
                if (!newBounds.width && direction !== 'bottom') newBounds.width = startWidth;
                if (!newBounds.height && direction === 'left') newBounds.height = startHeight;

                // @ts-ignore
                window.electron.resize(newBounds);
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return { handleResizeStart };
};
