import React, { useEffect, useState } from 'react';

function AlertToast({ message, show, onClose }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (show) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(onClose, 500); 
            }, 4000); 
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    if (!show) return null;

    const style = {
        transition: 'opacity 500ms, transform 500ms',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
    };

    return (
        <div style={style} className="fixed bottom-5 right-5 bg-red-600 text-white px-6 py-4 rounded-lg shadow-xl z-50 max-w-sm">
            <p className="font-bold text-lg">Suspicious Activity Detected!</p>
            <p className="text-md">{message}</p>
        </div>
    );
}

export default AlertToast;
