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
        
        // Supabase Edge Function の正しいURLを構築
        const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-login`;

        const res = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ 
            id_token: idToken, 
            line_user_id: profile?.userId || null,
            name: profile?.displayName || null,
            picture: profile?.pictureUrl || null,
            redirect_to: `${window.location.origin}/auth/callback`
          })
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
          } catch (e) {
            console.error('[LiffEntry] Error parsing response:', e);
            // JSON以外（Cookie方式）の場合は無視
          }
        } else {
          const errorText = await res.text();
          console.error('[LiffEntry] Edge Function error:', errorText);
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
