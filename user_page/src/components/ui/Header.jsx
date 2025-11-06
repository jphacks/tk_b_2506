import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../AppIcon';
import SettingsPanel from '../settings/SettingsPanel';
import HelpModal from './HelpModal';
import NotificationButton from './NotificationButton';

const Header = ({
    notifications = [],
    onNotificationClick = () => { },
    showSettings = false,
    onConferenceSwitch
}) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const handleCloseSettings = useCallback(() => {
        setIsSettingsOpen(false);
    }, []);

    const handleSettingsClick = () => {
        if (!user) {
            // ログインしていない場合は認証ページに遷移
            navigate('/auth');
            return;
        }
        setIsSettingsOpen(true);
    };

    const handleHelpClick = () => {
        setIsHelpOpen(true);
    };

    const handleCloseHelp = useCallback(() => {
        setIsHelpOpen(false);
    }, []);

    const handleLogout = useCallback(async () => {
        await logout();
        handleCloseSettings();
        navigate('/auth', { replace: true });
    }, [logout, navigate, handleCloseSettings]);

    return (
        <>
            <header className="bg-card border-b border-border shadow-soft">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo Section */}
                        <div className="flex items-center">
                            <div className="flex flex-col">
                                <div className="flex items-center space-x-3">
                                    <h1 className="text-lg font-heading font-semibold text-foreground">
                                        SympoLink!
                                    </h1>
                                </div>
                                <p className="text-xs font-caption text-muted-foreground hidden sm:block">
                                    ちょっとシャイな研究者に向けた会話支援サービス
                                </p>
                            </div>
                        </div>

                        {/* Navigation Actions */}
                        <div className="flex items-center space-x-4">
                            {/* Notification Button - Only show when showSettings is true */}
                            {user && showSettings && (
                                <NotificationButton
                                    notifications={notifications}
                                    onNotificationClick={onNotificationClick}
                                />
                            )}

                            {/* Help Button */}
                            <button
                                onClick={handleHelpClick}
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

                            {/* Settings Button - Only show when showSettings is true */}
                            {showSettings && (
                                <button
                                    onClick={handleSettingsClick}
                                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 transition-gentle press-feedback touch-target"
                                    aria-label="Settings"
                                    aria-haspopup="dialog"
                                    aria-expanded={isSettingsOpen}
                                >
                                    <Icon
                                        name="Settings"
                                        size={20}
                                        color="var(--color-muted-foreground)"
                                        strokeWidth={2}
                                    />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <SettingsPanel
                isOpen={isSettingsOpen}
                onClose={handleCloseSettings}
                user={user}
                onLogout={handleLogout}
                onConferenceSwitch={onConferenceSwitch}
            />

            <HelpModal
                isOpen={isHelpOpen}
                onClose={handleCloseHelp}
            />
        </>
    );
};

export default Header;
