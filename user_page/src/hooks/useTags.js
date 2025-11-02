import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/supabase';
import { DEFAULT_INTEREST_TAGS } from '../constants/interestTags';

/**
 * タグ一覧を取得するフック
 * @returns {object} - { data, isLoading, isError, error, refetch }
 */
const useTags = () => {
    return useQuery({
        queryKey: ['tags'],
        queryFn: async () => {
            let tags = [];

            try {
                tags = await db.getTags();
            } catch (error) {
                console.warn('[useTags] failed to fetch tags:', error);
            }

            const missingDefaults = DEFAULT_INTEREST_TAGS.filter((definition) =>
                definition?.name &&
                !tags.some((tag) => tag?.name === definition.name)
            );

            if (missingDefaults.length) {
                try {
                    await db.ensureTags(missingDefaults);
                    tags = await db.getTags();
                } catch (error) {
                    console.warn('[useTags] failed to ensure default tags:', error);
                }
            }

            if (!Array.isArray(tags)) {
                return [];
            }

            if (!tags.length) {
                return tags;
            }

            const descriptionMap = new Map(
                DEFAULT_INTEREST_TAGS
                    .filter((item) => item?.name)
                    .map((item) => [item.name, item.description || null])
            );

            return tags.map((tag) => {
                if (!tag?.name) {
                    return tag;
                }

                const defaultDescription = descriptionMap.get(tag.name);
                if (defaultDescription && !tag.description) {
                    return {
                        ...tag,
                        description: defaultDescription
                    };
                }

                return tag;
            });
        },
        staleTime: 10 * 60 * 1000, // 10分間はキャッシュを使用
        refetchOnWindowFocus: false
    });
};

export default useTags;
