import { useState } from 'react';
import { supabase } from '../lib/supabase';
import Button from './ui/Button';
import Input from './ui/Input';

const LineUserBinding = ({ participantId, onSuccess }) => {
  const [lineUserId, setLineUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

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
