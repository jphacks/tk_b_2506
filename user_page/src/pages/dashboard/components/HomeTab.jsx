import ParticipantList from './ParticipantList';

const HomeTab = ({
  participants,
  currentParticipant,
  conferenceId,
  occupationFilter,
  onOccupationFilterChange,
  isLoading,
  error
}) => {
  return (
    <div className="space-y-6">
      <ParticipantList
        participants={participants}
        currentParticipant={currentParticipant}
        conferenceId={conferenceId}
        occupationFilter={occupationFilter}
        onOccupationFilterChange={onOccupationFilterChange}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
};

export default HomeTab;
