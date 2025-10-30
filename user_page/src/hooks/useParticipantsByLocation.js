import { useQuery } from '@tanstack/react-query';
import { supabase } from 'src/lib/supabase';

const fetchParticipantsByLocation = async (locationId) => {
    if (!locationId) return [];

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
            ),
            current_map_region:map_regions!current_map_region_id(
                id,
                label
            )
        `)
        .eq('current_location_id', locationId)
        .order('registered_at', { ascending: true });

    query = query.not('introduction', 'is', null);

    const { data, error } = await query;

    if (error) {
        console.error('[useParticipantsByLocation] supabase error', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        throw error;
    }

    return data ?? [];
};

export default function useParticipantsByLocation(locationId, options = {}) {
    return useQuery({
        queryKey: ['participants_by_location', locationId],
        queryFn: () => fetchParticipantsByLocation(locationId),
        enabled: Boolean(locationId),
        staleTime: 1000 * 30,
        ...options
    });
}
