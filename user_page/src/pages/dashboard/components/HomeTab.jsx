import ParticipantList from './ParticipantList';
import QrScanButton from './QrScanButton';

const HomeTab = ({
  participants,
  currentParticipant,
  conferenceId,
  occupationFilter,
  onOccupationFilterChange,
  isLoading,
  error,
  onQrScanSuccess,
  onQrScanError,
  user,
  onVisitParticipant = () => { }
}) => {
  return (
    <div className="space-y-6">
      {/* 現在地を更新ボタン */}
      <div className="flex justify-center w-full">
        <QrScanButton
          conferenceId={conferenceId}
          onScanSuccess={onQrScanSuccess}
          onScanError={onQrScanError}
          disabled={!user}
        />
      </div>

      {/* 参加者一覧 */}
      <ParticipantList
        participants={participants}
        currentParticipant={currentParticipant}
        conferenceId={conferenceId}
        occupationFilter={occupationFilter}
        onOccupationFilterChange={onOccupationFilterChange}
        isLoading={isLoading}
        error={error}
        onVisitParticipant={onVisitParticipant}
      />
    </div>
  );
};

export default HomeTab;
