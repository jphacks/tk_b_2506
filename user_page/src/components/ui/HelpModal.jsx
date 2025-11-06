import Icon from '../AppIcon';

const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card border border-border rounded-xl shadow-soft max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">ヘルプ & サポート</h2>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-gentle"
              aria-label="Close help"
            >
              <Icon name="X" size={16} color="var(--color-muted-foreground)" />
            </button>
          </div>

          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h3 className="font-medium text-foreground mb-2">SympoLink! について</h3>
              <p>SympoLink! は、学会参加者が気軽に交流できるプラットフォームです。QRコードを用いた位置情報更新、メッセージの送信、おすすめの研究者の表示などの機能を提供しています。</p>
            </div>

            <div>
              <h3 className="font-medium text-foreground mb-2">主な機能</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>自己紹介プロフィール管理</li>
                <li>QRコードを用いた位置情報更新</li>
                <li>メッセージの送信</li>
                <li>おすすめの研究者の検索</li>
                <li>リアルタイム通知</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-foreground mb-2">使い方</h3>
              <ol className="space-y-1 list-decimal list-inside">
                <li>アカウントを作成してログイン</li>
                <li>参加する学会を選択</li>
                <li>自己紹介プロフィールを作成</li>
                <li>参加者と交流!</li>
              </ol>
            </div>

            <div>
              <h3 className="font-medium text-foreground mb-2">サポート</h3>
              <p>ご質問やお困りのことがございましたら、お気軽に〇〇〇@〇〇〇.comへお問い合わせください。</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="w-full h-12 text-base bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-gentle"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
