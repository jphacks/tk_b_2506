import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const fetchParticipants = async (conferenceId, options = {}) => {
    const { occupation } = options;

    let query = supabase
        .from('participants')
        .select(`
            id,
            user_id,
            conference_id,
            introduction_id,
            current_location_id,
            current_map_region_id,
            registered_at,
            updated_at,
            line_user_id,
            introduction:introductions(
                id,
                name,
                affiliation,
                research_topic,
                interests,
                one_liner,
                occupation,
                occupation_other
            ),
            location:locations(
                id,
                name,
                floor,
                building,
                location_type
            )
        `)
        .eq('conference_id', conferenceId);

    // occupationフィルタを追加
    if (occupation && occupation !== 'all') {
        query = query.eq('introduction.occupation', occupation);
    }

    // introductionが存在しない参加者は除外
    query = query.not('introduction', 'is', null);

    query = query.order('registered_at', { ascending: true });

    const { data, error } = await query;

    if (error) {
        throw error;
    }

    return data ?? [];
};

const useParticipants = (conferenceId, options = {}) => {
    return useQuery({
        queryKey: ['participants', conferenceId, options.occupation],
        queryFn: () => fetchParticipants(conferenceId, options),
        enabled: Boolean(conferenceId),
        staleTime: 1000 * 30,
        ...options
    });
};

export default useParticipants;
