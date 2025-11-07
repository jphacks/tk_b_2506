import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';
import Input from '../../components/ui/Input';
import { clearStoredConferenceId, setStoredConferenceId } from '../../constants/conference';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth as supabaseAuth } from '../../lib/supabase';

const AuthPage = () => {
    const { login, signup, loginWithLine } = useAuth();
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isLineLoginLoading, setIsLineLoginLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState('success');

    // Form validation
    const validateForm = () => {
        const newErrors = {};

        if (!formData.email.trim()) {
            newErrors.email = "メールアドレスは必須です";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "有効なメールアドレスを入力してください";
        }

        if (!formData.password.trim()) {
            newErrors.password = "パスワードは必須です";
        } else if (formData.password.length < 6) {
            newErrors.password = "パスワードは6文字以上で入力してください";
        }

        if (!isLogin) {
            if (!formData.confirmPassword.trim()) {
                newErrors.confirmPassword = "パスワード確認は必須です";
            } else if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = "パスワードが一致しません";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isLineLoginLoading) {
            return;
        }

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setStatusMessage('');

        try {
            let result;
            if (isLogin) {
                result = await login(formData.email, formData.password);
            } else {
                result = await signup(formData.email, formData.password);
            }

            if (result.success) {
                if (!isLogin) {
                    setStatusType('success');
                    setStatusMessage("確認メールを送信しました。メールを開いて手続きを完了してください。");
                    navigate('/auth/verify-email', {
                        replace: true,
                        state: { email: formData.email }
                    });
                    return;
                }
                try {
                    const { data: userData, error: userError } = await supabaseAuth.getCurrentUser();
                    if (userError || !userData?.user) {
                        throw new Error('ユーザー情報の取得に失敗しました。');
                    }

                    const userId = userData.user.id;
                    const participant = await db.getParticipantByUser(userId);
                    const conferences = await db.getConferences({ includeInactive: true });
                    const selectedConferenceId = participant?.conference_id || null;

                    const navigateWithConference = async (conferenceId) => {
                        if (!conferenceId) {
                            navigate('/select-conference', { replace: true });
                            return;
                        }

                        setStoredConferenceId(conferenceId);
                        const introductions = await db.getUserIntroductions(userId, { conferenceId });
                        const hasIntroduction = introductions?.length > 0;

                        const destination = hasIntroduction
                            ? `/dashboard/${conferenceId}`
                            : '/self-introduction-form';

                        const navigationState = hasIntroduction
                            ? {}
                            : { preferredConferenceId: conferenceId };

                        navigate(destination, { replace: true, state: navigationState });
                    };

                    const conferenceExists = selectedConferenceId
                        ? conferences.some(conf => conf.id === selectedConferenceId)
                        : false;

                    setStatusType('success');
                    setStatusMessage(isLogin ? "ログインしました！" : "アカウントが作成されました！");

                    if (conferenceExists) {
                        await navigateWithConference(selectedConferenceId);
                    } else {
                        clearStoredConferenceId();
                        navigate('/select-conference', {
                            replace: true,
                            state: {
                                requiresSelection: true,
                                reason: conferenceExists ? null : '学会を選択してください'
                            }
                        });
                    }
                } catch (postAuthError) {
                    console.error('Post-auth navigation error:', postAuthError);
                    setStatusType('error');
                    setStatusMessage(postAuthError.message || 'ログイン後の処理に失敗しました。');
                }
            } else {
                setStatusType('error');
                setStatusMessage(result.error || (isLogin ? "ログインに失敗しました。" : "アカウント作成に失敗しました。"));
            }

        } catch (error) {
            setStatusType('error');
            setStatusMessage(isLogin ? "ログインに失敗しました。" : "アカウント作成に失敗しました。");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle mode toggle
    const toggleMode = () => {
        setIsLogin(!isLogin);
        setFormData({
            email: '',
            password: '',
            confirmPassword: ''
        });
        setErrors({});
        setStatusMessage('');
    };

    // Handle LINE login
    const handleLineLogin = async () => {
        if (isLineLoginLoading) {
            return;
        }
        setStatusMessage('');
        setIsLineLoginLoading(true);
        try {
            const result = await loginWithLine();
            if (!result.success) {
                setStatusType('error');
                setStatusMessage(result.error || 'LINEログインに失敗しました。');
                setIsLineLoginLoading(false);
            }
            // 成功時はリダイレクトされるため以降の処理は不要
        } catch (error) {
            setStatusType('error');
            setStatusMessage('LINEログインに失敗しました。');
            setIsLineLoginLoading(false);
        }
    };

    return (
        <>
        <div className="min-h-screen bg-background">
            <Header notifications={[]} onNotificationClick={() => { }} showSettings={false} />
            <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-md mx-auto">
                    {/* Auth Header */}
                    <div className="text-center space-y-4 mb-8">
                        <div className="flex justify-center">
                            <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl">
                                <Icon
                                    name={isLogin ? "LogIn" : "UserPlus"}
                                    size={32}
                                    color="var(--color-primary)"
                                    strokeWidth={2}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground">
                                {isLogin ? "ログイン" : "アカウント作成"}
                            </h1>
                            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                                {isLogin
                                    ? "学会参加の準備を始めましょう"
                                    : "新しいアカウントを作成して自己紹介を準備しましょう"
                                }
                            </p>
                        </div>
                    </div>

                    {/* Auth Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {statusMessage && (
                            <div
                                className={`px-4 py-3 rounded-lg border text-sm ${
                                    statusType === 'error'
                                        ? 'border-error/30 bg-error/10 text-error'
                                        : 'border-primary/30 bg-primary/5 text-primary'
                                }`}
                            >
                                {statusMessage}
                            </div>
                        )}
                        <div className="bg-card border border-border rounded-xl p-6 shadow-soft space-y-4">
                            {/* Email Field */}
                            <Input
                                type="email"
                                label="メールアドレス"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="example@university.ac.jp"
                                required
                                error={errors.email}
                                description="学会参加用のメールアドレス"
                            />

                            {/* Password Field */}
                            <Input
                                type="password"
                                label="パスワード"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="••••••••"
                                required
                                error={errors.password}
                                description="6文字以上のパスワード"
                            />

                            {/* Confirm Password Field (Signup only) */}
                            {!isLogin && (
                                <Input
                                    type="password"
                                    label="パスワード確認"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    placeholder="••••••••"
                                    required
                                    error={errors.confirmPassword}
                                    description="パスワードを再入力してください"
                                />
                            )}
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            variant="default"
                            size="lg"
                            fullWidth
                            loading={isLoading}
                            disabled={isLoading || isLineLoginLoading}
                            iconName={isLogin ? "LogIn" : "UserPlus"}
                            iconPosition="left"
                        >
                            {isLoading
                                ? (isLogin ? "ログイン中..." : "作成中...")
                                : (isLogin ? "ログイン" : "アカウント作成")
                            }
                        </Button>

                        {/* LINE Login Button */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">または</span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            fullWidth
                            onClick={handleLineLogin}
                            loading={isLineLoginLoading}
                            disabled={isLoading || isLineLoginLoading}
                            iconPosition="left"
                            className="bg-[#06C755] hover:bg-[#05B64A] text-white border-[#06C755]"
                        >
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.348 0 .627.285.627.63 0 .349-.279.63-.627.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629h-1.754l-.84 1.275c-.104.156-.282.25-.464.25-.345 0-.63-.283-.63-.629 0-.24.143-.45.346-.555l1.422-.87-1.422-.87c-.203-.104-.346-.314-.346-.554 0-.346.285-.63.63-.63.182 0 .36.104.464.25l.84 1.274h1.755c.349 0 .63.285.63.63M7.423 15.052H4.227c-.346 0-.627-.285-.627-.63V8.108c0-.345.281-.63.63-.63.345 0 .63.285.63.63v5.684h2.563c.348 0 .629.283.629.63 0 .344-.282.63-.629.63" />
                            </svg>
                            LINEでログイン
                        </Button>

                        {/* Mode Toggle */}
                        <div className="text-center">
                            <button
                                type="button"
                                onClick={toggleMode}
                                className="text-m text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {isLogin
                                    ? "アカウントをお持ちでない方はこちら"
                                    : "既にアカウントをお持ちの方はこちら"
                                }
                            </button>
                        </div>
                    </form>

                </div>
            </main>
        </div>
        {isLineLoginLoading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-card rounded-2xl p-6 shadow-xl text-center space-y-4">
                    <div
                        className="mx-auto h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"
                        aria-label="LINEでログイン処理中"
                    />
                    <p className="text-sm text-muted-foreground">LINEでログイン処理中です。しばらくお待ちください。</p>
                </div>
            </div>
        )}
        </>
    );
};

export default AuthPage;
