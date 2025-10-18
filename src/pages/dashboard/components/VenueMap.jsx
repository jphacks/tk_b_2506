import { useMemo, useState } from 'react';
import Button from '../../../components/ui/Button';
import { cn } from '../../../utils/cn';

const mapExtensions = ['png', 'jpg', 'jpeg', 'webp'];

const VenueMap = ({
    conferenceId,
    locations = [],
    currentLocation,
    isLoading = false,
    error = null,
    onRetry
}) => {
    const [failedExtensions, setFailedExtensions] = useState([]);

    const mapSource = useMemo(() => {
        if (!conferenceId) {
            return null;
        }

        const remaining = mapExtensions.find(ext => !failedExtensions.includes(ext));
        if (!remaining) {
            return null;
        }

        return `/maps/${conferenceId}.${remaining}`;
    }, [conferenceId, failedExtensions]);

    const handleImageError = () => {
        setFailedExtensions(prev => {
            const attempted = mapSource?.split('.').pop();
            if (!attempted) {
                return prev;
            }
            if (prev.includes(attempted)) {
                return prev;
            }
            return [...prev, attempted];
        });
    };

    const sortedLocations = useMemo(() => {
        return [...locations].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    }, [locations]);

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

            <div className="relative w-full bg-muted border border-border rounded-lg overflow-hidden aspect-video">
                {mapSource ? (
                    <img
                        src={mapSource}
                        alt={`Conference ${conferenceId} map`}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center px-6 text-sm text-muted-foreground">
                        利用可能な会場マップが見つかりませんでした。管理者にお問い合わせください。
                    </div>
                )}

                {currentLocation && (
                    <div className="absolute top-4 left-4 bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full shadow-soft">
                        現在地: {currentLocation.name}
                    </div>
                )}

                {isLoading && (
                    <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
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
                    {sortedLocations.length === 0 && (
                        <div className="text-sm text-muted-foreground">
                            会場情報がまだ登録されていません。
                        </div>
                    )}
                    {sortedLocations.map(location => {
                        const detailParts = [];
                        if (location.building) {
                            detailParts.push(location.building);
                        }
                        if (location.floor) {
                            detailParts.push(`${location.floor}F`);
                        }
                        if (location.location_type) {
                            detailParts.push(location.location_type);
                        }

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
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {detailParts.join(' / ')}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default VenueMap;
