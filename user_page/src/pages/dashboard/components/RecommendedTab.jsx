import RecommendedPresentations from './RecommendedPresentations';

const RecommendedTab = ({
  recommendedPresentations,
  currentParticipant,
  conferenceId,
  isLoading,
  error,
  onRefetch
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-foreground">おすすめの研究者</h2>
        <p className="text-sm text-muted-foreground mt-1">
          あなたの研究トピックに基づいて、興味を持ちそうな研究者を表示しています。
        </p>
      </div>

      <RecommendedPresentations
        presentations={recommendedPresentations}
        isLoading={isLoading}
        error={error}
        onRetry={onRefetch}
      />
    </div>
  );
};

export default RecommendedTab;
