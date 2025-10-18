import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/supabase';

/**
 * ユーザーの興味タグに基づいて推奨プレゼンテーションを取得するフック
 * @param {string} userId - ユーザーID
 * @param {string} conferenceId - 学会ID
 * @param {object} options - オプション
 * @returns {object} - { data, isLoading, isError, error, refetch }
 */
const useRecommendedPresentations = (userId, conferenceId, options = {}) => {
    const { enabled = true } = options;

    return useQuery({
        queryKey: ['recommendedPresentations', userId, conferenceId],
        queryFn: async () => {
            if (!userId || !conferenceId) {
                return [];
            }
            return await db.searchPresentationsByUserInterests(userId, conferenceId);
        },
        enabled: enabled && Boolean(userId) && Boolean(conferenceId),
        staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
        refetchOnWindowFocus: false
    });
};

export default useRecommendedPresentations;
