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
      {/* 位置情報更新の説明 */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-foreground">位置情報の更新方法</h2>
        <p className="text-sm text-muted-foreground mt-1">
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
