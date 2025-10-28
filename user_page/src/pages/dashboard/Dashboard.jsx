import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Toast from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import useLocations from '../../hooks/useLocations';
import useParticipants from '../../hooks/useParticipants';
import useConferences from '../../hooks/useConferences';
import useRecommendedPresentations from '../../hooks/useRecommendedPresentations';
import useConferenceMap from '../../hooks/useConferenceMap';
import Button from '../../components/ui/Button';
import QrScanButton from './components/QrScanButton';
import VenueMap from './components/VenueMap';
import ParticipantList from './components/ParticipantList';
import RecommendedPresentations from './components/RecommendedPresentations';

const Dashboard = () => {
    const { conferenceId: routeConferenceId } = useParams();
    const conferenceId = routeConferenceId;
    const { user } = useAuth();
    const navigate = useNavigate();

    const [toast, setToast] = useState({
        isVisible: false,
        message: '',
        type: 'success'
    });

    const [occupationFilter, setOccupationFilter] = useState('all');

    const {
        data: conferences = [],
        isLoading: conferencesLoading,
        error: conferencesError
    } = useConferences({ includeInactive: true });

    const {
        data: locations = [],
        isLoading: locationsLoading,
        error: locationsError,
        refetch: refetchLocations
    } = useLocations(conferenceId);

    const {
        data: maps = [],
        isLoading: mapsLoading,
        error: mapsError,
        refetch: refetchMaps
    } = useConferenceMap(conferenceId);

    const [selectedMapId, setSelectedMapId] = useState(null);
    const [hasUserSelectedMap, setHasUserSelectedMap] = useState(false);

    const mapsByLocationId = useMemo(() => {
        const dictionary = {};
        maps.forEach((map) => {
            if (map.locationId) {
                dictionary[map.locationId] = map;
            }
        });
        return dictionary;
    }, [maps]);

    const selectedMap = useMemo(() => {
        if (!selectedMapId) {
            return null;
        }
        return maps.find((map) => map.id === selectedMapId) || null;
    }, [maps, selectedMapId]);

    const {
        data: participants = [],
        isLoading: participantsLoading,
        error: participantsError,
        refetch: refetchParticipants
    } = useParticipants(conferenceId, { occupation: occupationFilter });

    const {
        data: recommendedPresentations = [],
        isLoading: presentationsLoading,
        error: presentationsError,
        refetch: refetchPresentations
    } = useRecommendedPresentations(user?.id, conferenceId);

    const conferenceMeta = useMemo(() => {
        if (!conferenceId) {
            return null;
        }
        return conferences.find(conference => conference.id === conferenceId) || null;
    }, [conferenceId, conferences]);

    const currentParticipant = useMemo(() => {
        if (!user) {
            return null;
        }
        return participants.find(participant => participant.user_id === user.id) || null;
    }, [participants, user]);

    const visibleParticipants = useMemo(() => {
        if (!user?.id) {
            return participants;
        }

        return participants.filter(participant => participant.user_id !== user.id);
    }, [participants, user?.id]);

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

    useEffect(() => {
        if (maps.length === 0) {
            if (selectedMapId !== null) {
                setSelectedMapId(null);
            }
            if (hasUserSelectedMap) {
                setHasUserSelectedMap(false);
            }
            return;
        }

        if (selectedMapId && maps.some((map) => map.id === selectedMapId)) {
            return;
        }

        const fallbackMapId = (() => {
            if (currentLocation) {
                const mapForCurrent = mapsByLocationId[currentLocation.id];
                if (mapForCurrent) {
                    return mapForCurrent.id;
                }
            }
            return maps[0]?.id ?? null;
        })();

        if (fallbackMapId !== selectedMapId) {
            setSelectedMapId(fallbackMapId);
            setHasUserSelectedMap(false);
        }
    }, [maps, mapsByLocationId, currentLocation, selectedMapId, hasUserSelectedMap]);

    useEffect(() => {
        if (!currentLocation) {
            return;
        }
        const mapForLocation = mapsByLocationId[currentLocation.id];
        if (!mapForLocation) {
            return;
        }
        if (mapForLocation.id === selectedMapId) {
            return;
        }
        if (hasUserSelectedMap) {
            return;
        }
        setSelectedMapId(mapForLocation.id);
    }, [currentLocation, mapsByLocationId, selectedMapId, hasUserSelectedMap]);

    const handleSelectMap = (mapId) => {
        if (!mapId || mapId === selectedMapId) {
            return;
        }
        setSelectedMapId(mapId);
        setHasUserSelectedMap(true);
    };

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

    const handleConferenceReselect = () => {
        navigate('/select-conference', {
            state: {
                requiresSelection: true,
                reason: '選択済みの学会が見つかりませんでした。再度選択してください。'
            }
        });
    };

    const handleConferenceSwitch = () => {
        navigate('/select-conference', {
            state: {
                requiresSelection: false,
                currentConferenceId: conferenceId,
                reason: '別の学会に切り替えます。パスワードを入力してください。'
            }
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
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-semibold text-foreground">参加者ダッシュボード</h1>
                            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium border border-primary/20">
                                {conferenceMeta?.name
                                    ? conferenceMeta.name
                                    : conferencesLoading
                                        ? '学会情報を読み込み中…'
                                        : `学会情報未取得${conferenceId ? ` (ID: ${conferenceId})` : ''}`}
                            </span>
                        </div>
                        {/* 学会切り替えボタン */}
                        {conferenceMeta && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleConferenceSwitch}
                                iconName="RefreshCw"
                                iconPosition="left"
                            >
                                学会を切り替え
                            </Button>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {conferenceMeta?.name
                            ? `${conferenceMeta.name} のカンファレンス情報をリアルタイムに確認できます。`
                            : conferencesLoading
                                ? '学会情報を読み込み中です…'
                                : 'カンファレンス情報をリアルタイムに確認できます。'}
                    </p>
                    {!conferenceMeta && !conferencesLoading && (
                        <div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleConferenceReselect}
                            >
                                学会を再選択する
                            </Button>
                        </div>
                    )}
                </div>

                {(conferencesError || locationsError || participantsError) && (
                    <div className="bg-error/10 text-error border border-error/30 rounded-lg px-4 py-3 text-sm">
                        データの取得中にエラーが発生しました。必要に応じてリロードしてください。
                        {conferencesError && (
                            <div className="mt-1">
                                学会情報: {conferencesError.message}
                            </div>
                        )}
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
                            mapData={selectedMap}
                            maps={maps}
                            mapsByLocationId={mapsByLocationId}
                            currentParticipant={currentParticipant}
                            onSelectMap={handleSelectMap}
                            locations={locations}
                            currentLocation={currentLocation}
                            isLoading={locationsLoading || mapsLoading}
                            locationError={locationsError}
                            mapError={mapsError}
                            onRetry={() => {
                                refetchLocations();
                                refetchMaps();
                            }}
                        />
                    </div>
                    <div className="order-2 xl:order-3">
                        <ParticipantList
                            participants={visibleParticipants}
                            conferenceId={conferenceId}
                            currentParticipant={currentParticipant}
                            isLoading={participantsLoading}
                            error={participantsError}
                            onRetry={refetchParticipants}
                            occupationFilter={occupationFilter}
                            onOccupationFilterChange={setOccupationFilter}
                        />
                    </div>
                </div>

                {/* 興味のある発表セクション */}
                <div className="mt-6">
                    <RecommendedPresentations
                        presentations={recommendedPresentations}
                        isLoading={presentationsLoading}
                        error={presentationsError}
                        onRetry={refetchPresentations}
                    />
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
