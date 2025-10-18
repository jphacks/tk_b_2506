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
    className = ""
}) => {
    return (
        <div className={`space-y-2 ${className}`}>
            <Input
                type={type}
                label={label}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                error={error}
                description={description}
                maxLength={maxLength}
            />

            {showCharacterCounter && maxLength && (
                <CharacterCounter
                    current={value?.length || 0}
                    max={maxLength}
                    className="px-1"
                />
            )}
        </div>
    );
};

export default FormField;