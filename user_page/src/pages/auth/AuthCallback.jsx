import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Toast from '../../components/ui/Toast';
import { setStoredConferenceId } from '../../constants/conference';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState('処理中...');
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setStatus('認証を確認しています...');

        // URLパラメータからLINEの認証情報を取得
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const liffClientId = searchParams.get('liffClientId');
        const liffRedirectUri = searchParams.get('liffRedirectUri');

        // LIFFの認証パラメータがある場合、LINE認証を処理
        if (code && state && liffClientId) {
          setStatus('LINE認証を処理中...');

          // LIFFを初期化してIDトークンを取得
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

          setStatus('Supabase認証を処理中...');

          // Edge Functionを呼び出してSupabase認証
          const resp = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-login`,
            {
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
            }
          );

          if (!resp.ok) {
            const errorData = await resp.text();
            console.error('line-login failed:', errorData);
            throw new Error(`LINE認証処理に失敗しました: ${errorData}`);
          }

          const { url } = await resp.json();
          if (url) {
            setStatus('認証完了！リダイレクト中...');
            window.location.href = url; // Supabaseのマジックリンクへリダイレクト
            return;
          } else {
            throw new Error('認証URLの取得に失敗しました');
          }
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

        console.log('[AuthCallback] Session created successfully:', {
          userId: data.session.user.id,
          email: data.session.user.email,
          userMetadata: data.session.user.user_metadata
        });

        setStatus('認証完了！ダッシュボードに移動しています...');

        // ユーザーの学会選択状況を確認
        const userId = data.session.user.id;
        const { data: participant, error: participantError } = await supabase
          .from('participants')
          .select('conference_id')
          .eq('user_id', userId)
          .single();

        if (participantError) {
          console.error('Error fetching participant:', participantError);
          // エラーの場合は学会選択ページへ
          navigate('/select-conference', {
            state: {
              requiresSelection: true,
              reason: '学会情報の取得に失敗しました'
            }
          });
          return;
        }

        const conferenceId = participant?.conference_id;
        console.log('Participant conference ID:', conferenceId);

        if (conferenceId) {
          // 学会が選択されている場合はその学会のダッシュボードへ
          setStoredConferenceId(conferenceId);
          setStatus('認証完了！ダッシュボードに移動しています...');
          setTimeout(() => {
            navigate(`/dashboard/${conferenceId}`);
          }, 1000);
        } else {
          // 学会が選択されていない場合は学会選択ページへ
          setStatus('学会を選択してください...');
          setTimeout(() => {
            navigate('/select-conference', {
              state: {
                requiresSelection: true,
                reason: '学会を選択してください'
              }
            });
          }, 1000);
        }

      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('認証に失敗しました');
        setToast({
          isVisible: true,
          message: `認証エラー: ${error.message}`,
          type: 'error'
        });

        // エラー時はログインページにリダイレクト
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              {status}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              しばらくお待ちください...
            </p>
          </div>
        </div>
      </div>

      {toast.isVisible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, isVisible: false })}
        />
      )}
    </div>
  );
};

export default AuthCallback;
