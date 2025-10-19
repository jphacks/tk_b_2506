import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const fetchLocations = async (conferenceId) => {
    const { data, error } = await supabase
        .from('locations')
        .select('id, conference_id, name, description, qr_code, floor, building, location_type, map_x, map_y')
        .eq('conference_id', conferenceId)
        .order('name', { ascending: true });

    if (error) {
        throw error;
    }

    return data ?? [];
};

const useLocations = (conferenceId, options = {}) => {
    return useQuery({
        queryKey: ['locations', conferenceId],
        queryFn: () => fetchLocations(conferenceId),
        enabled: Boolean(conferenceId),
        staleTime: 1000 * 60,
        ...options
    });
};

export default useLocations;
