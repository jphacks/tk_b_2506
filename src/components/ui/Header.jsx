import Icon from '../AppIcon';

const Header = () => {
    return (
        <header className="bg-card border-b border-border shadow-soft">
            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo Section */}
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                            <Icon
                                name="Users"
                                size={24}
                                color="white"
                                strokeWidth={2}
                            />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-lg font-heading font-semibold text-foreground">
                                Sympo Link
                            </h1>
                            <p className="text-xs font-caption text-muted-foreground hidden sm:block">
                                シンポジウムを楽しいものに！
                            </p>
                        </div>
                    </div>

                    {/* Navigation Actions */}
                    <div className="flex items-center space-x-4">
                        {/* Help Button */}
                        <button
                            className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 transition-gentle press-feedback touch-target"
                            aria-label="Help and support"
                        >
                            <Icon
                                name="HelpCircle"
                                size={20}
                                color="var(--color-muted-foreground)"
                                strokeWidth={2}
                            />
                        </button>

                        {/* Settings Button */}
                        <button
                            className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 transition-gentle press-feedback touch-target"
                            aria-label="Settings"
                        >
                            <Icon
                                name="Settings"
                                size={20}
                                color="var(--color-muted-foreground)"
                                strokeWidth={2}
                            />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;