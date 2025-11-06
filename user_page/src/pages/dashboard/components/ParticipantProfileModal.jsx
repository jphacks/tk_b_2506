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

const ParticipantProfileModal = ({
    participant,
    currentParticipant = null,
    conferenceId = null,
    onClose,
    onVisitParticipant = () => { }
}) => {
    if (!participant || typeof document === 'undefined') {
        return null;
    }

    const introduction = participant.introduction || {};
    const location = participant.location || null;
    const mapRegion = participant.current_map_region || null;

    const occupation =
        introduction.occupation === 'その他'
            ? introduction.occupation_other || 'その他（詳細未設定）'
            : introduction.occupation || null;

    const locationDisplay = location
        ? [location.name, mapRegion?.label].filter(Boolean).join(' - ')
        : null;

    const registeredAt = formatDateTime(participant.registered_at);

    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [hasSent, setHasSent] = useState(false);
    const [feedback, setFeedback] = useState({ type: null, text: '' });
    const [hasMoved, setHasMoved] = useState(false);

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
        setHasMoved(false);
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
            const result = await db.createMeetRequest({
                conferenceId: effectiveConferenceId,
                fromParticipantId,
                toParticipantId,
                message: trimmed
            });

            // LINE通知を送信（受信者のLINEユーザーIDがある場合のみ）
            try {
                if (participant?.line_user_id) {
                    const senderName = currentParticipant?.introduction?.name ||
                        currentParticipant?.introduction?.affiliation ||
                        '他の参加者';

                    const messageText = `送信者: ${senderName}\nメッセージ: ${trimmed || 'メッセージをご確認ください。'}`;

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
                            userId: participant.line_user_id,
                            message: messageText,
                            type: 'meet_request'
                        })
                    });
                }
            } catch (lineError) {
                console.error('Failed to send LINE notification:', lineError);
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
            return 'メッセージ送信時は、待ち合わせの希望時間や場所を具体的に書き添えてください。';
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

    const handleVisitParticipant = async () => {
        try {
            await onVisitParticipant?.(participant);
            setHasMoved(true);
        } catch (error) {
            console.error('[ParticipantProfileModal] Failed to visit participant location:', error);
        }
    };

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
                onMouseDown={onClose}
                aria-hidden="true"
            />
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center px-4 py-8 sm:px-6">
                    <div
                        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-large overflow-hidden flex flex-col max-h-[90vh]"
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

                        <div className="px-6 py-5 space-y-6 flex-1 overflow-y-auto">
                            <div className="space-y-5">
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

                            {canSendRequest ? (
                                <div className="space-y-4">
                                    <Textarea
                                        label="メッセージを送信"
                                        placeholder="例: セッション後に5Fロビーでお話ししませんか？"
                                        value={message}
                                        onChange={handleMessageChange}
                                        rows={3}
                                        maxLength={MAX_MESSAGE_LENGTH}
                                        description={`最大${MAX_MESSAGE_LENGTH}文字（${message.length}/${MAX_MESSAGE_LENGTH}）`}
                                        error={feedback.type === 'error' ? feedback.text : undefined}
                                        disabled={sending}
                                        className="min-h-[72px] text-sm leading-relaxed"
                                    />
                                    {feedback.type === 'success' && (
                                        <p className="text-xs text-primary text-left">
                                            {feedback.text}
                                        </p>
                                    )}
                                    <div className="space-y-3">
                                        <Button
                                            onClick={handleSendRequest}
                                            loading={sending}
                                            disabled={sending || !message.trim()}
                                            iconName="Send"
                                            iconPosition="left"
                                            fullWidth
                                        >
                                            {hasSent ? 'もう一度送信' : 'メッセージを送信'}
                                        </Button>
                                        <Button
                                            variant={hasMoved ? 'danger' : 'default'}
                                            className="w-full h-12 text-base"
                                            iconName="MapPin"
                                            onClick={handleVisitParticipant}
                                            fullWidth
                                            disabled={hasMoved}
                                        >
                                            {hasMoved ? '移動しました' : '場所へ移動'}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            className="w-full h-12 text-base"
                                            onClick={onClose}
                                            disabled={sending}
                                            fullWidth
                                        >
                                            閉じる
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-left">
                                        {helperText}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-xs text-muted-foreground text-left">
                                        {helperText}
                                    </p>
                                    <div className="space-y-3">
                                        <Button
                                            variant={hasMoved ? 'danger' : 'default'}
                                            className="w-full h-12 text-base"
                                            iconName="MapPin"
                                            onClick={handleVisitParticipant}
                                            fullWidth
                                            disabled={hasMoved}
                                        >
                                            {hasMoved ? '移動しました' : '場所へ移動'}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            className="w-full h-12 text-base"
                                            onClick={onClose}
                                            fullWidth
                                        >
                                            閉じる
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

export default ParticipantProfileModal;
