import { useState } from 'react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import QrScanButton from './QrScanButton';
import VenueMap from './VenueMap';

const LocationTab = ({
  currentParticipant,
  currentLocation,
  locations,
  maps,
  selectedMap,
  selectedMapId,
  onMapSelect,
  onLocationUpdate,
  onRefetchLocations,
  onRefetchMaps,
  conferenceId,
  mapsByLocationId,
  locationsLoading,
  mapsLoading,
  locationError,
  mapError
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState(
    currentParticipant?.current_location_id || ''
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const handleLocationUpdate = async () => {
    if (!selectedLocationId) return;

    setIsUpdating(true);
    try {
      await onLocationUpdate(selectedLocationId);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 現在地表示 */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <span>📍</span>
          現在地
        </h2>
        {currentLocation ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">{currentLocation.name}</p>
            {(currentLocation.building || currentLocation.floor) && (
              <p className="text-xs text-muted-foreground">
                {[currentLocation.building, currentLocation.floor]
                  .filter(Boolean)
                  .join(' / ')}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">位置情報が設定されていません</p>
        )}
      </div>

      {/* 位置情報更新 */}
      <div className="bg-background border border-border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold">位置情報を更新</h3>

        <div className="space-y-4">
          {/* QRコードスキャン */}
          <div>
            <label className="block text-sm font-medium mb-2">
              QRコードをスキャン
            </label>
            <QrScanButton
              onLocationScanned={(locationId) => {
                setSelectedLocationId(locationId);
                onLocationUpdate(locationId);
              }}
            />
          </div>

          {/* 手動選択 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              または手動で選択
            </label>
            <Select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              disabled={isUpdating}
            >
              <option value="">位置を選択してください</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                  {(location.building || location.floor) &&
                    ` (${[location.building, location.floor]
                      .filter(Boolean)
                      .join(' / ')})`}
                </option>
              ))}
            </Select>
          </div>

          <Button
            onClick={handleLocationUpdate}
            disabled={!selectedLocationId || isUpdating}
            className="w-full"
          >
            {isUpdating ? '更新中...' : '位置情報を更新'}
          </Button>
        </div>
      </div>

      {/* 会場マップ */}
      {maps && maps.length > 0 && selectedMap && (
        <VenueMap
          conferenceId={conferenceId}
          mapData={selectedMap}
          maps={maps}
          mapsByLocationId={mapsByLocationId}
          currentParticipant={currentParticipant}
          onSelectMap={onMapSelect}
          locations={locations}
          currentLocation={currentLocation}
          isLoading={locationsLoading || mapsLoading}
          locationError={locationError}
          mapError={mapError}
          onRetry={() => {
            onRefetchLocations();
            onRefetchMaps();
          }}
          onLocationUpdate={onLocationUpdate}
        />
      )}
    </div>
  );
};

export default LocationTab;
