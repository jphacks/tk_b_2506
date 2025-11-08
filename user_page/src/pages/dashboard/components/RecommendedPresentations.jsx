import { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const RecommendedPresentations = ({
    presentations = [],
    isLoading = false,
    error = null,
    onRetry = () => { }
}) => {
    const [expandedId, setExpandedId] = useState(null);

    const toggleExpand = (id) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const presentationTypeLabel = (type) => {
        return type === 'oral' ? '口頭発表' : 'ポスター';
    };

    const presentationTypeColor = (type) => {
        return type === 'oral'
            ? 'bg-blue-100 text-blue-800 border-blue-200'
            : 'bg-green-100 text-green-800 border-green-200';
    };

    const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return null;
        const date = new Date(dateTimeStr);
        return date.toLocaleString('ja-JP', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (error) {
        return (
            <div className="bg-card border border-border rounded-xl shadow-soft p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Icon name="Sparkles" size={20} color="var(--color-primary)" />
                        おすすめの研究者
                    </h2>
                </div>
                <div className="text-center py-8 space-y-3">
                    <div className="flex justify-center">
                        <Icon name="AlertCircle" size={48} color="var(--color-error)" />
                    </div>
                    <p className="text-sm text-error">{error.message || 'データの取得に失敗しました'}</p>
                    <Button variant="outline" size="sm" onClick={onRetry}>
                        再試行
                    </Button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="bg-card border border-border rounded-xl shadow-soft p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Icon name="Sparkles" size={20} color="var(--color-primary)" />
                        おすすめの研究者
                    </h2>
                </div>
                <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground mt-3">読み込み中...</p>
                </div>
            </div>
        );
    }

    if (!presentations || presentations.length === 0) {
        return (
            <div className="bg-card border border-border rounded-xl shadow-soft p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Icon name="Sparkles" size={20} color="var(--color-primary)" />
                        おすすめの研究者
                    </h2>
                </div>
                <div className="text-center py-8 space-y-3">
                    <div className="flex justify-center">
                        <Icon name="Search" size={48} color="var(--color-muted-foreground)" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        興味のあるタグを設定すると、関連する発表が表示されます
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Icon name="Sparkles" size={20} color="var(--color-primary)" />
                    おすすめの研究者
                    <span className="text-sm font-normal text-muted-foreground">
                        ({presentations.length}件)
                    </span>
                </h2>
            </div>

            <div className="space-y-3">
                {presentations.map((presentation) => (
                    <div
                        key={presentation.id}
                        className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-1">
                                    {presentation.title}
                                </h3>
                                {presentation.presenter_name && (
                                    <p className="text-xs text-muted-foreground">
                                        {presentation.presenter_name}
                                        {presentation.presenter_affiliation && (
                                            <span> ({presentation.presenter_affiliation})</span>
                                        )}
                                    </p>
                                )}
                            </div>
                            <span
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${presentationTypeColor(
                                    presentation.presentation_type
                                )}`}
                            >
                                {presentationTypeLabel(presentation.presentation_type)}
                            </span>
                        </div>

                        {/* Matched Tags */}
                        {presentation.matched_tags && presentation.matched_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                                {presentation.matched_tags.map((tag, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Time and Location */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                            {presentation.scheduled_at && (
                                <div className="flex items-center gap-1">
                                    <Icon name="Clock" size={14} />
                                    <span>{formatDateTime(presentation.scheduled_at)}</span>
                                </div>
                            )}
                        </div>

                        {/* Summary */}
                        {presentation.ai_summary && (
                            <div className="mb-2">
                                <p
                                    className={`text-xs text-muted-foreground ${expandedId === presentation.id ? '' : 'line-clamp-2'
                                        }`}
                                >
                                    {presentation.ai_summary}
                                </p>
                            </div>
                        )}

                        {/* Expand/Collapse Button */}
                        {presentation.ai_summary && presentation.ai_summary.length > 100 && (
                            <button
                                onClick={() => toggleExpand(presentation.id)}
                                className={`text-xs flex items-center gap-1 hover:underline ${expandedId === presentation.id ? 'text-success hover:text-success/80' : 'text-primary'}`}
                            >
                                {expandedId === presentation.id ? (
                                    <>
                                        <Icon name="ChevronUp" size={14} />
                                        <span>閉じる</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="ChevronDown" size={14} />
                                        <span>もっと見る</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecommendedPresentations;
