import Button from 'components/ui/Button';
import { useEffect, useMemo, useState } from 'react';
import { cn } from 'utils/cn';
import ParticipantList from './ParticipantList';
import ParticipantProfileModal from './ParticipantProfileModal';

const DEFAULT_MAP_WIDTH = 0.23;
const DEFAULT_MAP_HEIGHT = 0.30;
const MAP_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

const VenueMap = ({
    conferenceId,
    locations = [],
    currentLocation = null,
    isLoading = false,
    error = null,
    onRetry = null
}) => {
    const [mapSource, setMapSource] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [selectedParticipant, setSelectedParticipant] = useState(null);

    // detect available map image (conference-specific then fallback to /maps/map.<ext>)
    useEffect(() => {
        let cancelled = false;
        setMapSource(null);
        if (!conferenceId) return;

        const tryLoad = (src) =>
            new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(src);
                img.onerror = () => reject(new Error('not found'));
                img.src = src;
            });

        (async () => {
            const candidates = [];
            for (const ext of MAP_EXTENSIONS) {
                candidates.push(`/maps/${conferenceId}.${ext}`);
            }
            for (const ext of MAP_EXTENSIONS) {
                candidates.push(`/maps/map.${ext}`);
            }

            for (const c of candidates) {
                if (cancelled) return;
                try {
                    await tryLoad(c);
                    if (cancelled) return;
                    setMapSource(c);
                    return;
                } catch {
                    // try next
                }
            }
            if (!cancelled) setMapSource(null);
        })();

        return () => {
            cancelled = true;
        };
    }, [conferenceId]);

    // normalize incoming location objects: accept map_x/map_y or x/y/left/top etc.
    const normalizedLocations = useMemo(() => {
        if (!Array.isArray(locations)) return [];

        const getNum = (obj, ...keys) => {
            for (const k of keys) {
                if (obj == null) continue;
                const v = obj[k];
                if (v == null) continue;
                const n = Number(v);
                if (Number.isFinite(n)) return n;
            }
            return null;
        };

        const processed = locations.map((l) => {
            const map_x = getNum(l, 'map_x', 'x', 'left');
            const map_y = getNum(l, 'map_y', 'y', 'top');
            const map_width = getNum(l, 'map_width', 'width', 'w') ?? null;
            const map_height = getNum(l, 'map_height', 'height', 'h') ?? null;
            const normalized = {
                ...l,
                map_x: Number.isFinite(map_x) ? map_x : null,
                map_y: Number.isFinite(map_y) ? map_y : null,
                map_width: Number.isFinite(map_width) ? map_width : null,
                map_height: Number.isFinite(map_height) ? map_height : null
            };
            const willFilter = !(typeof normalized.map_x === 'number' && typeof normalized.map_y === 'number');
            return { original: l, normalized, willFilter };
        });

        // debug log items
        try {
            console.log('[VenueMap][normalize] processing locations:', locations.length);
            processed.forEach((p, idx) => {
                console.log(`[VenueMap][normalize] item ${idx}:`, {
                    original: p.original,
                    normalized: { map_x: p.normalized.map_x, map_y: p.normalized.map_y },
                    willFilter: p.willFilter
                });
            });
        } catch (e) {
            /* ignore stringify errors */
        }

        const filtered = processed
            .filter((p) => !p.willFilter)
            .map((p) => p.normalized);

        // log filtered out ones for debugging
        processed.forEach((p) => {
            if (p.willFilter) {
                console.log('[VenueMap][normalize] filtered out:', p.original.name || p.original.id, {
                    map_x: p.normalized.map_x,
                    map_y: p.normalized.map_y
                });
            }
        });

        console.log('[VenueMap][normalize] final count:', filtered.length);
        return filtered;
    }, [locations]);

    // export normalized array for quick console inspection
    useEffect(() => {
        try {
            window.__normalizedLocations = normalizedLocations;
            console.log('[VenueMap][debug] exported window.__normalizedLocations ->', normalizedLocations.length);
            setTimeout(() => {
                const desks = Array.from(document.querySelectorAll('button.venue-desk'));
                console.log('[VenueMap][debug] DOM venue-desk count ->', desks.length);
                console.log('[VenueMap][debug] venue-desk rects ->', desks.map((d) => d.getBoundingClientRect()));
            }, 300);
        } catch (e) {
            console.warn('[VenueMap][debug] export failed', e);
        }
        return () => {
            try {
                delete window.__normalizedLocations;
            } catch (e) { }
        };
    }, [normalizedLocations]);

    const handleOpenProfile = (participant) => {
        setSelectedParticipant(participant);
    };

    const handleCloseProfile = () => {
        setSelectedParticipant(null);
    };

    return (
        <div className="bg-card border border-border rounded-xl shadow-soft p-6 flex flex-col gap-6">
            <div>
                <h2 className="text-lg font-semibold text-foreground">会場マップ</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    QRスキャンで更新された現在地を元にマップ上で位置を確認できます。
                </p>
                {error && (
                    <div className="mt-3 text-sm text-error flex flex-col gap-2">
                        会場情報を取得できませんでした: {error.message}
                        {onRetry && (
                            <div>
                                <Button variant="secondary" size="xs" onClick={onRetry}>
                                    再試行
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div
                className="relative w-full bg-muted border border-border rounded-lg overflow-hidden aspect-video"
                style={{ position: 'relative' }}
            >
                {mapSource ? (
                    <img
                        src={mapSource}
                        alt={`Conference ${conferenceId} map`}
                        className="w-full h-full object-cover absolute inset-0"
                        onError={() => {
                            /* handled by detection effect */
                        }}
                        style={{ pointerEvents: 'none', zIndex: 0 }}
                        aria-hidden="true"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center px-6 text-sm text-muted-foreground">
                        利用可能な会場マップが見つかりませんでした。管理者にお問い合わせください。
                    </div>
                )}

                {isLoading && (
                    <div
                        className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center"
                        style={{ zIndex: 20 }}
                    >
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-6 w-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                            <span className="text-xs text-muted-foreground">会場情報を読み込み中...</span>
                        </div>
                    </div>
                )}

                {/* desk markers (map_x/map_y are left/top fractions 0..1, stored as left/top basis) */}
                {normalizedLocations.map((loc) => {
                    const left = `${(loc.map_x * 100).toFixed(4)}%`;
                    const top = `${(loc.map_y * 100).toFixed(4)}%`;
                    const w = typeof loc.map_width === 'number' ? loc.map_width : DEFAULT_MAP_WIDTH;
                    const h = typeof loc.map_height === 'number' ? loc.map_height : DEFAULT_MAP_HEIGHT;
                    const width = `${(w * 100).toFixed(2)}%`;
                    const height = `${(h * 100).toFixed(2)}%`;

                    return (
                        <button
                            key={loc.id}
                            type="button"
                            aria-label={loc.name}
                            onClick={() => {
                                console.log('[VenueMap] desk clicked!', { id: loc.id, name: loc.name });
                                setSelectedLocation(loc);
                            }}
                            className="venue-desk absolute rounded-sm cursor-pointer"
                            style={{
                                left,
                                top,
                                width,
                                height,
                                zIndex: 9999,
                                pointerEvents: 'auto',
                                background: 'transparent',
                                border: 'none',
                                boxShadow: 'none',
                                padding: 0,
                                margin: 0
                            }}
                        >
                            {/* 視覚的なラベルは表示しない。アクセシビリティのため aria-label を使用 */}
                        </button>
                    );
                })}

                {selectedLocation && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                        onClick={() => setSelectedLocation(null)}
                    >
                        <div className="bg-card rounded-lg shadow-lg w-[90%] max-w-2xl p-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold">参加者 - {selectedLocation.name}</h3>
                                <button
                                    aria-label="閉じる"
                                    className="text-sm text-muted-foreground hover:text-foreground px-3 py-1 rounded hover:bg-muted"
                                    onClick={() => setSelectedLocation(null)}
                                >
                                    閉じる
                                </button>
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto">
                                <ParticipantList locationId={selectedLocation.id} onOpenProfile={handleOpenProfile} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">机一覧</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {locations.length === 0 && (
                        <div className="text-sm text-muted-foreground">会場情報がまだ登録されていません。</div>
                    )}
                    {locations.map((location) => {
                        const detailParts = [];
                        if (location.building) detailParts.push(location.building);
                        if (location.floor) detailParts.push(`${location.floor}F`);
                        if (location.location_type) detailParts.push(location.location_type);

                        return (
                            <div
                                key={location.id}
                                className={cn(
                                    'border border-border rounded-lg px-3 py-2 text-sm transition-colors',
                                    currentLocation?.id === location.id
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : 'bg-background hover:bg-muted/50'
                                )}
                            >
                                <div className="font-medium">{location.name}</div>
                                {detailParts.length > 0 && (
                                    <div className="text-xs text-muted-foreground mt-1">{detailParts.join(' / ')}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {selectedParticipant && (
                <ParticipantProfileModal participant={selectedParticipant} onClose={handleCloseProfile} />
            )}
        </div>
    );
};

export default VenueMap;
