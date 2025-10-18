import { useEffect, useState } from 'react';
import Icon from '../AppIcon';

const Toast = ({
    message = "",
    type = "success",
    isVisible = false,
    onClose = () => { },
    duration = 5000,
    position = "top"
}) => {
    const [isShowing, setIsShowing] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setIsShowing(true);

            if (duration > 0) {
                const timer = setTimeout(() => {
                    handleClose();
                }, duration);

                return () => clearTimeout(timer);
            }
        }
    }, [isVisible, duration]);

    const handleClose = () => {
        setIsShowing(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const getToastStyles = () => {
        const baseStyles = "fixed left-1/2 transform -translate-x-1/2 z-50 max-w-sm w-full mx-4 sm:mx-0";
        const positionStyles = position === "top" ? "top-4 sm:top-6" : "bottom-4 sm:bottom-6";

        return `${baseStyles} ${positionStyles}`;
    };

    const getVariantStyles = () => {
        switch (type) {
            case 'success':
                return 'bg-success text-success-foreground border-success/20';
            case 'error':
                return 'bg-error text-error-foreground border-error/20';
            case 'warning':
                return 'bg-warning text-warning-foreground border-warning/20';
            default:
                return 'bg-card text-card-foreground border-border';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return 'CheckCircle';
            case 'error':
                return 'XCircle';
            case 'warning':
                return 'AlertTriangle';
            default:
                return 'Info';
        }
    };

    if (!isVisible && !isShowing) return null;

    return (
        <div className={getToastStyles()}>
            <div
                className={`
          flex items-start space-x-3 p-4 rounded-lg border shadow-medium
          transition-all duration-300 ease-out
          ${isShowing ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
          ${getVariantStyles()}
        `}
            >
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                    <Icon
                        name={getIcon()}
                        size={20}
                        color="currentColor"
                        strokeWidth={2}
                    />
                </div>

                {/* Message */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black/10 transition-colors duration-200 touch-target"
                    aria-label="Close notification"
                >
                    <Icon
                        name="X"
                        size={16}
                        color="currentColor"
                        strokeWidth={2}
                    />
                </button>
            </div>
        </div>
    );
};

export default Toast;