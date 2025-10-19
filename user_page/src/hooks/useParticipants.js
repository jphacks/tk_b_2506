import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const fetchParticipants = async (conferenceId) => {
    const { data, error } = await supabase
        .from('participants')
        .select(`
            id,
            user_id,
            conference_id,
            introduction_id,
            current_location_id,
            registered_at,
            updated_at,
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
        .eq('conference_id', conferenceId)
        .order('registered_at', { ascending: true });

    if (error) {
        throw error;
    }

    return data ?? [];
};

const useParticipants = (conferenceId, options = {}) => {
    return useQuery({
        queryKey: ['participants', conferenceId],
        queryFn: () => fetchParticipants(conferenceId),
        enabled: Boolean(conferenceId),
        staleTime: 1000 * 30,
        ...options
    });
};

export default useParticipants;
