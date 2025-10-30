import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Button from './ui/Button';
import Input from './ui/Input';

const LineUserBinding = ({ participantId, onSuccess }) => {
  const [lineUserId, setLineUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentLineId, setCurrentLineId] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  // 現在のLINE IDを確認
  useEffect(() => {
    const checkCurrentLineId = async () => {
      try {
        const { data, error } = await supabase
          .from('participants')
          .select('line_user_id')
          .eq('id', participantId)
          .single();

        if (error) {
          console.error('Error fetching LINE ID:', error);
        } else {
          setCurrentLineId(data?.line_user_id);
        }
      } catch (error) {
        console.error('Error checking LINE ID:', error);
      } finally {
        setIsChecking(false);
      }
    };

    if (participantId) {
      checkCurrentLineId();
    }
  }, [participantId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lineUserId.trim()) {
      setMessage('LINEユーザーIDを入力してください');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // LINEユーザーIDを更新
      const { error } = await supabase
        .from('participants')
        .update({ line_user_id: lineUserId.trim() })
        .eq('id', participantId);

      if (error) {
        throw error;
      }

      setMessage('LINEユーザーIDが登録されました！');
      onSuccess?.();
    } catch (error) {
      console.error('Error updating LINE user ID:', error);
      setMessage('登録に失敗しました: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">LINE IDを確認中...</p>
        </div>
      </div>
    );
  }

  if (currentLineId) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            LINE通知設定
          </h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-green-800">
                  LINE通知が有効です
                </h4>
                <p className="text-sm text-green-700 mt-1">
                  LINE ID: {currentLineId}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>LINE認証により自動で設定されました。通知を受け取ることができます。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">LINE通知の設定</h3>
        <p className="text-sm text-muted-foreground mb-4">
          LINE通知を受信するには、LINEユーザーIDを登録してください。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="lineUserId" className="block text-sm font-medium mb-2">
            LINEユーザーID
          </label>
          <Input
            id="lineUserId"
            type="text"
            value={lineUserId}
            onChange={(e) => setLineUserId(e.target.value)}
            placeholder="LINEユーザーIDを入力"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            LINEユーザーIDは、LINE公式アカウントから取得できます。
          </p>
        </div>

        {message && (
          <div className={`text-sm ${message.includes('失敗') ? 'text-error' : 'text-success'}`}>
            {message}
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? '登録中...' : 'LINEユーザーIDを登録'}
        </Button>
      </form>

      <div className="text-xs text-muted-foreground">
        <p>LINEユーザーIDの取得方法：</p>
        <ol className="list-decimal list-inside mt-1 space-y-1">
          <li>LINE公式アカウントを友だち追加</li>
          <li>任意のメッセージを送信</li>
          <li>WebhookログからユーザーIDを確認</li>
        </ol>
      </div>
    </div>
  );
};

export default LineUserBinding;
