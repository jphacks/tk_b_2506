import { useEffect, useRef, useState } from 'react';
import Icon from '../AppIcon';
import Button from './Button';

const NotificationButton = ({
  notifications = [],
  onNotificationClick = () => { },
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [horizontalOffset, setHorizontalOffset] = useState(0);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const formatter = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(date)
        .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
      return `${parts.year}年${parts.month}月${parts.day}日 ${parts.hour}時${parts.minute}分`;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.notification-dropdown')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setHorizontalOffset(0);
      return;
    }

    const updatePosition = () => {
      const dropdown = dropdownRef.current;
      if (!dropdown) return;

      const rect = dropdown.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const padding = 16; // keep a little margin from the viewport edge

      if (rect.left < padding) {
        setHorizontalOffset(padding - rect.left);
      } else if (rect.right > viewportWidth - padding) {
        setHorizontalOffset((viewportWidth - padding) - rect.right);
      } else {
        setHorizontalOffset(0);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [isOpen]);

  const handleNotificationClick = (notification) => {
    onNotificationClick(notification);
    setIsOpen(false);
  };

  return (
    <div className={`relative notification-dropdown ${className}`}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Icon name="Bell" size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-error text-error-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div
          ref={dropdownRef}
          style={{ transform: `translateX(${horizontalOffset}px)` }}
          className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          <div className="p-3 border-b border-border">
            <h3 className="font-medium text-sm">通知</h3>
          </div>

          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              通知はありません
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification, index) => {
                const senderName = notification.senderName || '他の参加者';
                const messageBody = notification.content?.trim()
                  || notification.message
                  || 'メッセージをご確認ください。';
                const formattedTimestamp = formatTimestamp(notification.timestamp);

                return (
                  <div
                    key={notification.id || index}
                    className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${!notification.is_read ? 'bg-muted/30' : ''
                      }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0 mt-0.5">
                        <Icon
                          name="MessageCircle"
                          size={16}
                          className={!notification.is_read ? 'text-primary' : 'text-muted-foreground'}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''}`}>
                          {`${senderName}からの新しいメッセージ`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 break-words">
                          {messageBody}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formattedTimestamp || '日時情報がありません'}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationButton;
