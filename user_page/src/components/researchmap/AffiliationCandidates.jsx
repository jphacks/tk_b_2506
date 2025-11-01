import PropTypes from 'prop-types';
import { cn } from '../../utils/cn';

/**
 * Presents affiliation candidates fetched from researchmap and lets the user pick one.
 */
const AffiliationCandidates = ({
    options,
    selectedValue,
    onSelect,
    recommendedLabel,
    helperText,
    error,
    isSelectionRequired = false
}) => {
    if (!Array.isArray(options) || options.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <label className="block text-sm font-medium text-gray-700">
                    現所属候補（researchmap）
                </label>
                {recommendedLabel && (
                    <span className="text-[10px] text-muted-foreground">
                        推奨: {recommendedLabel}
                    </span>
                )}
            </div>

            <div
                className="grid gap-2"
                role="radiogroup"
                aria-required={isSelectionRequired}
                aria-invalid={Boolean(error)}
            >
                {options.map((option) => {
                    const isSelected = option.value === selectedValue;
                    const indicatorClass = isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background';

                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onSelect?.(option.value)}
                            className={cn(
                                'w-full rounded-lg border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                                'hover:border-primary/60 hover:bg-primary/5',
                                indicatorClass
                            )}
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={option.rawLabel || option.label}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-foreground">
                                        {option.rawLabel || option.label}
                                    </p>
                                    {option.jobTitle && (
                                        <p className="text-xs text-muted-foreground">
                                            {option.jobTitle}
                                        </p>
                                    )}
                                    {option.period && (
                                        <p className="text-xs text-muted-foreground">
                                            {option.period}
                                        </p>
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        'mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full border',
                                        isSelected ? 'border-primary bg-primary' : 'border-border'
                                    )}
                                >
                                    {isSelected && (
                                        <span className="h-2 w-2 rounded-full bg-background" />
                                    )}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {error ? (
                <p className="text-[10px] text-destructive">
                    {error}
                </p>
            ) : helperText ? (
                <p className="text-[10px] text-muted-foreground">
                    {helperText}
                </p>
            ) : null}
        </div>
    );
};

AffiliationCandidates.propTypes = {
    options: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.string.isRequired,
        label: PropTypes.string,
        rawLabel: PropTypes.string,
        affiliation: PropTypes.string,
        jobTitle: PropTypes.string,
        period: PropTypes.string,
        reason: PropTypes.string,
        isPrimary: PropTypes.bool,
        occupationValue: PropTypes.string,
        occupationOtherValue: PropTypes.string,
        careerEntry: PropTypes.object
    })),
    selectedValue: PropTypes.string,
    onSelect: PropTypes.func,
    recommendedLabel: PropTypes.string,
    helperText: PropTypes.string,
    error: PropTypes.string,
    isSelectionRequired: PropTypes.bool
};

export default AffiliationCandidates;
