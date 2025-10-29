import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';

const VerifyEmailNotice = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const email = location.state?.email ?? '';

    const handleGoToLogin = () => {
        navigate('/auth', { replace: true });
    };

    return (
        <div className="min-h-screen bg-background">
            <Header notifications={[]} onNotificationClick={() => { }} showSettings={false} />
            <main className="w-full px-4 sm:px-6 lg:px-8 py-12 flex justify-center">
                <div className="max-w-lg w-full bg-card border border-border rounded-2xl shadow-soft p-8 space-y-6 text-center">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold text-foreground">メールを確認してください</h1>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            入力いただいたメールアドレス宛に確認メールを送信しました。
                            メール内のリンクを開いて認証を完了させてから、再度ログインしてください。
                        </p>
                        {email && (
                            <p className="text-sm font-medium text-primary/90 mt-2">
                                送信先: <span className="font-mono text-primary">{email}</span>
                            </p>
                        )}
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p>メールが届かない場合は、迷惑メールフォルダをご確認ください。</p>
                        <p>それでも届かない場合は、時間をおいて再度アカウント作成をお試しください。</p>
                    </div>

                    <Button onClick={handleGoToLogin} fullWidth>
                        ログイン画面へ戻る
                    </Button>
                </div>
            </main>
        </div>
    );
};

export default VerifyEmailNotice;
