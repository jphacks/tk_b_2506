import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import Button from '../../../components/ui/Button';

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

const ParticipantProfileModal = ({ participant, onClose }) => {
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
                            <ProfileField label="所属" value={introduction.affiliation} />
                            <ProfileField label="職業" value={occupation} />
                            <ProfileField label="研究トピック" value={introduction.research_topic} />
                            <ProfileField label="興味・関心" value={introduction.interests} />
                            <ProfileField label="現在地" value={locationDisplay} />
                            <ProfileField label="登録日時" value={registeredAt} />
                        </div>
                    </div>

                    <footer className="px-6 py-4 border-t border-border bg-muted/40">
                        <Button
                            variant="secondary"
                            fullWidth
                            onClick={onClose}
                        >
                            閉じる
                        </Button>
                    </footer>
                </div>
            </div>
        </>,
        document.body
    );
};

export default ParticipantProfileModal;
