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
  return (
    <div className="space-y-6">
      {/* 現在地表示 */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <span>📍</span>
          現在地
        </h2>
        {currentLocation || currentParticipant?.current_map_region ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {currentLocation?.name || '位置情報が設定されていません'}
              {currentParticipant?.current_map_region?.label && (
                <span className="ml-2 text-muted-foreground">
                  - {currentParticipant.current_map_region.label}
                </span>
              )}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">位置情報が設定されていません</p>
        )}
      </div>

      {/* 位置情報更新の説明 */}
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-2">位置情報の更新方法</h3>
        <p className="text-sm text-muted-foreground">
          下の会場マップから机をクリックし、「この机に移動する」ボタンで位置情報を更新できます。
        </p>
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
