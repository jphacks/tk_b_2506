import { useState, useRef, useEffect } from 'react';
import Icon from '../AppIcon';

const MultiSelect = ({
    label,
    name,
    options = [],
    value = [], // 選択されたIDの配列
    onChange = () => { },
    placeholder = '選択してください',
    disabled = false,
    error = '',
    description = '',
    required = false,
    loading = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);

    // 選択されたオプションを取得
    const selectedOptions = options.filter(opt => value.includes(opt.value));

    // フィルタリングされたオプション
    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 外側クリックで閉じる
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleToggleOption = (optionValue) => {
        if (value.includes(optionValue)) {
            // 選択解除
            onChange(value.filter(v => v !== optionValue));
        } else {
            // 選択追加
            onChange([...value, optionValue]);
        }
    };

    const handleRemoveOption = (optionValue) => {
        onChange(value.filter(v => v !== optionValue));
    };

    const handleClearAll = () => {
        onChange([]);
    };

    return (
        <div className="space-y-2">
            {/* Label */}
            {label && (
                <label
                    htmlFor={name}
                    className="block text-sm font-medium text-foreground"
                >
                    {label}
                    {required && <span className="text-error ml-1">*</span>}
                </label>
            )}

            {/* Selected Tags Display */}
            {selectedOptions.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 border border-border rounded-lg bg-background">
                    {selectedOptions.map(opt => (
                        <span
                            key={opt.value}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-primary/10 text-primary border border-primary/20"
                        >
                            {opt.label}
                            <button
                                type="button"
                                onClick={() => handleRemoveOption(opt.value)}
                                disabled={disabled}
                                className="hover:text-error transition-colors"
                            >
                                <Icon name="X" size={14} />
                            </button>
                        </span>
                    ))}
                    <button
                        type="button"
                        onClick={handleClearAll}
                        disabled={disabled}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        すべて解除
                    </button>
                </div>
            )}

            {/* Dropdown Container */}
            <div ref={containerRef} className="relative">
                {/* Trigger Button */}
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled || loading}
                    className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg transition-colors ${
                        error
                            ? 'border-error focus:ring-error'
                            : 'border-border focus:ring-primary'
                    } ${
                        disabled || loading
                            ? 'bg-muted cursor-not-allowed opacity-60'
                            : 'bg-background hover:border-primary/50'
                    }`}
                >
                    <span className={`text-sm ${selectedOptions.length === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {loading
                            ? '読み込み中...'
                            : selectedOptions.length === 0
                                ? placeholder
                                : `${selectedOptions.length}個選択中`}
                    </span>
                    <Icon
                        name={isOpen ? 'ChevronUp' : 'ChevronDown'}
                        size={16}
                        color="var(--color-muted-foreground)"
                    />
                </button>

                {/* Dropdown Menu */}
                {isOpen && !disabled && !loading && (
                    <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-hidden">
                        {/* Search Input */}
                        <div className="p-2 border-b border-border">
                            <input
                                type="text"
                                placeholder="検索..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        {/* Options List */}
                        <div className="overflow-y-auto max-h-48">
                            {filteredOptions.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                                    該当するタグが見つかりません
                                </div>
                            ) : (
                                filteredOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleToggleOption(opt.value)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                                    >
                                        <div
                                            className={`flex items-center justify-center w-4 h-4 border rounded ${
                                                value.includes(opt.value)
                                                    ? 'bg-primary border-primary'
                                                    : 'border-border'
                                            }`}
                                        >
                                            {value.includes(opt.value) && (
                                                <Icon name="Check" size={12} color="white" />
                                            )}
                                        </div>
                                        <span className="flex-1">{opt.label}</span>
                                        {opt.description && (
                                            <span className="text-xs text-muted-foreground">
                                                {opt.description}
                                            </span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Description or Error */}
            {(description || error) && (
                <p className={`text-xs ${error ? 'text-error' : 'text-muted-foreground'}`}>
                    {error || description}
                </p>
            )}
        </div>
    );
};

export default MultiSelect;
