import Icon from '../../../components/AppIcon';

const VisibilityToggle = ({
    isPublic = true,
    onChange = () => { },
    className = ""
}) => {
    return (
        <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-start space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                        <Icon
                            name={isPublic ? "Eye" : "EyeOff"}
                            size={20}
                            color="var(--color-primary)"
                            strokeWidth={2}
                        />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-medium text-foreground mb-1">
                            公開設定
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {isPublic
                                ? "他の参加者があなたの自己紹介を閲覧できます" : "自己紹介は非公開になります（自分のみ閲覧可能）"
                            }
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => onChange(!isPublic)}
                    className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 touch-target
            ${isPublic ? 'bg-primary' : 'bg-muted'}
          `}
                    aria-label={isPublic ? "公開設定を無効にする" : "公開設定を有効にする"}
                >
                    <span
                        className={`
              inline-block h-4 w-4 transform rounded-full bg-white shadow-soft transition-transform duration-200 ease-in-out
              ${isPublic ? 'translate-x-6' : 'translate-x-1'}
            `}
                    />
                </button>
            </div>
        </div>
    );
};

export default VisibilityToggle;