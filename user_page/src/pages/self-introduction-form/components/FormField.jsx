import CharacterCounter from '../../../components/ui/CharacterCounter';
import Input from '../../../components/ui/Input';

const FormField = ({
    type = "text",
    label,
    name,
    value,
    onChange,
    placeholder,
    required = false,
    error,
    description,
    maxLength,
    showCharacterCounter = false,
    className = "",
    children // 追加
}) => {
    return (
        <div className={`space-y-2 ${className}`}>
            {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}

            {/* children があればそれをレンダリング、なければ既存の Input */}
            {children ? (
                children
            ) : (
                <Input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    error={error}
                    maxLength={maxLength}
                />
            )}

            {children && error && (
                <p className="text-xs text-destructive">{error}</p>
            )}

            {showCharacterCounter && maxLength && (
                <CharacterCounter
                    current={value?.length || 0}
                    max={maxLength}
                    className="px-1"
                />
            )}

            {/* description */}
            {description && (
                <p className="mt-1 text-[10px] text-gray-500">
                    {description}
                </p>
            )}
        </div>
    );
};

export default FormField;
