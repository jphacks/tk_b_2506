import { useQuery } from '@tanstack/react-query';
import { supabase } from 'src/lib/supabase';

const fetchParticipantsByLocation = async (locationId) => {
  if (!locationId) return [];
  // 確認用: フィールド選択と order を外してまずは生データ取得
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('current_location_id', locationId);

  if (error) {
    // 詳細を出力（HTTP status, message, details 等）
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
