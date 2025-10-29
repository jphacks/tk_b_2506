import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import Button from '../../../components/ui/Button';
import Textarea from '../../../components/ui/Textarea';
import { db, supabase } from '../../../lib/supabase';

const MAX_MESSAGE_LENGTH = 300;

const ProfileField = ({ label, value }) => (
    <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
            {value || '未設定'}
        </p>
    </div>
);

const formatDateTime = (value) => {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat('ja-JP', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(parsed);
};

const ParticipantProfileModal = ({ participant, currentParticipant = null, conferenceId = null, onClose }) => {
    if (!participant || typeof document === 'undefined') {
        return null;
    }

    const introduction = participant.introduction || {};
    const location = participant.location || null;

    const occupation =
        introduction.occupation === 'その他'
            ? introduction.occupation_other || 'その他（詳細未設定）'
            : introduction.occupation || null;

    const locationMeta = location
        ? [location.building, location.floor].filter(Boolean).join(' / ') || null
        : null;

    const locationDisplay = location
        ? [location.name, locationMeta].filter(Boolean).join(' - ')
        : null;

    const registeredAt = formatDateTime(participant.registered_at);

    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [hasSent, setHasSent] = useState(false);
    const [feedback, setFeedback] = useState({ type: null, text: '' });

    const effectiveConferenceId = useMemo(
        () => conferenceId ?? participant.conference_id ?? currentParticipant?.conference_id ?? null,
        [conferenceId, participant?.conference_id, currentParticipant?.conference_id]
    );

    const fromParticipantId = currentParticipant?.id ?? null;
    const toParticipantId = participant?.id ?? null;
    const isSelf = fromParticipantId && toParticipantId && fromParticipantId === toParticipantId;
    const canSendRequest = Boolean(effectiveConferenceId && fromParticipantId && toParticipantId && !isSelf);

    useEffect(() => {
        setMessage('');
        setSending(false);
        setHasSent(false);
        setFeedback({ type: null, text: '' });
    }, [participant?.id]);

    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose?.();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const handleSendRequest = async () => {
        if (!canSendRequest || sending) {
            return;
        }

        const trimmed = message.trim();
        if (!trimmed) {
            setFeedback({
                type: 'error',
                text: 'メッセージを入力してください。'
            });
            return;
        }

        setSending(true);
        setFeedback({ type: null, text: '' });

        try {
            console.log('[ParticipantProfileModal] ミートリクエストを送信中:', {
                conferenceId: effectiveConferenceId,
                fromParticipantId,
                toParticipantId,
                message: trimmed
            });

            const result = await db.createMeetRequest({
                conferenceId: effectiveConferenceId,
                fromParticipantId,
                toParticipantId,
                message: trimmed
            });

            console.log('[ParticipantProfileModal] ミートリクエスト送信成功:', result);

            // LINE通知を送信（受信者のLINEユーザーIDがある場合のみ）
            try {
                console.log('[ParticipantProfileModal] participant data:', participant);
                console.log('[ParticipantProfileModal] participant.line_user_id:', participant?.line_user_id);

                if (participant?.line_user_id) {
                    const senderName = currentParticipant?.introduction?.name ||
                        currentParticipant?.introduction?.affiliation ||
                        '他の参加者';

                    const messageText = `送信者: ${senderName}\nメッセージ: ${trimmed || 'メッセージをご確認ください。'}`;

                    console.log('[ParticipantProfileModal] Sending LINE notification:', {
                        userId: participant.line_user_id,
                        message: messageText,
                        type: 'meet_request'
                    });

                    // Supabaseセッションを取得して認証ヘッダーに使用
                    const { data: { session } } = await supabase.auth.getSession();
                    const authToken = session?.access_token;

                    const lineResponse = await fetch('https://cqudhplophskbgzepoti.supabase.co/functions/v1/send-line-notification', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify({
                            userId: participant.line_user_id,
                            message: messageText,
                            type: 'meet_request'
                        })
                    });

                    const lineResult = await lineResponse.json();
                    console.log('[ParticipantProfileModal] LINE通知送信結果:', lineResult);
                } else {
                    console.log('[ParticipantProfileModal] LINE通知スキップ: line_user_idが設定されていません');
                }
            } catch (lineError) {
                console.error('[ParticipantProfileModal] LINE通知送信失敗:', lineError);
                // LINE通知の失敗はユーザーに表示しない
            }

            setHasSent(true);
            setFeedback({
                type: 'success',
                text: 'メッセージを送信しました。相手からの返答をお待ちください。'
            });
        } catch (error) {
            console.error('[ParticipantProfileModal] Failed to create meet request:', error);
            setFeedback({
                type: 'error',
                text: error?.message || 'メッセージの送信に失敗しました。時間をおいて再度お試しください。'
            });
        } finally {
            setSending(false);
        }
    };

    const helperText = useMemo(() => {
        if (canSendRequest) {
            return '待ち合わせの希望時間や場所を具体的に書き添えてください。';
        }
        if (isSelf) {
            return '自分自身にはメッセージを送信できません。';
        }
        if (!fromParticipantId) {
            return 'まずは学会への参加登録と自己紹介の作成を完了してください。';
        }
        if (!toParticipantId) {
            return 'この参加者の情報が不足しているため、メッセージを送信できません。';
        }
        return '現在、メッセージの送信ができません。';
    }, [canSendRequest, isSelf, fromParticipantId, toParticipantId]);

    const handleMessageChange = (event) => {
        const value = event.target.value.slice(0, MAX_MESSAGE_LENGTH);
        setMessage(value);
        if (feedback.type) {
            setFeedback({ type: null, text: '' });
        }
        if (hasSent) {
            setHasSent(false);
        }
    };

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
                onMouseDown={onClose}
                aria-hidden="true"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 sm:px-6">
                <div
                    className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-large overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-label="参加者のプロフィール"
                    onMouseDown={(event) => event.stopPropagation()}
                >
                    <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">参加者プロフィール</p>
                            <h2 className="text-xl font-semibold text-foreground">
                                {introduction.name || '匿名参加者'}
                            </h2>
                            {introduction.affiliation && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    {introduction.affiliation}
                                </p>
                            )}
                        </div>
                    </header>

                    <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                        {introduction.one_liner && (
                            <div className="rounded-xl border border-border/60 bg-muted/50 px-4 py-3 text-sm text-foreground">
                                {introduction.one_liner}
                            </div>
                        )}

                        <div className="grid gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ProfileField label="所属" value={introduction.affiliation} />
                                <ProfileField label="職業" value={occupation} />
                            </div>
                            <ProfileField label="研究トピック" value={introduction.research_topic} />
                            <ProfileField label="興味・関心" value={introduction.interests} />
                            <ProfileField label="現在地" value={locationDisplay} />
                            <ProfileField label="登録日時" value={registeredAt} />
                        </div>
                    </div>

                    <footer className="px-6 py-3 border-t border-border bg-muted/40">
                        {canSendRequest ? (
                            <div className="space-y-1">
                                <Textarea
                                    label="ミートリクエストを送信"
                                    placeholder="例: セッション後に5Fロビーでお話ししませんか？"
                                    value={message}
                                    onChange={handleMessageChange}
                                    rows={1}
                                    maxLength={MAX_MESSAGE_LENGTH}
                                    description={`最大${MAX_MESSAGE_LENGTH}文字（${message.length}/${MAX_MESSAGE_LENGTH}）`}
                                    error={feedback.type === 'error' ? feedback.text : undefined}
                                    disabled={sending}
                                    className="min-h-0 h-9 text-sm leading-tight"
                                />
                                {feedback.type === 'success' && (
                                    <p className="text-xs text-primary text-left">
                                        {feedback.text}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground text-left">
                                    {helperText}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Button
                                        variant="secondary"
                                        onClick={onClose}
                                        fullWidth
                                        disabled={sending}
                                    >
                                        閉じる
                                    </Button>
                                    <Button
                                        onClick={handleSendRequest}
                                        loading={sending}
                                        disabled={sending || !message.trim()}
                                        iconName="Send"
                                        iconPosition="right"
                                        fullWidth
                                    >
                                        {hasSent ? 'もう一度送信' : 'メッセージを送信'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-xs text-muted-foreground text-left">
                                    {helperText}
                                </p>
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    onClick={onClose}
                                >
                                    閉じる
                                </Button>
                            </div>
                        )}
                    </footer>
                </div>
            </div>
        </>,
        document.body
    );
};

export default ParticipantProfileModal;
