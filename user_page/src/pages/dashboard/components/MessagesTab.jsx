import { useEffect, useState } from 'react';
import Button from '../../../components/ui/Button';
import Textarea from '../../../components/ui/Textarea';
import ParticipantProfileModal from './ParticipantProfileModal';
import { db, supabase } from '../../../lib/supabase';
import Icon from '../../../components/AppIcon';

const MessagesTab = ({
  currentParticipant,
  conferenceId,
  selectedParticipantId = null,
  onConversationReady = null,
  onVisitParticipant = () => { }
}) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConversationView, setIsConversationView] = useState(false);
  const [profileParticipant, setProfileParticipant] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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

  useEffect(() => {
    if (!selectedParticipantId || conversations.length === 0) return;
    const existing = conversations.find(
      (conversation) => conversation.participantId === selectedParticipantId
    );

    if (existing && existing.participantId !== selectedConversation?.participantId) {
      setSelectedConversation(existing);
      setIsConversationView(true);
      if (typeof onConversationReady === 'function') {
        onConversationReady();
      }
    }
  }, [selectedParticipantId, conversations, selectedConversation, onConversationReady]);

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
          const senderName = currentParticipant?.introduction?.name?.trim() ||
            currentParticipant?.introduction?.affiliation?.trim() ||
            'SympoLink! 参加者';

          // Supabaseセッションを取得して認証ヘッダーに使用
          const { data: { session } } = await supabase.auth.getSession();
          const authToken = session?.access_token;

          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-line-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              userId: recipientData.line_user_id,
              senderName,
              message: trimmedMessage || 'メッセージをご確認ください。',
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

  const handleOpenConversation = (conversation) => {
    setSelectedConversation(conversation);
    setIsConversationView(true);
  };

  const handleBackToList = () => {
    setIsConversationView(false);
    setSelectedConversation(null);
  };

  useEffect(() => {
    if (!selectedConversation) {
      setIsConversationView(false);
    }
  }, [selectedConversation]);

  const handleOpenProfile = (participant) => {
    if (!participant) return;
    setProfileParticipant(participant);
    setIsProfileModalOpen(true);
  };

  const handleCloseProfile = () => {
    setIsProfileModalOpen(false);
    setProfileParticipant(null);
  };

  const renderConversationHeader = () => {
    if (!selectedConversation) {
      return (
        <div className="flex items-center p-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-semibold text-muted-foreground">会話を選択してください</h3>
        </div>
      );
    }

    const name =
      selectedConversation.participant?.introduction?.name ||
      selectedConversation.participant?.introduction?.affiliation ||
      '名前未設定';

    return (
      <div className="flex items-center gap-3 p-3 border-b border-border bg-muted/30">
        <button
          type="button"
          onClick={handleBackToList}
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
          aria-label="戻る"
        >
          <Icon name="ArrowLeft" size={18} className="text-muted-foreground" />
        </button>
        <div>
          <button
            type="button"
            onClick={() => handleOpenProfile(selectedConversation.participant)}
            className="text-sm font-semibold text-primary inline-flex items-center gap-1 hover:text-primary/80"
            aria-label={`${name}のプロフィールを開く`}
          >
            <span className="underline underline-offset-2">{name}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="bg-card border border-border rounded-xl shadow-soft h-[600px] flex flex-col">
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        )}
        {!isLoading && (
          <div className="flex flex-1 flex-col md:flex-row">
            {/* Conversation list */}
            <div
              className={`${isConversationView ? 'hidden' : 'flex'} md:flex md:w-1/3 flex-col border-b md:border-b-0 md:border-r border-border`}
            >
              <div className="flex items-center p-3 border-b border-border bg-muted/20">
                <h3 className="text-sm font-semibold">メッセージ</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center px-4 py-8">
                    <div>
                      <p className="text-sm font-medium">メッセージがありません</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        参加者にメッセージを送信すると、ここに表示されます。
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {conversations.map((conv) => {
                      const name = conv.participant?.introduction?.name ||
                        conv.participant?.introduction?.affiliation ||
                        '名前未設定';

                      const isActive = selectedConversation?.participantId === conv.participantId;

                      return (
                        <div
                          key={conv.participantId}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleOpenConversation(conv)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleOpenConversation(conv);
                            }
                          }}
                          className={`w-full text-left p-3 transition-colors cursor-pointer ${isActive
                            ? 'bg-primary/10 border-l-4 border-primary'
                            : 'hover:bg-muted/40'
                            }`}
                        >
                          <p className="font-medium text-sm truncate">{name}</p>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {conv.lastMessage || 'メッセージなし'}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(conv.lastMessageTime).toLocaleString('ja-JP', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Chat panel */}
            <div className={`${isConversationView ? 'flex' : 'hidden'} md:flex flex-1 flex-col`}>
              <div className="border-b border-border">
                {renderConversationHeader()}
              </div>
              {selectedConversation ? (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        まだメッセージがありません
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isSent = msg.from_participant_id === currentParticipant.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-2 ${isSent
                                ? 'bg-primary text-primary-foreground rounded-br-sm'
                                : 'bg-muted rounded-bl-sm'
                                }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                              <p className={`text-[10px] mt-1 ${isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
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
                      })
                    )}
                  </div>

                  <div className="p-3 border-t border-border bg-muted/20">
                    <div className="flex gap-2 items-end w-full">
                      <div className="flex-1">
                        <Textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="メッセージを入力..."
                          rows={1}
                          className="min-h-[44px] resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                      </div>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || isSending}
                        className="h-11 px-5 flex-shrink-0"
                      >
                        {isSending ? '送信中' : '送信'}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center px-4">
                  <p className="text-sm text-muted-foreground">
                    {conversations.length === 0 ? 'メッセージがありません' : '会話を選択してください'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {isProfileModalOpen && profileParticipant && (
        <ParticipantProfileModal
          participant={profileParticipant}
          currentParticipant={currentParticipant}
          conferenceId={conferenceId}
          onClose={handleCloseProfile}
          onVisitParticipant={onVisitParticipant}
        />
      )}
    </>
  );
};

export default MessagesTab;
