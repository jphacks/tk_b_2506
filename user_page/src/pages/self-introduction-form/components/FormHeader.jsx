import Icon from '../../../components/AppIcon';

const FormHeader = ({ className = "", isEditMode = false }) => {
    return (
        <div className={`text-center space-y-4 ${className}`}>
            {/* Icon */}
            <div className="flex justify-center">
                <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl">
                    <Icon
                        name={isEditMode ? "Edit" : "UserPlus"}
                        size={32}
                        color="var(--color-primary)"
                        strokeWidth={2}
                    />
                </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground">
                    {isEditMode ? '自己紹介を編集' : '新しい自己紹介を作成'}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
                    {isEditMode
                        ? '登録済みの自己紹介を編集できます。変更内容は保存ボタンで反映されます'
                        : '学会での自己紹介を新しく作成して、参加者との交流を準備しましょう'}
                </p>
            </div>
        </div>
    );
};

export default FormHeader;