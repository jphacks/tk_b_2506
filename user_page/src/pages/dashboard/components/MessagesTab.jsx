import { useEffect, useRef, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Textarea from '../../../components/ui/Textarea';
import { db, supabase } from '../../../lib/supabase';
import ParticipantProfileModal from './ParticipantProfileModal';

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
  const [hasAutoSelectedConversation, setHasAutoSelectedConversation] = useState(false);
  const [isConversationView, setIsConversationView] = useState(false);
  const [profileParticipant, setProfileParticipant] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const messagesContainerRef = useRef(null);

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
                            conference_id,
                            registered_at,
                            current_location_id,
                            current_map_region_id,
                            introduction:introductions(
                                id,
                                name,
                                affiliation,
                                research_topic,
                                interests,
                                one_liner,
                                occupation,
                                occupation_other
                            ),
                            location:locations(
                                id,
                                name,
                                floor,
                                building,
                                location_type
                            ),
                            current_map_region:map_regions!current_map_region_id(
                                id,
                                label
                            )
                        ),
                        to_participant:participants!to_participant_id(
                            id,
                            conference_id,
                            registered_at,
                            current_location_id,
                            current_map_region_id,
                            introduction:introductions(
                                id,
                                name,
                                affiliation,
                                research_topic,
                                interests,
                                one_liner,
                                occupation,
                                occupation_other
                            ),
                            location:locations(
                                id,
                                name,
                                floor,
                                building,
                                location_type
                            ),
                            current_map_region:map_regions!current_map_region_id(
                                id,
                                label
                            )
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
      setHasAutoSelectedConversation(true);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsConversationView(true);
      }
      if (typeof onConversationReady === 'function') {
        onConversationReady();
      }
    }
  }, [selectedParticipantId, conversations, selectedConversation, onConversationReady]);

  useEffect(() => {
    if (
      hasAutoSelectedConversation ||
      selectedConversation ||
      conversations.length === 0
    ) {
      return;
    }

    const latestConversation = conversations[0];
    if (latestConversation) {
      setSelectedConversation(latestConversation);
      setHasAutoSelectedConversation(true);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsConversationView(true);
      }
      if (typeof onConversationReady === 'function') {
        onConversationReady();
      }
    }
  }, [
    conversations,
    selectedConversation,
    hasAutoSelectedConversation,
    onConversationReady
  ]);

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

        // メッセージ読み込み後、スクロールを実行
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 100);
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    loadMessages();
  }, [selectedConversation, currentParticipant?.id, conferenceId]);

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    // DOM更新を待ってからスクロール
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 0);
  }, [messages]);

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
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsConversationView(true);
    }
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 150);
  };

  const handleBackToList = () => {
    setIsConversationView(false);
  };

  const handleOpenProfile = (participant) => {
    if (!participant) return;
    setProfileParticipant(participant);
    setIsProfileModalOpen(true);
  };

  const handleCloseProfile = () => {
    setIsProfileModalOpen(false);
    setProfileParticipant(null);
  };

  // アバターの色を生成
  const getAvatarColor = (name) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500'
    ];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  // 名前の最初の文字を取得
  const getInitial = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const renderAvatar = (participant, size = 'md') => {
    const name =
      participant?.introduction?.name ||
      participant?.introduction?.affiliation ||
      '?';

    const sizeClasses = {
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-12 h-12 text-base'
    };

    return (
      <div
        className={`${sizeClasses[size]} ${getAvatarColor(name)} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
      >
        {getInitial(name)}
      </div>
    );
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分`;
    if (diffHours < 24) return `${diffHours}時間`;
    if (diffDays < 7) return `${diffDays}日`;

    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden flex h-[calc(100vh-180px)] max-h-[800px]">
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        )}
        {!isLoading && (
          <>
            {/* 会話リスト - Twitter風の固定サイドバー */}
            <div className={`${isConversationView ? 'hidden' : 'flex'} md:flex w-full md:w-[380px] border-r border-border flex-col bg-background`}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h2 className="text-lg font-bold">メッセージ</h2>
              </div>

              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Icon name="MessageCircle" size={32} className="text-primary" />
                    </div>
                    <h3 className="text-base font-semibold mb-2">メッセージを送信</h3>
                    <p className="text-sm text-muted-foreground">
                      参加者と会話を始めましょう
                    </p>
                  </div>
                ) : (
                  <div>
                    {conversations.map((conv) => {
                      const name = conv.participant?.introduction?.name ||
                        conv.participant?.introduction?.affiliation ||
                        '名前未設定';
                      const isActive = selectedConversation?.participantId === conv.participantId;

                      return (
                        <button
                          key={conv.participantId}
                          type="button"
                          onClick={() => handleOpenConversation(conv)}
                          className={`w-full text-left px-4 py-3 transition-colors border-b border-border hover:bg-muted/50 ${isActive ? 'bg-muted/70' : ''
                            }`}
                        >
                          <div className="flex gap-3">
                            {renderAvatar(conv.participant, 'md')}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2 mb-1">
                                <span className="font-semibold text-sm truncate">
                                  {name}
                                </span>
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  {formatTime(conv.lastMessageTime)}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.lastMessage || 'メッセージなし'}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* メッセージ表示エリア - Twitter風 */}
            <div className={`${isConversationView ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-background`}>
              {selectedConversation ? (
                <>
                  {/* ヘッダー */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                    <button
                      type="button"
                      onClick={handleBackToList}
                      className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
                      aria-label="会話一覧に戻る"
                    >
                      <Icon name="ArrowLeft" size={18} className="text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenProfile(selectedConversation.participant)}
                      className="flex items-center gap-3 hover:bg-muted/50 rounded-full pr-4 py-1 -ml-1 transition-colors"
                    >
                      {renderAvatar(selectedConversation.participant, 'md')}
                      <div className="text-left">
                        <p className="font-semibold text-sm">
                          {selectedConversation.participant?.introduction?.name ||
                            selectedConversation.participant?.introduction?.affiliation ||
                            '名前未設定'}
                        </p>
                        {selectedConversation.participant?.introduction?.affiliation && (
                          <p className="text-xs text-muted-foreground">
                            {selectedConversation.participant.introduction.affiliation}
                          </p>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* メッセージ一覧 */}
                  <div
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto px-4 py-4"
                  >
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          <Icon name="MessageCircle" size={32} className="text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          まだメッセージがありません
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg, index) => {
                          const isSent = msg.from_participant_id === currentParticipant.id;
                          const showAvatar = !isSent && (
                            index === 0 ||
                            messages[index - 1].from_participant_id !== msg.from_participant_id
                          );

                          return (
                            <div
                              key={msg.id}
                              className={`flex gap-2 ${isSent ? 'justify-end' : 'justify-start'}`}
                            >
                              {!isSent && (
                                <div className="w-8 flex-shrink-0">
                                  {showAvatar && renderAvatar(selectedConversation.participant, 'sm')}
                                </div>
                              )}
                              <div className={`flex flex-col ${isSent ? 'items-end' : 'items-start'} max-w-[70%]`}>
                                <div
                                  className={`rounded-2xl px-4 py-2 ${isSent
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                    }`}
                                >
                                  <p className="text-sm whitespace-pre-wrap break-words">
                                    {msg.message}
                                  </p>
                                </div>
                                <span className="text-xs text-muted-foreground mt-1 px-1">
                                  {new Date(msg.created_at).toLocaleTimeString('ja-JP', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 入力エリア */}
                  <div className="px-4 py-3 border-t border-border">
                    <div className="flex gap-2 items-stretch w-full">
                      <div className="flex-1">
                        <Textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="メッセージを入力"
                          rows={1}
                          className="min-h-[44px] max-h-[120px] resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                      </div>
                      <div className="w-24 sm:w-28 flex-shrink-0">
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || isSending}
                          className="h-full min-h-[44px] w-full rounded-full"
                        >
                          <Icon name="Send" size={18} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Icon name="MessageCircle" size={40} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">メッセージを選択</h3>
                  <p className="text-sm text-muted-foreground">
                    {conversations.length === 0
                      ? '新しい会話を始めましょう'
                      : '左から会話を選択してください'}
                  </p>
                </div>
              )}
            </div>
          </>
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
