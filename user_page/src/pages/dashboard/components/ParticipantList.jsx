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

/**
 * 統合版 ParticipantList
 *
 * 優先度:
 *  1) props.participants が配列ならそれを使用
 *  2) locationId があれば useParticipantsByLocation
 *  3) conferenceId があれば useParticipants
 *
 * 追加:
 *  - 職業フィルタ UI (occupationFilter / onOccupationFilterChange)
 *  - 実際のフィルタ処理 (occupationFilter が 'all' 以外なら occupation 一致で絞り込み)
 */
const ParticipantList = ({
    // データ供給系
    participants: participantsProp,
    locationId,
    mapRegionId,
    conferenceId,
    currentParticipant = null,

    // 状態/ハンドラ
    isLoading: isLoadingProp,
    error: errorProp,
    onRetry,

    // フィルタUI
    occupationFilter = 'all',
    onOccupationFilterChange,
}) => {
    const [selectedParticipant, setSelectedParticipant] = useState(null);

    // Fetch hooks (有効時のみ)
    const confQuery = useParticipants(conferenceId, { enabled: Boolean(conferenceId) });
    const locQuery = useParticipantsByLocation(locationId, { enabled: Boolean(locationId) });

    // データ選択ロジック
    const participantsRaw = Array.isArray(participantsProp)
        ? participantsProp
        : locationId
            ? (locQuery.data ?? [])
            : conferenceId
                ? (confQuery.data ?? [])
                : [];

    const isLoading = Boolean(isLoadingProp) || locQuery.isLoading || confQuery.isLoading;
    const error = errorProp || locQuery.error || confQuery.error;

    // mapRegionIdでフィルタリング
    let list = Array.isArray(participantsRaw) ? participantsRaw : [];
    if (mapRegionId) {
        list = list.filter(p => p.current_map_region_id === mapRegionId);
    }

    // occupation 選択肢（必要な場合のみ表示）
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
        { value: 'その他', label: 'その他' },
    ];

    // フィルタ処理
    const filtered = list.filter((p) => {
        // 職業フィルタが 'all' なら全通し
        if (occupationFilter === 'all') return true;

        const occ = p?.introduction?.occupation;
        const occOther = p?.introduction?.occupation_other;

        // 'その他' の場合は occupation==='その他' を優先、必要に応じて occupation_other があるものも許容
        if (occupationFilter === 'その他') {
            return occ === 'その他' || Boolean(occOther);
        }
        return occ === occupationFilter;
    });

    useEffect(() => {
        // デバッグログ（必要なときだけ）
        // console.log('[ParticipantList][debug] conferenceId ->', conferenceId);
        // console.log('[ParticipantList][debug] locationId ->', locationId);
        // console.log('[ParticipantList][debug] all participants ->', list.length);
        // if (error) console.warn('[ParticipantList][debug] error ->', error);
    }, [conferenceId, locationId, list.length, error]);

    const handleOpenProfile = (participant) => setSelectedParticipant(participant);
    const handleCloseProfile = () => setSelectedParticipant(null);

    // --- Rendering ---

    if (isLoading) {
        return (
            <div className="bg-card border border-border rounded-xl shadow-soft p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">参加者</h2>
                </div>
                <div className="space-y-3">
                    {[...Array(4).keys()].map((key) => (
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
                    参加者情報を取得できませんでした:{' '}
                    {error?.message || (typeof error === 'string' ? error : JSON.stringify(error))}
                </p>
                {onRetry && (
                    <Button variant="secondary" size="sm" onClick={onRetry}>
                        再試行
                    </Button>
                )}
            </div>
        );
    }

    // 空表示（フィルタ文脈・ロケーション文脈で文言を分岐）
    if (filtered.length === 0) {
        const showFilterUI = typeof onOccupationFilterChange === 'function';
        return (
            <div className="bg-card border border-border rounded-xl shadow-soft p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">参加者</h2>
                    {showFilterUI && (
                        <div className="flex items-center gap-2">
                            <label
                                htmlFor="occupation-filter"
                                className="text-sm text-muted-foreground whitespace-nowrap"
                            >
                                職業で絞り込み:
                            </label>
                            <select
                                id="occupation-filter"
                                value={occupationFilter}
                                onChange={(e) => onOccupationFilterChange(e.target.value)}
                                className="px-3 py-1 pr-8 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-[120px]"
                            >
                                {occupationOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <div className="p-4 text-sm text-muted-foreground">
                    {showFilterUI && occupationFilter !== 'all'
                        ? '選択した職業の参加者がいません。'
                        : locationId
                            ? 'この机には参加者がいません。'
                            : 'まだ参加者がいません。QRコードを共有して参加登録を促しましょう。'}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">参加者</h2>
                    <p className="text-sm text-muted-foreground">
                        {filtered.length} 名が表示されています。
                    </p>
                </div>

                {/* 職業フィルタ（コールバックが提供されている時のみ表示） */}
                {typeof onOccupationFilterChange === 'function' && (
                    <div className="flex items-center gap-2">
                        <label
                            htmlFor="occupation-filter"
                            className="text-sm text-muted-foreground whitespace-nowrap"
                        >
                            職業で絞り込み:
                        </label>
                        <select
                            id="occupation-filter"
                            value={occupationFilter}
                            onChange={(e) => onOccupationFilterChange(e.target.value)}
                            className="px-3 py-1 pr-8 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-[120px]"
                        >
                            {occupationOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filtered.map((participant) => {
                    const intro = participant?.introduction ?? {};
                    const location = participant?.location;

                    const name =
                        intro?.name || participant?.display_name || '匿名参加者';
                    const affiliation = intro?.affiliation || participant?.affiliation || '所属未設定';
                    const occupation = intro?.occupation;
                    const occupationOther = intro?.occupation_other;
                    const oneLiner =
                        intro?.one_liner || intro?.research_topic || intro?.interests || '';

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
                                <div className="text-sm text-muted-foreground mt-3">{oneLiner}</div>
                            )}
                        </div>
                    );
                })}
            </div>

            {selectedParticipant && (
                <ParticipantProfileModal
                    participant={selectedParticipant}
                    currentParticipant={currentParticipant}
                    conferenceId={conferenceId}
                    onClose={handleCloseProfile}
                />
            )}
        </div>
    );
};

export default ParticipantList;
