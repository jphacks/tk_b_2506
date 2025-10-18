import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/supabase';

const useConferences = (options = {}) => {
    const {
        includeInactive = false,
        ...queryOptions
    } = options;

    return useQuery({
        queryKey: ['conferences', includeInactive ? 'all' : 'active'],
        queryFn: () => db.getConferences({ includeInactive }),
        staleTime: 1000 * 60 * 5,
        ...queryOptions
    });
};

export default useConferences;
