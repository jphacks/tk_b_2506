import Button from 'components/ui/Button';
import { useEffect, useMemo, useState } from 'react';
import { cn } from 'utils/cn';
import ParticipantList from './ParticipantList';
import ParticipantProfileModal from './ParticipantProfileModal';

const DEFAULT_ASPECT_RATIO = '16 / 9';

const getRegionLabel = (region) => region?.label || '未設定領域';

const createRegionShape = (region, { isHighlighted, isSelected }) => {
    if (!region?.coords) {
        return null;
    }

    const baseFill = isSelected ? 'rgba(59,130,246,0.35)' : isHighlighted ? 'rgba(59,130,246,0.22)' : 'rgba(59,130,246,0.12)';
    const strokeColor = isSelected ? 'rgba(59,130,246,0.9)' : 'rgba(59,130,246,0.45)';

    const common = {
        fill: baseFill,
        stroke: strokeColor,
        strokeWidth: 2
    };

    if (region.shapeType === 'rect') {
        const { x, y, width, height } = region.coords;
        if ([x, y, width, height].some((value) => typeof value !== 'number')) {
            return null;
        }
        return <rect x={x} y={y} width={width} height={height} rx={8} ry={8} {...common} />;
    }

    if (region.shapeType === 'circle') {
        const { cx, cy, r } = region.coords;
        if ([cx, cy, r].some((value) => typeof value !== 'number')) {
            return null;
        }
        return <circle cx={cx} cy={cy} r={r} {...common} />;
    }

    if (region.shapeType === 'polygon' && Array.isArray(region.coords.points)) {
        const pointsAttr = region.coords.points
            .map((point) => {
                const x = Number(point.x);
                const y = Number(point.y);
                if (!Number.isFinite(x) || !Number.isFinite(y)) {
                    return null;
                }
                return `${x},${y}`;
            })
            .filter(Boolean)
            .join(' ');

        if (!pointsAttr) {
            return null;
        }

        return <polygon points={pointsAttr} {...common} />;
    }

    return null;
};

const VenueMap = ({
    conferenceId,
    mapData,
    mapsByLocationId = {},
    onSelectMap,
    locations = [],
    currentLocation = null,
    isLoading = false,
    locationError = null,
    mapError = null,
    onRetry = null
}) => {
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [selectedRegionId, setSelectedRegionId] = useState(null);
    const [selectedParticipant, setSelectedParticipant] = useState(null);

    const regions = useMemo(() => mapData?.regions ?? [], [mapData]);
    const mapLocation = mapData?.location ?? null;

    useEffect(() => {
        setSelectedRegionId(null);
    }, [mapData?.id]);

    const hasValidDimensions = Number.isFinite(mapData?.imageWidth) && Number.isFinite(mapData?.imageHeight) && mapData.imageWidth > 0 && mapData.imageHeight > 0;
    const aspectRatio = hasValidDimensions
        ? `${mapData.imageWidth} / ${mapData.imageHeight}`
        : DEFAULT_ASPECT_RATIO;
    const hasMapImage = Boolean(mapData?.imageUrl && hasValidDimensions);

    const handleRegionSelect = (region) => {
        if (!region) {
            return;
        }
        if (!mapLocation) {
            return;
        }

        setSelectedRegionId(region.id ?? null);
        setSelectedLocation({
            ...mapLocation,
            qrCode: region.qrCode ?? null,
            mapRegionId: region.id,
            mapLabel: region.label ?? null
        });
    };

    const handleLocationSelect = (location) => {
        if (!location) {
            return;
        }
        const mapForLocation = mapsByLocationId[location.id];
        if (mapForLocation) {
            onSelectMap?.(mapForLocation.id);
        }
        setSelectedRegionId(null);
        setSelectedLocation(location);
    };

    const handleOpenProfile = (participant) => {
        setSelectedParticipant(participant);
    };

    const handleCloseProfile = () => {
        setSelectedParticipant(null);
    };

    const handleCloseLocationModal = () => {
        setSelectedLocation(null);
        setSelectedRegionId(null);
    };

    const renderRegion = (region) => {
        const isCurrentLocation = Boolean(mapLocation && currentLocation && mapLocation.id === currentLocation.id);
        const isSelected = selectedRegionId != null && region.id === selectedRegionId;
        const isHighlighted = !isSelected && isCurrentLocation;

        const shape = createRegionShape(region, { isHighlighted, isSelected });
        if (!shape) {
            return null;
        }

        const label = getRegionLabel(region);
        const ariaLabel = region.qrCode ? `${label} (QR: ${region.qrCode})` : label;

        return (
            <g
                key={region.id}
                tabIndex={0}
                role="button"
                className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                onClick={() => handleRegionSelect(region)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleRegionSelect(region);
                    }
                }}
            >
                <title>{ariaLabel}</title>
                {shape}
            </g>
        );
    };

    return (
        <div className="bg-card border border-border rounded-xl shadow-soft p-6 flex flex-col gap-6">
            <div>
                <h2 className="text-lg font-semibold text-foreground">会場マップ</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    QRコードと紐づいた領域をタップして、会場内の場所と参加者を確認できます。
                </p>
                {(mapError || locationError) && (
                    <div className="mt-3 text-sm text-error flex flex-col gap-2">
                        <span>会場情報を取得できませんでした。</span>
                        {mapError && <span>マップ: {mapError.message}</span>}
                        {locationError && <span>場所: {locationError.message}</span>}
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

            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
                {mapData ? (
                    mapLocation ? (
                        <div className="flex flex-col gap-1">
                            <div>
                                <span className="font-semibold">表示中の場所：</span>
                                {mapLocation.name}
                            </div>
                            {(mapLocation.building || mapLocation.floor || mapLocation.location_type) && (
                                <div className="text-xs text-muted-foreground">
                                    {[mapLocation.building, mapLocation.floor ? `${mapLocation.floor}` : null, mapLocation.location_type]
                                        .filter(Boolean)
                                        .join(' / ')}
                                </div>
                            )}
                        </div>
                    ) : (
                        <span>このマップには紐づく場所が設定されていません。</span>
                    )
                ) : (
                    <span>表示できるマップが選択されていません。</span>
                )}
            </div>

            <div
                className="relative w-full bg-muted border border-border rounded-lg overflow-hidden"
                style={{ position: 'relative', aspectRatio }}
            >
                {hasMapImage ? (
                    <>
                        <img
                            src={mapData.imageUrl}
                            alt={mapData.name || `Conference ${conferenceId} map`}
                            className="w-full h-full object-cover absolute inset-0"
                            style={{ pointerEvents: 'none', zIndex: 0 }}
                            aria-hidden="true"
                        />
                        <svg
                            className="absolute inset-0 w-full h-full"
                            viewBox={`0 0 ${mapData.imageWidth} ${mapData.imageHeight}`}
                            preserveAspectRatio="xMidYMid meet"
                            style={{ zIndex: 10 }}
                        >
                            {regions.map(renderRegion)}
                        </svg>
                    </>
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
            </div>

            <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">会場一覧</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {locations.length === 0 && (
                        <div className="text-sm text-muted-foreground">会場情報がまだ登録されていません。</div>
                    )}
                    {locations.map((location) => {
                        const isActive = selectedLocation?.id === location.id;
                        const isCurrent = !selectedLocation && currentLocation?.id === location.id;
                        const mapForLocation = mapsByLocationId[location.id];
                        const isMapLocation = Boolean(mapForLocation);
                        const isMapActive = mapData?.locationId === location.id;

                        const detailParts = [];
                        if (location.building) detailParts.push(location.building);
                        if (location.floor) detailParts.push(location.floor);
                        if (location.location_type) detailParts.push(location.location_type);
                        if (isMapLocation) detailParts.push('マップあり');
                        if (isMapActive && mapData?.location?.name) {
                            detailParts.push('現在表示中');
                        }
                        if (selectedLocation?.mapRegionId && selectedLocation.id === location.id && selectedLocation.mapLabel) {
                            detailParts.push(`選択中: ${selectedLocation.mapLabel}`);
                        }

                        return (
                            <button
                                key={location.id}
                                type="button"
                                onClick={() => handleLocationSelect(location)}
                                className={cn(
                                    'border border-border rounded-lg px-3 py-2 text-sm transition-colors text-left w-full',
                                    isActive
                                        ? 'bg-primary/15 border-primary text-primary'
                                        : isMapActive
                                            ? 'bg-primary/10 border-primary/60 text-primary'
                                            : isCurrent
                                                ? 'bg-primary/5 border-primary/40 text-primary'
                                                : 'bg-background hover:bg-muted/50 cursor-pointer'
                                )}
                            >
                                <div className="font-medium">{location.name}</div>
                                {detailParts.length > 0 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {detailParts.join(' / ')}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {selectedLocation && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={handleCloseLocationModal}
                >
                    <div className="bg-card rounded-lg shadow-lg w-[90%] max-w-2xl p-4" onClick={(event) => event.stopPropagation()}>
                        <div className="mb-3 space-y-1">
                            <h3 className="text-lg font-semibold">
                                {selectedLocation.name}
                            </h3>
                            {selectedLocation.mapLabel && (
                                <p className="text-xs text-muted-foreground">
                                    ラベル: {selectedLocation.mapLabel}
                                </p>
                            )}
                            {selectedLocation.qrCode && (
                                <p className="text-xs text-muted-foreground">
                                    QRコード: {selectedLocation.qrCode}
                                </p>
                            )}
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto mb-4">
                            <ParticipantList
                                conferenceId={conferenceId}
                                locationId={selectedLocation.id}
                                onOpenProfile={handleOpenProfile}
                            />
                        </div>
                        <div>
                            <Button
                                variant="secondary"
                                onClick={handleCloseLocationModal}
                                fullWidth
                            >
                                閉じる
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {selectedParticipant && (
                <ParticipantProfileModal participant={selectedParticipant} onClose={handleCloseProfile} />
            )}
        </div>
    );
};

export default VenueMap;
