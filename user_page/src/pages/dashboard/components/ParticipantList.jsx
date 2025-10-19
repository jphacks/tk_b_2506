import { useEffect, useState } from 'react';

import Button from '../../../components/ui/Button';
import { cn } from '../../../utils/cn';

import useParticipants from 'src/hooks/useParticipants';
import useParticipantsByLocation from 'src/hooks/useParticipantsByLocation';
import ParticipantProfileModal from './ParticipantProfileModal';

const ParticipantCardSkeleton = () => (
    <div className="border border-border rounded-lg p-4 bg-muted/40 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-2" />
        <div className="h-3 w-48 bg-muted rounded mb-4" />
        <div className="h-3 w-40 bg-muted rounded" />
    </div>
);

const ParticipantList = ({
    participants: participantsProp,
    locationId,
    conferenceId,
    isLoading: isLoadingProp,
    error: errorProp,
    onRetry
}) => {
    const [selectedParticipant, setSelectedParticipant] = useState(null);

    const confQuery = useParticipants(conferenceId, { enabled: Boolean(conferenceId) });
    const locQuery = useParticipantsByLocation(locationId, { enabled: Boolean(locationId) });

    // 優先順位: 明示的な participants prop > location query > conference query
    const participantsRaw = Array.isArray(participantsProp)
        ? participantsProp
        : (locationId ? (locQuery.data ?? []) : (conferenceId ? (confQuery.data ?? []) : []));

    const isLoading = Boolean(isLoadingProp) || locQuery.isLoading || confQuery.isLoading;
    const error = errorProp || locQuery.error || confQuery.error;

    const list = Array.isArray(participantsRaw) ? participantsRaw : [];

    useEffect(() => {
        console.log('[ParticipantList][debug] conferenceId ->', conferenceId);
        console.log('[ParticipantList][debug] locationId ->', locationId);
        console.log('[ParticipantList][debug] all participants ->', list.length);
        if (error) console.warn('[ParticipantList][debug] error ->', error);
    }, [conferenceId, locationId, list.length, error]);

    const handleOpenProfile = (participant) => setSelectedParticipant(participant);
    const handleCloseProfile = () => setSelectedParticipant(null);

    if (isLoading) {
        return (
            <div className="bg-card border border-border rounded-xl shadow-soft p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">参加者</h2>
                </div>
                <div className="space-y-3">
                    {[...Array(4).keys()].map(key => (
                        <ParticipantCardSkeleton key={key} />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-card border border-border rounded-xl shadow-soft p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">参加者</h2>
                </div>
                <p className="text-sm text-error mb-4">
                    参加者情報を取得できませんでした: {error.message || JSON.stringify(error)}
                </p>
                {onRetry && (
                    <Button variant="secondary" size="sm" onClick={onRetry}>
                        再試行
                    </Button>
                )}
            </div>
        );
    }

    if (list.length === 0) {
        return (
            <div className="p-4 text-sm text-muted-foreground">
                この机には参加者がいません。
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">参加者</h2>
                    <p className="text-sm text-muted-foreground">
                        {list.length} 名が表示されています。
                    </p>
                </div>
            </div>
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {list.map(participant => {
                    const introduction = participant.introduction ?? {};
                    const location = participant.location;
                    const name = introduction?.name || participant.display_name || '匿名参加者';
                    const affiliation = participant.affiliation || introduction?.affiliation || '所属未設定';
                    const oneLiner = introduction?.one_liner || introduction?.research_topic || introduction?.interests || '';

                    return (
                        <div
                            key={participant.id}
                            className="border border-border rounded-lg p-4 bg-background hover:bg-muted/40 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-base font-semibold text-foreground">{name}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{affiliation}</div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span
                                        className={cn(
                                            'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border',
                                            location
                                                ? 'bg-primary/10 text-primary border-primary/40'
                                                : 'bg-muted text-muted-foreground border-border'
                                        )}
                                    >
                                        {location ? location.name : '位置未登録'}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="xs"
                                        iconName="UserRoundSearch"
                                        iconPosition="left"
                                        onClick={() => handleOpenProfile(participant)}
                                        className="text-xs"
                                    >
                                        詳細を見る
                                    </Button>
                                </div>
                            </div>
                            {oneLiner && (
                                <div className="text-sm text-muted-foreground mt-3">
                                    {oneLiner}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {selectedParticipant && (
                <ParticipantProfileModal
                    participant={selectedParticipant}
                    onClose={handleCloseProfile}
                />
            )}
        </div>
    );
};

export default ParticipantList;
