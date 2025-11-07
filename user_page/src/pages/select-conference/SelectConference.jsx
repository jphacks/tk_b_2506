import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { clearStoredConferenceId, setStoredConferenceId } from '../../constants/conference';
import { useAuth } from '../../contexts/AuthContext';
import useConferences from '../../hooks/useConferences';
import useParticipantProfile from '../../hooks/useParticipantProfile';
import { db } from '../../lib/supabase';

const SelectConferencePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [selectedConferenceId, setSelectedConferenceId] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState('info');

    const showStatusMessage = (message, type = 'info') => {
        if (!message) {
            setStatusMessage('');
            setStatusType('info');
            return;
        }
        setStatusMessage(message);
        setStatusType(type);
    };

    useEffect(() => {
        if (!statusMessage) {
            return;
        }
        const timer = setTimeout(() => setStatusMessage(''), 5000);
        return () => clearTimeout(timer);
    }, [statusMessage]);

    const getStatusClassName = (type) => {
        switch (type) {
            case 'success':
                return 'border-primary/30 bg-primary/5 text-primary';
            case 'error':
                return 'border-error/30 bg-error/10 text-error';
            case 'warning':
                return 'border-amber-300 bg-amber-50 text-amber-900';
            default:
                return 'border-border bg-muted/40 text-muted-foreground';
        }
    };

    const {
        data: conferences = [],
        isLoading: isConferencesLoading,
        isError: isConferencesError,
        error: conferencesError
    } = useConferences();

    const {
        data: participantProfile,
        isLoading: isParticipantLoading
    } = useParticipantProfile(user?.id);

    useEffect(() => {
        if (!user && !isParticipantLoading) {
            navigate('/auth', { replace: true });
        }
    }, [user, isParticipantLoading, navigate]);

    useEffect(() => {
        if (!conferences?.length) {
            return;
        }

        const hasValidSelection = selectedConferenceId &&
            conferences.some(conf => conf?.id === selectedConferenceId);

        if (hasValidSelection) {
            return;
        }

        const participantConferenceId = participantProfile?.conference_id || '';

        if (participantConferenceId &&
            conferences.some(conf => conf?.id === participantConferenceId)) {
            setSelectedConferenceId(participantConferenceId);
            return;
        }

        clearStoredConferenceId();

        if (conferences[0]?.id) {
            setSelectedConferenceId(conferences[0].id);
        }
    }, [conferences, participantProfile, selectedConferenceId]);

    const conferenceOptions = useMemo(() => {
        return conferences?.map(conf => {
            const details = [
                conf?.start_date && conf?.end_date
                    ? `${conf.start_date} ~ ${conf.end_date}`
                    : null,
                conf?.location || null
            ].filter(Boolean).join(' / ');

            return {
                value: conf?.id,
                label: conf?.name,
                description: details || undefined
            };
        }) ?? [];
    }, [conferences]);

    const handleConferenceChange = (value) => {
        setSelectedConferenceId(value);
        setPassword(''); // パスワードをリセット
    };

    // 選択された学会の情報を取得
    const selectedConference = useMemo(() => {
        if (!selectedConferenceId || !conferences?.length) {
            return null;
        }
        return conferences.find(conf => conf?.id === selectedConferenceId) || null;
    }, [selectedConferenceId, conferences]);

    // 選択された学会がパスワード必須かどうか
    const requiresPassword = useMemo(() => {
        return selectedConference?.join_password && selectedConference.join_password.trim() !== '';
    }, [selectedConference]);

    const handleSubmit = async () => {
        if (!user?.id) {
            showStatusMessage('ログインしてから学会を選択してください。', 'error');
            return;
        }

        if (!selectedConferenceId) {
            showStatusMessage('学会を選択してください。', 'error');
            return;
        }

        // パスワードが必須の場合は入力チェック
        if (requiresPassword && !password.trim()) {
            showStatusMessage('この学会への参加にはパスワードが必要です。', 'error');
            return;
        }

        setIsSubmitting(true);
        setStatusMessage('');

        try {
            const introductions = await db.getUserIntroductions(user.id, {
                conferenceId: selectedConferenceId
            });
            const latestIntroduction = introductions?.[0] || null;

            // パスワード検証付きで学会に参加登録
            await db.joinConferenceWithPassword({
                userId: user.id,
                conferenceId: selectedConferenceId,
                password: password.trim(),
                introductionId: latestIntroduction ? latestIntroduction.id : undefined
            });

            setStoredConferenceId(selectedConferenceId);

            showStatusMessage(`${selectedConference?.name || '学会'}への参加登録が完了しました！`, 'success');

            const hasIntroduction = Boolean(latestIntroduction);

            // 少し待ってから遷移
            setTimeout(() => {
                navigate(
                    hasIntroduction ? `/dashboard/${selectedConferenceId}` : '/self-introduction-form',
                    {
                        replace: true,
                        state: hasIntroduction ? {} : { preferredConferenceId: selectedConferenceId }
                    }
                );
            }, 1000);

        } catch (error) {
            console.error('Failed to join conference:', error);
            showStatusMessage(error?.message || '学会への参加登録に失敗しました。', 'error');
            setIsSubmitting(false);
        }
    };

    const isSubmitDisabled = isSubmitting || isConferencesLoading || !selectedConferenceId || (requiresPassword && !password.trim());

    return (
        <div className="min-h-screen bg-background">
            <Header notifications={[]} onNotificationClick={() => { }} showSettings={false} />
            <main className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
                <div className="bg-card border border-border rounded-xl shadow-soft p-6 space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold text-foreground">参加する学会を選択</h1>
                        <p className="text-sm text-muted-foreground">
                            ログイン後にアクセスするダッシュボードを決定するため、参加予定の学会を選択してください。
                        </p>
                    </div>

                    {statusMessage && (
                        <div className={`px-4 py-3 rounded-lg border text-sm ${getStatusClassName(statusType)}`}>
                            {statusMessage}
                        </div>
                    )}

                    <Select
                        label="参加する学会"
                        name="conference"
                        value={selectedConferenceId}
                        onChange={handleConferenceChange}
                        options={conferenceOptions}
                        placeholder={
                            isConferencesLoading
                                ? '学会情報を読み込み中...'
                                : '学会を選択してください'
                        }
                        required
                        searchable
                        loading={isConferencesLoading}
                        disabled={isConferencesLoading || !conferenceOptions.length}
                        error={
                            isConferencesError
                                ? (conferencesError?.message || '学会リストの取得に失敗しました')
                                : undefined
                        }
                        description={
                            isConferencesError
                                ? undefined
                                : '参加予定の学会を選択してください。後から変更することも可能です。'
                        }
                    />

                    {/* パスワード入力フィールド（パスワードが設定されている学会の場合のみ表示） */}
                    {requiresPassword && (
                        <div className="space-y-2">
                            <Input
                                label="学会参加パスワード"
                                name="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="学会主催者から共有されたパスワードを入力"
                                required
                                disabled={isSubmitting}
                            />
                            <p className="text-xs text-muted-foreground">
                                この学会への参加にはパスワードが必要です。主催者から共有されたパスワードを入力してください。
                            </p>
                        </div>
                    )}

                    {/* パスワード不要の場合の説明 */}
                    {selectedConferenceId && !requiresPassword && (
                        <div className="text-xs text-muted-foreground bg-secondary/20 border border-border rounded-md px-3 py-2">
                            この学会への参加にパスワードは不要です。
                        </div>
                    )}

                    <Button
                        variant="default"
                        size="lg"
                        fullWidth
                        onClick={handleSubmit}
                        loading={isSubmitting}
                        disabled={isSubmitDisabled}
                        iconName="Check"
                    >
                        選択を確定する
                    </Button>
                </div>
            </main>
        </div>
    );
};

export default SelectConferencePage;
