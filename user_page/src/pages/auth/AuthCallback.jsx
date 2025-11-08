import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import { setStoredConferenceId } from '../../constants/conference';
import { supabase } from '../../lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // LINE認証フロー中かチェック
  const isLineLoginFlow = sessionStorage.getItem('lineLoginInProgress') === 'true';

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URLパラメータからLINEの認証情報を取得
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const liffClientId = searchParams.get('liffClientId');

        // LIFFの認証パラメータがある場合、LINE認証を処理
        if (code && state && liffClientId) {
          const liff = await import('@line/liff');
          await liff.default.init({ liffId: import.meta.env.VITE_LIFF_ID });

          if (!liff.default.isLoggedIn()) {
            throw new Error('LINEログインに失敗しました');
          }

          const idToken = liff.default.getIDToken();
          const profile = await liff.default.getProfile();

          if (!idToken || !profile.userId) {
            throw new Error('LINE認証情報の取得に失敗しました');
          }

          // Edge Functionを呼び出してSupabase認証
          const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-login`;

          const resp = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              id_token: idToken,
              line_user_id: profile.userId,
              name: profile.displayName,
              picture: profile.pictureUrl,
              redirect_to: `${window.location.origin}/auth/callback`,
            }),
          });

          if (!resp.ok) {
            const errorData = await resp.text();
            throw new Error(`LINE認証処理に失敗しました: ${errorData}`);
          }

          const { url } = await resp.json();
          if (url) {
            // LINE認証フロー完了、sessionStorageをクリア
            sessionStorage.removeItem('lineLoginInProgress');
            window.location.href = url; // Supabaseのマジックリンクへリダイレクト
            return;
          }
          throw new Error('認証URLの取得に失敗しました');
        }

        // 通常のSupabaseセッション確認
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[AuthCallback] Session error:', error);
          throw new Error(`認証エラー: ${error.message}`);
        }

        if (!data.session) {
          throw new Error('セッションが取得できませんでした');
        }

        // ユーザーの学会選択状況を確認
        const userId = data.session.user.id;
        const { data: participant, error: participantError } = await supabase
          .from('participants')
          .select('conference_id')
          .eq('user_id', userId)
          .single();

        if (participantError) {
          console.error('Error fetching participant:', participantError);
          navigate('/select-conference', {
            state: {
              requiresSelection: true,
              reason: '学会情報の取得に失敗しました'
            }
          });
          return;
        }

        const conferenceId = participant?.conference_id;

        if (conferenceId) {
          setStoredConferenceId(conferenceId);
          navigate(`/dashboard/${conferenceId}`);
        } else {
          navigate('/select-conference', {
            state: {
              requiresSelection: true,
              reason: '学会を選択してください'
            }
          });
        }

      } catch (error) {
        console.error('Auth callback error:', error);
        // エラー時もsessionStorageをクリア
        sessionStorage.removeItem('lineLoginInProgress');
        setErrorMessage('ログインに失敗しました。もう一度お試しください。');
        setIsProcessing(false);

        // エラー時はログインページにリダイレクト
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  // LINE認証フロー中は何も表示しない（AuthPageのローディング画面が維持される）
  if (isLineLoginFlow) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showSettings={false} />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6" aria-live="polite">
          {isProcessing ? (
            <>
              <div
                className="mx-auto h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"
                aria-label="ログイン処理中"
              />
              <h2 className="text-2xl font-semibold text-gray-900">ログイン処理中です</h2>
              <p className="text-sm text-gray-600">しばらくお待ちください...</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-error">{errorMessage || 'ログインに失敗しました。'}</h2>
              <p className="text-sm text-gray-600">まもなくログイン画面に戻ります。</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
