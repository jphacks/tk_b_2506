import Icon from '../AppIcon';

const ValidationMessage = ({
    message = "",
    type = "error",
    isVisible = false,
    className = ""
}) => {
    if (!isVisible || !message) return null;

    const getVariantStyles = () => {
        switch (type) {
            case 'success':
                return 'text-success';
            case 'warning':
                return 'text-warning';
            case 'error':
                return 'text-error';
            case 'info':
                return 'text-primary';
            default:
                return 'text-muted-foreground';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return 'CheckCircle';
            case 'warning':
                return 'AlertTriangle';
            case 'error':
                return 'AlertCircle';
            case 'info':
                return 'Info';
            default:
                return null;
        }
    };

    const iconName = getIcon();

    return (
        <div
            className={`
        flex items-start space-x-2 mt-2 transition-all duration-200 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}
        ${getVariantStyles()}
        ${className}
      `}
        >
            {iconName && (
                <div className="flex-shrink-0 mt-0.5">
                    <Icon
                        name={iconName}
                        size={16}
                        color="currentColor"
                        strokeWidth={2}
                    />
                </div>
            )}
            <p className="text-sm leading-relaxed font-medium">
                {message}
            </p>
        </div>
    );
};

export default ValidationMessage;