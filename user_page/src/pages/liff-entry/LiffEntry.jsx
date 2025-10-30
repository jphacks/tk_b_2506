import liff from '@line/liff';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const LiffEntry = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState('LINE認証を開始しています…');

  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect') || '/';

  useEffect(() => {
    const run = async () => {
      try {
        // 既にサインイン済みならそのまま遷移
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          navigate(redirect, { replace: true });
          return;
        }

        setMessage('LIFFを初期化中…');
        await liff.init({ liffId: import.meta.env.VITE_LIFF_ID });

        if (!liff.isLoggedIn()) {
          setMessage('LINEにリダイレクトしています…');
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const idToken = liff.getIDToken();
        if (!idToken) {
          // 取得できない場合は再ログイン
          liff.login({ redirectUri: window.location.href });
          return;
        }

        setMessage('プロフィールを取得中…');
        let profile = null;
        try {
          profile = await liff.getProfile();
        } catch (_) { }

        setMessage('サインイン処理中…');
        const res = await fetch('/api/line-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, lineUserId: profile?.userId || null })
        });

        // APIがトークンを返す場合はクライアント側でセッションを確立
        if (res.ok) {
          try {
            const payload = await res.json();
            // 1) token ペア方式
            if (payload?.access_token && payload?.refresh_token) {
              await supabase.auth.setSession({
                access_token: payload.access_token,
                refresh_token: payload.refresh_token
              });
              navigate(redirect, { replace: true });
              return;
            }
            // 2) magic link 方式（URLが返るケース）
            if (payload?.url) {
              window.location.replace(payload.url);
              return;
            }
          } catch (_) {
            // JSON以外（Cookie方式）の場合は無視
          }
        }
        // 何も返ってこない場合は通常の認証ページへ
        navigate('/auth', { replace: true });
      } catch (e) {
        setMessage('LINE連携に失敗しました。通常ログインをご利用ください。');
        // 3秒後に認証ページへ案内
        setTimeout(() => navigate('/auth', { replace: true }), 3000);
      }
    };

    run();
  }, [navigate, redirect]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-sm text-muted-foreground">{message}</div>
    </div>
  );
};

export default LiffEntry;
