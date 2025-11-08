import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const useQrScan = ({ conferenceId, onSuccess, onError } = {}) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (qrValue) => {
            if (!user) {
                throw new Error('QRコードを登録するにはログインが必要です。');
            }

            if (!conferenceId) {
                throw new Error('カンファレンス情報が見つかりません。');
            }

            const { data: region, error: regionError } = await supabase
                .from('map_regions')
                .select(`
                    id,
                    qr_code,
                    label,
                    is_active,
                    map_id,
                    map:maps!inner(
                        id,
                        conference_id,
                        is_active,
                        location_id,
                        location:locations(
                            id,
                            name
                        )
                    )
                `)
                .eq('qr_code', qrValue)
                .eq('is_active', true)
                .eq('map.conference_id', conferenceId)
                .eq('map.is_active', true)
                .maybeSingle();

            if (regionError) {
                throw regionError;
            }

            if (!region?.map?.id) {
                throw new Error('このQRコードに紐づくマップ情報が取得できませんでした。');
            }

            if (!region.map.location_id || !region.map.location) {
                throw new Error('このQRコードに紐づく場所情報が取得できませんでした。');
            }

            const location = {
                id: region.map.location.id,
                name: region.map.location.name
            };

            const { data: participant, error: participantError } = await supabase
                .from('participants')
                .select('id')
                .eq('conference_id', conferenceId)
                .eq('user_id', user.id)
                .maybeSingle();

            if (participantError) {
                throw participantError;
            }

            if (!participant) {
                throw new Error('参加者情報が見つかりませんでした。');
            }

            const { error: historyError } = await supabase
                .from('participant_locations')
                .insert({
                    participant_id: participant.id,
                    location_id: location.id,
                    map_region_id: region.id,
                    scanned_at: new Date().toISOString()
                });

            if (historyError) {
                throw historyError;
            }

            const { error: updateError } = await supabase
                .from('participants')
                .update({
                    current_location_id: location.id,
                    current_map_region_id: region.id
                })
                .eq('id', participant.id);

            if (updateError) {
                throw updateError;
            }

            return {
                locationId: location.id,
                locationName: location.name,
                deskLabel: region.label
            };
        },
        onSuccess: (data, variables, context) => {
            queryClient.invalidateQueries({ queryKey: ['participants', conferenceId] });
            queryClient.invalidateQueries({ queryKey: ['locations', conferenceId] });
            onSuccess?.(data, variables, context);
        },
        onError
    });

    return {
        scan: mutation.mutate,
        scanAsync: mutation.mutateAsync,
        isScanning: mutation.isPending,
        error: mutation.error
    };
};

export default useQrScan;
