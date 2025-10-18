import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/supabase';

const fetchParticipantProfile = async (userId) => {
    if (!userId) {
        return null;
    }
    return db.getParticipantByUser(userId);
};

const useParticipantProfile = (userId, options = {}) => {
    return useQuery({
        queryKey: ['participant-profile', userId],
        queryFn: () => fetchParticipantProfile(userId),
        enabled: Boolean(userId),
        staleTime: 1000 * 30,
        ...options
    });
};

export default useParticipantProfile;
