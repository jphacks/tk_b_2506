import { useState } from 'react';

import Button from '../../../components/ui/Button';
import { cn } from '../../../utils/cn';

import ParticipantProfileModal from './ParticipantProfileModal';

const ParticipantCardSkeleton = () => (
    <div className="border border-border rounded-lg p-4 bg-muted/40 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-2" />
        <div className="h-3 w-48 bg-muted rounded mb-4" />
        <div className="h-3 w-40 bg-muted rounded" />
    </div>
);

const ParticipantList = ({
    participants,
    isLoading,
    error,
    onRetry,
    occupationFilter,
    onOccupationFilterChange
}) => {
    const [selectedParticipant, setSelectedParticipant] = useState(null);

    // occupationの選択肢を定義
    const occupationOptions = [
        { value: 'all', label: 'すべて' },
        { value: '学士課程', label: '学士課程' },
        { value: '修士課程', label: '修士課程' },
        { value: '博士課程', label: '博士課程' },
        { value: 'ポスドク', label: 'ポスドク' },
        { value: '教員', label: '教員' },
        { value: '研究者', label: '研究者' },
        { value: '企業', label: '企業' },
        { value: 'スタッフ', label: 'スタッフ' },
        { value: 'その他', label: 'その他' }
    ];

    const handleOpenProfile = (participant) => {
        setSelectedParticipant(participant);
    };

    const handleCloseProfile = () => {
        setSelectedParticipant(null);
    };

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
                    参加者情報を取得できませんでした: {error.message}
                </p>
                {onRetry && (
                    <Button variant="secondary" size="sm" onClick={onRetry}>
                        再試行
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">参加者</h2>
                    <p className="text-sm text-muted-foreground">
                        {participants?.length || 0} 名がこのカンファレンスに登録しています。
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="occupation-filter" className="text-sm text-muted-foreground">
                        職業で絞り込み:
                    </label>
                    <select
                        id="occupation-filter"
                        value={occupationFilter}
                        onChange={(e) => onOccupationFilterChange(e.target.value)}
                        className="px-3 py-1 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {occupationOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            {participants?.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                    まだ参加者がいません。QRコードを共有して参加登録を促しましょう。
                </div>
            ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                    {participants.map(participant => {
                        const introduction = participant.introduction;
                        const location = participant.location;
                        const name = introduction?.name || '匿名参加者';
                        const affiliation = introduction?.affiliation || '所属未設定';
                        const occupation = introduction?.occupation;
                        const occupationOther = introduction?.occupation_other;
                        const oneLiner = introduction?.one_liner || introduction?.research_topic || introduction?.interests;

                        return (
                            <div
                                key={participant.id}
                                className="border border-border rounded-lg p-4 bg-background hover:bg-muted/40 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-base font-semibold text-foreground">{name}</div>
                                        <div className="text-xs text-muted-foreground mt-1">{affiliation}</div>
                                        {occupation && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {occupation === 'その他' && occupationOther ? occupationOther : occupation}
                                            </div>
                                        )}
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
            )}
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
