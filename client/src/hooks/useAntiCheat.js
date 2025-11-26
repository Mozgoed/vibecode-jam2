import { useEffect } from 'react';

export function useAntiCheat(onEvent) {
    useEffect(() => {
        const handleCopy = (e) => {
            onEvent({ type: 'copy', timestamp: Date.now() });
        };

        const handlePaste = (e) => {
            onEvent({ type: 'paste', timestamp: Date.now(), data: e.clipboardData?.getData('text') });
        };

        const handleBlur = () => {
            onEvent({ type: 'blur', timestamp: Date.now() });
        };

        const handleFocus = () => {
            onEvent({ type: 'focus', timestamp: Date.now() });
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                onEvent({ type: 'tab_hidden', timestamp: Date.now() });
            } else {
                onEvent({ type: 'tab_visible', timestamp: Date.now() });
            }
        };

        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [onEvent]);
}
