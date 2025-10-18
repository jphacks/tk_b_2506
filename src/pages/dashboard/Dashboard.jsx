import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Toast from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import useLocations from '../../hooks/useLocations';
import useParticipants from '../../hooks/useParticipants';
import QrScanButton from './components/QrScanButton';
import VenueMap from './components/VenueMap';
import ParticipantList from './components/ParticipantList';

const Dashboard = () => {
    const { conferenceId: routeConferenceId } = useParams();
    const conferenceId = routeConferenceId;
    const { user } = useAuth();

    const [toast, setToast] = useState({
        isVisible: false,
        message: '',
        type: 'success'
    });

    const {
        data: locations = [],
        isLoading: locationsLoading,
        error: locationsError,
        refetch: refetchLocations
    } = useLocations(conferenceId);

    const {
        data: participants = [],
        isLoading: participantsLoading,
        error: participantsError,
        refetch: refetchParticipants
    } = useParticipants(conferenceId);

    const currentParticipant = useMemo(() => {
        if (!user) {
            return null;
        }
        return participants.find(participant => participant.user_id === user.id) || null;
    }, [participants, user]);

    const currentLocation = useMemo(() => {
        if (!currentParticipant) {
            return null;
        }

        const joinedLocation = currentParticipant.location;
        if (joinedLocation) {
            return joinedLocation;
        }

        if (!currentParticipant.current_location_id) {
            return null;
        }

        return locations.find(location => location.id === currentParticipant.current_location_id) || null;
    }, [currentParticipant, locations]);

    const handleScanSuccess = (data) => {
        refetchParticipants();
        refetchLocations();
        setToast({
            isVisible: true,
            message: `${data.locationName} にチェックインしました！`,
            type: 'success'
        });
    };

    const handleScanError = (error) => {
        const message = error?.message || 'QRコードの処理中にエラーが発生しました。';
        setToast({
            isVisible: true,
            message,
            type: 'error'
        });
    };

    if (!conferenceId) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="bg-card border border-border rounded-xl shadow-soft p-8 text-center">
                        <h1 className="text-2xl font-semibold text-foreground mb-4">ダッシュボードを表示できません</h1>
                        <p className="text-sm text-muted-foreground">
                            URL にカンファレンスIDが含まれていません。正しいダッシュボードURLを確認してください。
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-semibold text-foreground">参加者ダッシュボード</h1>
                    <p className="text-sm text-muted-foreground">
                        {conferenceId} のカンファレンス情報をリアルタイムに確認できます。
                    </p>
                </div>

                {(locationsError || participantsError) && (
                    <div className="bg-error/10 text-error border border-error/30 rounded-lg px-4 py-3 text-sm">
                        データの取得中にエラーが発生しました。必要に応じてリロードしてください。
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
                    <div className="order-1">
                        <QrScanButton
                            conferenceId={conferenceId}
                            onScanSuccess={handleScanSuccess}
                            onScanError={handleScanError}
                            disabled={!user}
                        />
                    </div>
                    <div className="order-3 xl:order-2">
                        <VenueMap
                            conferenceId={conferenceId}
                            locations={locations}
                            currentLocation={currentLocation}
                            isLoading={locationsLoading}
                            error={locationsError}
                            onRetry={refetchLocations}
                        />
                    </div>
                    <div className="order-2 xl:order-3">
                        <ParticipantList
                            participants={participants}
                            isLoading={participantsLoading}
                            error={participantsError}
                            onRetry={refetchParticipants}
                        />
                    </div>
                </div>
            </main>

            <Toast
                isVisible={toast.isVisible}
                message={toast.message}
                type={toast.type}
                position="bottom"
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />
        </div>
    );
};

export default Dashboard;
