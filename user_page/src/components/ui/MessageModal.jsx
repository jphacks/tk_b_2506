import { useEffect } from 'react';
import Icon from '../AppIcon';
import Button from './Button';

const MessageModal = ({
  isOpen = false,
  message = null,
  onClose = () => { },
  onChat = () => { },
  onVisit = () => { }
}) => {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-2">
            <Icon name="MessageCircle" size={20} className="text-primary" />
            <h2 className="font-medium text-lg">新しいメッセージ</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Sender Info */}
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Icon name="User" size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium">差出人</span>
            </div>
            <p className="text-sm">{message.senderName || '他の参加者'}</p>
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Icon name="MessageSquare" size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium">メッセージ</span>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-sm whitespace-pre-wrap">
                {message.content || 'メッセージをご確認ください。'}
              </p>
            </div>
          </div>

          {/* Timestamp */}
          {message.timestamp && (
            <div className="text-xs text-muted-foreground">
              {formatTimestamp(message.timestamp)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="default"
              size="lg"
              className="flex-1 h-12 text-base"
              onClick={() => message && onChat(message)}
              iconName="MessageSquare"
            >
              チャットへ
            </Button>
            <Button
              variant="default"
              size="lg"
              className="flex-1 h-12 text-base"
              onClick={() => message && onVisit(message)}
              iconName="MapPin"
            >
              会いに行く
            </Button>
          </div>
          <Button
            variant="success"
            size="lg"
            onClick={onClose}
            className="w-full h-12 text-base"
          >
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
