export const useHelpers = () => {
    const hexToRgba = (hex: string, alpha: string) => {
        if (!hex || !hex.startsWith('#')) return `rgba(40, 40, 40, ${alpha || '1'})`;
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex.slice(1, 3), 16);
            g = parseInt(hex.slice(3, 5), 16);
            b = parseInt(hex.slice(5, 7), 16);
        } else {
            return `rgba(40, 40, 40, ${alpha || '1'})`;
        }
        return `rgba(${r}, ${g}, ${b}, ${alpha || '1'})`;
    };

    return { hexToRgba };
};
