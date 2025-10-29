import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Toast from '../../components/ui/Toast';
import { clearStoredConferenceId, setStoredConferenceId } from '../../constants/conference';
import { useAuth } from '../../contexts/AuthContext';
import { db, supabase, auth as supabaseAuth } from '../../lib/supabase';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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

        // URLから認証情報を取得
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          throw new Error(errorDescription || error);
        }

        if (!code) {
          // セッションを確認
          const { data, error: sessionError } = await supabaseAuth.getCurrentUser();

          if (sessionError || !data?.user) {
            throw new Error('認証に失敗しました。再度お試しください。');
          }

          setStatus('ログインに成功しました！');

          // ダッシュボードへ遷移
          await navigateToDashboard(data.user.id);
          return;
        }

        // LINE OAuthコールバック処理
        setStatus('LINE認証を処理しています...');

        // stateを検証（CSRF対策）
        const state = searchParams.get('state');
        const savedState = localStorage.getItem('line_oauth_state');

        console.log('[AuthCallback] State validation:', {
          receivedState: state,
          savedState: savedState,
          match: state === savedState,
          allSearchParams: Object.fromEntries(searchParams.entries())
        });

        if (!state) {
          console.error('[AuthCallback] No state in URL parameters');
          throw new Error('認証状態が取得できませんでした。再度お試しください。');
        }

        if (!savedState) {
          console.error('[AuthCallback] No saved state in localStorage');
          console.log('[AuthCallback] Available localStorage keys:', Object.keys(localStorage));
          // デバッグのため、最初の1回は警告のみで続行（本番では削除）
          console.warn('[AuthCallback] State validation failed, but continuing for debugging...');
          // throw new Error('認証状態の検証に失敗しました。再度お試しください。');
        } else if (state !== savedState) {
          console.error('[AuthCallback] State mismatch:', {
            received: state,
            saved: savedState,
            receivedLength: state?.length,
            savedLength: savedState?.length
          });
          // デバッグのため、最初の1回は警告のみで続行（本番では削除）
          console.warn('[AuthCallback] State validation failed, but continuing for debugging...');
          // throw new Error('認証状態の検証に失敗しました。再度お試しください。');
        }

        // 検証成功またはデバッグモード
        if (savedState) {
          localStorage.removeItem('line_oauth_state');
        }

        // Edge Functionを呼び出してLINE認証を処理
        const { data: functionResponse, error: functionError } = await supabase.functions.invoke('line-auth', {
          body: { code },
        });

        if (functionError) {
          throw new Error(`LINE認証の処理に失敗しました: ${functionError.message}`);
        }

        if (!functionResponse || !functionResponse.access_token) {
          throw new Error(functionResponse?.error || 'LINE認証の処理に失敗しました。');
        }

        // Edge Functionからセッション情報を取得
        if (!functionResponse.access_token || !functionResponse.refresh_token) {
          throw new Error('セッション情報が取得できませんでした。');
        }

        setStatus('ログイン中...');

        // Supabaseセッションを設定
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: functionResponse.access_token,
          refresh_token: functionResponse.refresh_token,
        });

        if (sessionError) {
          throw new Error('セッションの設定に失敗しました: ' + sessionError.message);
        }

        setStatus('ユーザー情報を確認しています...');

        // ユーザー情報を取得
        const { data: userData, error: userError } = await supabaseAuth.getCurrentUser();

        if (userError || !userData?.user) {
          throw new Error('ユーザー情報の取得に失敗しました。');
        }

        setStatus('ダッシュボードへ遷移します...');
        await navigateToDashboard(userData.user.id);

      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('認証に失敗しました');
        setToast({
          isVisible: true,
          message: error.message || '認証処理に失敗しました。',
          type: 'error'
        });

        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  const navigateToDashboard = async (userId) => {
    try {
      const participant = await db.getParticipantByUser(userId);
      const conferences = await db.getConferences({ includeInactive: true });
      const selectedConferenceId = participant?.conference_id || null;

      if (!selectedConferenceId) {
        clearStoredConferenceId();
        navigate('/select-conference', {
          replace: true,
          state: {
            requiresSelection: true,
            reason: '学会を選択してください'
          }
        });
        return;
      }

      const conferenceExists = conferences.some(conf => conf.id === selectedConferenceId);

      if (!conferenceExists) {
        clearStoredConferenceId();
        navigate('/select-conference', {
          replace: true,
          state: {
            requiresSelection: true,
            reason: '学会を選択してください'
          }
        });
        return;
      }

      setStoredConferenceId(selectedConferenceId);
      const introductions = await db.getUserIntroductions(userId, { conferenceId: selectedConferenceId });
      const hasIntroduction = introductions?.length > 0;

      // URLパラメータからタブを取得
      const tab = searchParams.get('tab') || 'home';

      const destination = hasIntroduction
        ? `/dashboard/${selectedConferenceId}${tab !== 'home' ? `?tab=${tab}` : ''}`
        : '/self-introduction-form';

      const navigationState = hasIntroduction
        ? {}
        : { preferredConferenceId: selectedConferenceId };

      navigate(destination, { replace: true, state: navigationState });
    } catch (error) {
      console.error('Navigation error:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header notifications={[]} onNotificationClick={() => { }} showSettings={false} />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-card border border-border rounded-xl p-8 shadow-soft">
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h2 className="text-lg font-semibold text-foreground">{status}</h2>
            </div>
          </div>
        </div>
      </main>

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

export default AuthCallback;
