import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/supabase';

/**
 * タグ一覧を取得するフック
 * @returns {object} - { data, isLoading, isError, error, refetch }
 */
const useTags = () => {
    return useQuery({
        queryKey: ['tags'],
        queryFn: async () => {
            return await db.getTags();
        },
        staleTime: 10 * 60 * 1000, // 10分間はキャッシュを使用
        refetchOnWindowFocus: false
    });
};

export default useTags;
