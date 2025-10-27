import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';
import Input from '../../components/ui/Input';
import Toast from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth as supabaseAuth } from '../../lib/supabase';
import { clearStoredConferenceId, setStoredConferenceId } from '../../constants/conference';

const AuthPage = () => {
    const { login, signup } = useAuth();
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [toast, setToast] = useState({
        isVisible: false,
        message: '',
        type: 'success'
    });

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

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            let result;
            if (isLogin) {
                result = await login(formData.email, formData.password);
            } else {
                result = await signup(formData.email, formData.password);
            }

            if (result.success) {
                if (!isLogin) {
                    setToast({
                        isVisible: true,
                        message: "確認メールを送信しました。メールを開いて手続きを完了してください。",
                        type: 'success'
                    });
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

                    setToast({
                        isVisible: true,
                        message: isLogin ? "ログインしました！" : "アカウントが作成されました！",
                        type: 'success'
                    });

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
                    setToast({
                        isVisible: true,
                        message: postAuthError.message || 'ログイン後の処理に失敗しました。',
                        type: 'error'
                    });
                }
            } else {
                setToast({
                    isVisible: true,
                    message: result.error || (isLogin ? "ログインに失敗しました。" : "アカウント作成に失敗しました。"),
                    type: 'error'
                });
            }

        } catch (error) {
            setToast({
                isVisible: true,
                message: isLogin ? "ログインに失敗しました。" : "アカウント作成に失敗しました。",
                type: 'error'
            });
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
    };

    return (
        <div className="min-h-screen bg-background">
            <Header />
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
                            disabled={isLoading}
                            iconName={isLogin ? "LogIn" : "UserPlus"}
                            iconPosition="left"
                        >
                            {isLoading
                                ? (isLogin ? "ログイン中..." : "作成中...")
                                : (isLogin ? "ログイン" : "アカウント作成")
                            }
                        </Button>

                        {/* Mode Toggle */}
                        <div className="text-center">
                            <button
                                type="button"
                                onClick={toggleMode}
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {isLogin
                                    ? "アカウントをお持ちでない方はこちら"
                                    : "既にアカウントをお持ちの方はこちら"
                                }
                            </button>
                        </div>
                    </form>

                    {/* Guest Access */}
                    <div className="mt-8 pt-6 border-t border-border">
                        <div className="text-center space-y-4">
                            <p className="text-sm text-muted-foreground">
                                アカウントを作成せずに体験したい方
                            </p>
                            <Link
                                to="/new-introduction"
                                className="inline-flex items-center px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
                            >
                                <Icon
                                    name="Eye"
                                    size={16}
                                    color="currentColor"
                                    strokeWidth={2}
                                    className="mr-2"
                                />
                                ゲストとして体験
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            {/* Toast Notification */}
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
                duration={5000}
                position="top"
            />
        </div>
    );
};

export default AuthPage;
