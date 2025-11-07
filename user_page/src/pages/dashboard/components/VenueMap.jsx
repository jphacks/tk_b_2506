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

    const common = {
        fill: 'transparent',
        stroke: 'none'
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
    currentParticipant = null,
    locations = [],
    currentLocation = null,
    isLoading = false,
    locationError = null,
    mapError = null,
    onRetry = null,
    onLocationUpdate = null
}) => {
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [selectedRegionId, setSelectedRegionId] = useState(null);
    const [selectedParticipant, setSelectedParticipant] = useState(null);
    const [hasMovedToDesk, setHasMovedToDesk] = useState(false);

    const regions = useMemo(() => mapData?.regions ?? [], [mapData]);
    const mapLocation = mapData?.location ?? null;

    useEffect(() => {
        setSelectedRegionId(null);
    }, [mapData?.id]);

    useEffect(() => {
        setHasMovedToDesk(false);
    }, [selectedLocation?.id]);

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
        setSelectedLocation(null);
        setHasMovedToDesk(false);
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
        setHasMovedToDesk(false);
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

    const isAlreadyAtSelectedLocation = Boolean(
        selectedLocation &&
        currentLocation &&
        selectedLocation.id === currentLocation.id &&
        selectedLocation.mapRegionId === currentParticipant?.current_map_region_id
    );

    const shouldShowMoveButton = Boolean(
        onLocationUpdate &&
        selectedLocation &&
        (!isAlreadyAtSelectedLocation || hasMovedToDesk)
    );

    return (
        <div className="bg-card border border-border rounded-xl shadow-soft p-6 flex flex-col gap-6">
            <div>
                <h2 className="text-lg font-semibold text-foreground">会場マップ</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    机をタップすると，その机にいる参加者を確認できます。
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
                        <div>
                            <span className="font-semibold">表示中の会場：</span>
                            {mapLocation.name}
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
                        const mapForLocation = mapsByLocationId[location.id];
                        const isMapLocation = Boolean(mapForLocation);
                        const isMapActive = mapData?.locationId === location.id;
                        const isCurrent = currentLocation?.id === location.id;

                        const detailParts = [];
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
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto mb-4">
                            <ParticipantList
                                conferenceId={conferenceId}
                                locationId={selectedLocation.id}
                                mapRegionId={selectedLocation.mapRegionId}
                                currentParticipant={currentParticipant}
                                onOpenProfile={handleOpenProfile}
                            />
                        </div>
                        <div className="flex gap-2">
                            {shouldShowMoveButton && (
                                <Button
                                    variant="default"
                                    className="h-12 text-base"
                                    iconName="MapPin"
                                    disabled={hasMovedToDesk}
                                    onClick={async () => {
                                        try {
                                            await onLocationUpdate(selectedLocation.id, {
                                                mapRegionId: selectedLocation.mapRegionId,
                                                deskLabel: selectedLocation.mapLabel
                                            }, { suppressToast: true });
                                            setHasMovedToDesk(true);
                                        } catch (error) {
                                            console.error('[VenueMap] Failed to update location:', error);
                                        }
                                    }}
                                    fullWidth
                                >
                                    {hasMovedToDesk ? '移動しました' : 'この机へ移動する'}
                                </Button>
                            )}
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

export default VenueMap;
