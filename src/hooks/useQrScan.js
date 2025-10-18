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

            const { data: location, error: locationError } = await supabase
                .from('locations')
                .select('id, name')
                .eq('conference_id', conferenceId)
                .eq('qr_code', qrValue)
                .maybeSingle();

            if (locationError) {
                throw locationError;
            }

            if (!location) {
                throw new Error('このQRコードに対応する会場が見つかりませんでした。');
            }

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
                    scanned_at: new Date().toISOString()
                });

            if (historyError) {
                throw historyError;
            }

            const { error: updateError } = await supabase
                .from('participants')
                .update({ current_location_id: location.id })
                .eq('id', participant.id);

            if (updateError) {
                throw updateError;
            }

            return {
                locationId: location.id,
                locationName: location.name
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
