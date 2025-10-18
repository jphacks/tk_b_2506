import { useState } from 'react';

const LoginForm = ({ onSubmit, allowedEmail, organization }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const success = await onSubmit?.(email.trim(), password);
            if (!success) {
                setError('メールアドレスまたはパスワードが正しくありません。');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="auth-layout">
            <div className="auth-card">
                <h1 className="auth-title">Conference Admin Portal</h1>
                <p className="auth-subtitle">{organization}</p>
                <form className="auth-form" onSubmit={handleSubmit}>
                    <label className="form-label" htmlFor="email">
                        メールアドレス
                    </label>
                    <input
                        id="email"
                        type="email"
                        className="form-input"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder={allowedEmail}
                        autoComplete="username"
                        required
                    />

                    <label className="form-label" htmlFor="password">
                        パスワード
                    </label>
                    <input
                        id="password"
                        type="password"
                        className="form-input"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        required
                    />

                    {error && <p className="form-error">{error}</p>}

                    <button
                        type="submit"
                        className="primary-button"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? '確認中…' : 'ログイン'}
                    </button>
                </form>
                <div className="auth-hint">
                    <p>管理者用の資格情報でのみアクセス可能です。</p>
                    <ul>
                        <li>メールアドレス: <code>{allowedEmail}</code></li>
                        <li>パスワード: <code>securepass123</code></li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;
