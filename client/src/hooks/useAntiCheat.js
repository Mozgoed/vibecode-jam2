import { useEffect } from 'react';

export function useAntiCheat(onEvent) {
    useEffect(() => {
        const handleCopy = (e) => {
            const event = { type: 'copy', timestamp: Date.now() };
            onEvent(event);
            // Send log to server
            try {
                fetch('http://localhost:3001/api/anticheat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event_type: 'copy', timestamp: event.timestamp, details: {} }),
                });
            } catch (err) {
                // Ignore network errors silently
            }
        };

        const handlePaste = (e) => {
            const data = e.clipboardData?.getData('text');
            const event = { type: 'paste', timestamp: Date.now(), data };
            onEvent(event);
            try {
                fetch('http://localhost:3001/api/anticheat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event_type: 'paste', timestamp: event.timestamp, details: { data } }),
                });
            } catch (err) {}
        };

        const handleBlur = () => {
            const event = { type: 'blur', timestamp: Date.now() };
            onEvent(event);
            try {
                fetch('http://localhost:3001/api/anticheat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event_type: 'blur', timestamp: event.timestamp, details: {} }),
                });
            } catch (err) {}
        };

        const handleFocus = () => {
            const event = { type: 'focus', timestamp: Date.now() };
            onEvent(event);
            try {
                fetch('http://localhost:3001/api/anticheat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event_type: 'focus', timestamp: event.timestamp, details: {} }),
                });
            } catch (err) {}
        };

        const handleVisibilityChange = () => {
            const hidden = document.hidden;
            const type = hidden ? 'tab_hidden' : 'tab_visible';
            const event = { type, timestamp: Date.now() };
            onEvent(event);
            try {
                fetch('http://localhost:3001/api/anticheat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event_type: type, timestamp: event.timestamp, details: {} }),
                });
            } catch (err) {}
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
