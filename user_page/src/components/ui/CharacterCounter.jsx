
const CharacterCounter = ({
    current = 0,
    max = 100,
    className = "",
    showRemaining = true
}) => {
    const percentage = (current / max) * 100;
    const remaining = max - current;

    // Color states based on usage
    const getColorClass = () => {
        if (percentage >= 95) return 'text-error';
        if (percentage >= 80) return 'text-warning';
        return 'text-muted-foreground';
    };

    const getProgressColor = () => {
        if (percentage >= 95) return 'bg-error';
        if (percentage >= 80) return 'bg-warning';
        return 'bg-primary';
    };

    return (
        <div className={`space-y-2 ${className}`}>
            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                    className={`h-full transition-all duration-300 ease-out ${getProgressColor()}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>

            {/* Counter Text */}
            <div className={`flex justify-between items-center text-sm font-mono transition-colors duration-200 ${getColorClass()}`}>
                <span>
                    {current} / {max}
                </span>
                {showRemaining && (
                    <span className="text-xs">
                        {remaining > 0 ? `${remaining} remaining` : 'Limit reached'}
                    </span>
                )}
            </div>
        </div>
    );
};

export default CharacterCounter;