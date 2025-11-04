import { useEffect, useState } from 'react';
import Button from '../../../components/ui/Button';
import Textarea from '../../../components/ui/Textarea';
import { db, supabase } from '../../../lib/supabase';

const MessagesTab = ({ currentParticipant, conferenceId }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // 会話一覧を取得（ミートリクエストから）
  useEffect(() => {
    if (!currentParticipant?.id || !conferenceId) return;

    const loadConversations = async () => {
      setIsLoading(true);
      try {
        // 送受信したミートリクエストを取得
        const { data, error } = await supabase
          .from('participant_meet_requests')
          .select(`
                        *,
                        from_participant:participants!from_participant_id(
                            id,
                            introduction:introductions(name, affiliation)
                        ),
                        to_participant:participants!to_participant_id(
                            id,
                            introduction:introductions(name, affiliation)
                        )
                    `)
          .or(`from_participant_id.eq.${currentParticipant.id},to_participant_id.eq.${currentParticipant.id}`)
          .eq('conference_id', conferenceId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // 会話相手ごとにグループ化
        const conversationMap = new Map();
        data.forEach(request => {
          const otherParticipantId =
            request.from_participant_id === currentParticipant.id
              ? request.to_participant_id
              : request.from_participant_id;

          const otherParticipant =
            request.from_participant_id === currentParticipant.id
              ? request.to_participant
              : request.from_participant;

          if (!conversationMap.has(otherParticipantId)) {
            conversationMap.set(otherParticipantId, {
              participantId: otherParticipantId,
              participant: otherParticipant,
              lastMessage: request.message,
              lastMessageTime: request.created_at,
              unreadCount: 0
            });
          }
        });

        setConversations(Array.from(conversationMap.values()));
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [currentParticipant?.id, conferenceId]);

  // 選択した会話のメッセージを取得
  useEffect(() => {
    if (!selectedConversation || !currentParticipant?.id) return;

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('participant_meet_requests')
          .select('*')
          .eq('conference_id', conferenceId)
          .or(
            `and(from_participant_id.eq.${currentParticipant.id},to_participant_id.eq.${selectedConversation.participantId}),` +
            `and(from_participant_id.eq.${selectedConversation.participantId},to_participant_id.eq.${currentParticipant.id})`
          )
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    loadMessages();
  }, [selectedConversation, currentParticipant?.id, conferenceId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentParticipant?.id) return;

    setIsSending(true);
    try {
      const trimmedMessage = newMessage.trim();

      await db.createMeetRequest({
        conferenceId,
        fromParticipantId: currentParticipant.id,
        toParticipantId: selectedConversation.participantId,
        message: trimmedMessage
      });

      // LINE通知を送信（受信者のLINEユーザーIDがある場合のみ）
      try {
        // 受信者の詳細情報を取得（line_user_idを含む）
        const { data: recipientData, error: recipientError } = await supabase
          .from('participants')
          .select('line_user_id, introduction:introductions(name, affiliation)')
          .eq('id', selectedConversation.participantId)
          .single();

        if (!recipientError && recipientData?.line_user_id) {
          const senderName = currentParticipant?.introduction?.name ||
            currentParticipant?.introduction?.affiliation ||
            '他の参加者';

          const messageText = `送信者: ${senderName}\nメッセージ: ${trimmedMessage}`;

          // Supabaseセッションを取得して認証ヘッダーに使用
          const { data: { session } } = await supabase.auth.getSession();
          const authToken = session?.access_token;

          await fetch('https://cqudhplophskbgzepoti.supabase.co/functions/v1/send-line-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              userId: recipientData.line_user_id,
              message: messageText,
              type: 'meet_request'
            })
          });
        }
      } catch (lineError) {
        console.error('Failed to send LINE notification:', lineError);
        // LINE通知の失敗はユーザーに表示しない
      }

      setNewMessage('');

      // メッセージ一覧を再読み込み
      const { data, error } = await supabase
        .from('participant_meet_requests')
        .select('*')
        .eq('conference_id', conferenceId)
        .or(
          `and(from_participant_id.eq.${currentParticipant.id},to_participant_id.eq.${selectedConversation.participantId}),` +
          `and(from_participant_id.eq.${selectedConversation.participantId},to_participant_id.eq.${currentParticipant.id})`
        )
        .order('created_at', { ascending: true });

      if (!error) setMessages(data || []);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">メッセージがありません</p>
          <p className="text-sm text-muted-foreground">
            参加者にミートリクエストを送信すると、ここにメッセージが表示されます。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* 会話一覧 */}
      <div className="md:col-span-1 border border-border rounded-lg overflow-y-auto">
        <div className="p-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold">会話</h3>
        </div>
        <div className="divide-y divide-border">
          {conversations.map((conv) => {
            const name = conv.participant?.introduction?.name ||
              conv.participant?.introduction?.affiliation ||
              '名前未設定';

            return (
              <button
                key={conv.participantId}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full text-left p-3 hover:bg-muted/40 transition-colors ${selectedConversation?.participantId === conv.participantId
                  ? 'bg-primary/10 border-l-4 border-primary'
                  : ''
                  }`}
              >
                <p className="font-medium text-sm truncate">{name}</p>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {conv.lastMessage || 'メッセージなし'}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* メッセージ表示 */}
      <div className="md:col-span-2 border border-border rounded-lg flex flex-col">
        {selectedConversation ? (
          <>
            {/* ヘッダー */}
            <div className="p-3 border-b border-border bg-muted/30">
              <h3 className="font-semibold">
                {selectedConversation.participant?.introduction?.name ||
                  selectedConversation.participant?.introduction?.affiliation ||
                  '名前未設定'}
              </h3>
            </div>

            {/* メッセージ一覧 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const isSent = msg.from_participant_id === currentParticipant.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${isSent
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                        }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-xs mt-1 ${isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {new Date(msg.created_at).toLocaleString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* メッセージ入力 */}
            <div className="p-3 border-t border-border bg-muted/20">
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="メッセージを入力..."
                  className="flex-1 min-h-[60px] max-h-[120px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                >
                  {isSending ? '送信中...' : '送信'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">会話を選択してください</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesTab;
