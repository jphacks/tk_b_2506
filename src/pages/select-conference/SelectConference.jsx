import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import { clearStoredConferenceId, setStoredConferenceId } from '../../constants/conference';
import useConferences from '../../hooks/useConferences';
import useParticipantProfile from '../../hooks/useParticipantProfile';

const SelectConferencePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const [selectedConferenceId, setSelectedConferenceId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState({
        isVisible: false,
        message: '',
        type: 'success'
    });

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

    const selectionReason = location?.state?.reason || null;
    const requiresSelection = location?.state?.requiresSelection ?? false;

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
    };

    const handleSubmit = async () => {
        if (!user?.id) {
            setToast({
                isVisible: true,
                message: 'ログインしてから学会を選択してください。',
                type: 'error'
            });
            return;
        }

        if (!selectedConferenceId) {
            setToast({
                isVisible: true,
                message: '学会を選択してください。',
                type: 'error'
            });
            return;
        }

        setIsSubmitting(true);

        try {
            await db.setParticipantConference({
                userId: user.id,
                conferenceId: selectedConferenceId
            });
            setStoredConferenceId(selectedConferenceId);

            const introductions = await db.getUserIntroductions(user.id, {
                conferenceId: selectedConferenceId
            });
            const hasIntroduction = introductions?.length > 0;

            navigate(
                hasIntroduction ? `/dashboard/${selectedConferenceId}` : '/self-introduction-form',
                {
                    replace: true,
                    state: hasIntroduction ? {} : { preferredConferenceId: selectedConferenceId }
                }
            );
        } catch (error) {
            console.error('Failed to store conference selection:', error);
            setToast({
                isVisible: true,
                message: error?.message || '学会の選択保存に失敗しました。',
                type: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isSubmitDisabled = isSubmitting || isConferencesLoading || !selectedConferenceId;

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
                <div className="bg-card border border-border rounded-xl shadow-soft p-6 space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold text-foreground">参加する学会を選択</h1>
                        <p className="text-sm text-muted-foreground">
                            ログイン後にアクセスするダッシュボードを決定するため、参加予定の学会を選択してください。
                        </p>
                        {(selectionReason || requiresSelection) && (
                            <div className="text-xs text-warning-foreground bg-warning/10 border border-warning/30 rounded-md px-3 py-2">
                                {selectionReason || '学会が未選択のため、ご希望の学会を選択してください。'}
                            </div>
                        )}
                    </div>

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

            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
                duration={5000}
                position="top"
            />
        </div>
    );
};

export default SelectConferencePage;
