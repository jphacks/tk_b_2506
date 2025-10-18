import Button from '../../../components/ui/Button';

const FormActions = ({
    onSubmit = () => { },
    onReset = () => { },
    isLoading = false,
    isValid = false,
    className = ""
}) => {
    return (
        <div className={`space-y-3 ${className}`}>
            {/* Submit Button */}
            <Button
                type="submit"
                variant="default"
                size="lg"
                fullWidth
                loading={isLoading}
                disabled={!isValid || isLoading}
                onClick={onSubmit}
                iconName={isLoading ? undefined : "Send"}
                iconPosition="right"
            >
                {isLoading ? "作成中..." : "自己紹介を作成"}
            </Button>

            {/* Reset Button */}
            <Button
                type="button"
                variant="outline"
                size="default"
                fullWidth
                disabled={isLoading}
                onClick={onReset}
                iconName="RotateCcw"
                iconPosition="left"
            >
                フォームをリセット
            </Button>
        </div>
    );
};

export default FormActions;