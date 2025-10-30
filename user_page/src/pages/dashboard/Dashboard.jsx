import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';
import MessageModal from '../../components/ui/MessageModal';
import Tabs from '../../components/ui/Tabs';
import Toast from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import useConferenceMap from '../../hooks/useConferenceMap';
import useConferences from '../../hooks/useConferences';
import useLocations from '../../hooks/useLocations';
import useParticipants from '../../hooks/useParticipants';
import useRecommendedPresentations from '../../hooks/useRecommendedPresentations';
import { db, realtime, supabase } from '../../lib/supabase';
import HomeTab from './components/HomeTab';
import LocationTab from './components/LocationTab';
import MessagesTab from './components/MessagesTab';
import RecommendedTab from './components/RecommendedTab';

const Dashboard = () => {
    const { conferenceId: routeConferenceId } = useParams();
    const conferenceId = routeConferenceId;
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // URLパラメータからタブを取得、デフォルトは'home'
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'home');

    // URLパラメータが変更されたときにタブを更新
    useEffect(() => {
        const tabFromUrl = searchParams.get('tab');
        if (tabFromUrl && tabFromUrl !== activeTab) {
            setActiveTab(tabFromUrl);
        }
    }, [searchParams]);

    const [toast, setToast] = useState({
        isVisible: false,
        message: '',
        type: 'success'
    });

    const [notifications, setNotifications] = useState([]);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const notificationsLoadedRef = useRef(false);

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

    // URLパラメータからタブとビューを読み取る
    useEffect(() => {
        const tab = searchParams.get('tab');
        const view = searchParams.get('view');

        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }

        if (view === 'notifications') {
            setIsMessageModalOpen(true);
        } else if (view === 'settings') {
            // 設定モーダルを開く処理（既存のものがあれば）
        }
    }, [searchParams]);

    // タブ変更ハンドラー
    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setSearchParams({ tab: tabId });
    };

    // タブ定義
    const tabs = useMemo(() => {
        const unreadCount = notifications.filter(n => !n.is_read).length;

        return [
            { id: 'home', label: 'ホーム' },
            { id: 'recommended', label: 'おすすめ' },
            { id: 'location', label: '位置情報' },
            { id: 'messages', label: 'メッセージ' }
        ];
    }, [notifications]);

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

    const handleLocationUpdate = async (locationId, deskInfo = {}) => {
        if (!currentParticipant?.id || !locationId) return;

        try {
            // Update current location in participants table
            const updateData = {
                current_location_id: locationId,
                current_map_region_id: deskInfo.mapRegionId || null
            };

            const { error } = await supabase
                .from('participants')
                .update(updateData)
                .eq('id', currentParticipant.id);

            if (error) throw error;

            // Also record in participant_locations history
            const { error: historyError } = await supabase
                .from('participant_locations')
                .insert({
                    participant_id: currentParticipant.id,
                    location_id: locationId,
                    map_region_id: deskInfo.mapRegionId || null,
                    scanned_at: new Date().toISOString()
                });

            if (historyError) {
                console.error('Failed to record location history:', historyError);
                // Don't throw - the main update succeeded
            }

            await refetchParticipants();
            await refetchLocations();

            const message = deskInfo.deskLabel
                ? `${deskInfo.deskLabel}に移動しました！`
                : '位置情報を更新しました！';

            setToast({
                isVisible: true,
                message,
                type: 'success'
            });
        } catch (error) {
            console.error('Failed to update location:', error);
            setToast({
                isVisible: true,
                message: '位置情報の更新に失敗しました。',
                type: 'error'
            });
        }
    };

    const handleNotificationClick = async (notification) => {
        setSelectedMessage(notification);
        setIsMessageModalOpen(true);

        // データベースで既読にする
        try {
            await db.markMeetRequestAsRead(notification.id);

            // ローカル状態も更新
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notification.id ? { ...n, is_read: true } : n
                )
            );
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    useEffect(() => {
        if (!conferenceId || !currentParticipant?.id) {
            return;
        }

        // 非同期安全なパターン：useEffect内で直接非同期処理を実行
        let unsubscribe;

        const setupRealtime = async () => {
            try {
                unsubscribe = await realtime.subscribeMeetRequests(
                    currentParticipant.id,
                    (newRequest) => {
                        // 既存の通知を更新するか、新しい通知を追加するかを判定
                        setNotifications(prev => {
                            const existingIndex = prev.findIndex(n => n.id === newRequest.id);

                            if (existingIndex !== -1) {
                                // 既存の通知を更新（UPDATEイベントの場合）
                                const updated = [...prev];
                                updated[existingIndex] = {
                                    ...updated[existingIndex],
                                    is_read: newRequest.is_read || false,
                                    requestData: newRequest
                                };
                                return updated;
                            } else {
                                // 新しい通知を追加（INSERTイベントの場合）
                                const sender = participants.find(
                                    (p) => p.id === newRequest.from_participant_id
                                );

                                const senderName =
                                    sender?.introduction?.name ||
                                    sender?.introduction?.affiliation ||
                                    '他の参加者';

                                const messagePreview = newRequest.message?.trim()
                                    ? newRequest.message.trim()
                                    : 'メッセージをご確認ください。';

                                const newNotification = {
                                    id: newRequest.id,
                                    title: '新しいミートリクエスト',
                                    message: messagePreview,
                                    senderName,
                                    content: newRequest.message,
                                    timestamp: newRequest.created_at,
                                    is_read: newRequest.is_read || false,
                                    requestData: newRequest
                                };

                                return [newNotification, ...prev];
                            }
                        });
                    }
                );
            } catch (error) {
                console.error('Failed to setup realtime subscription:', error);
            }
        };

        // 非同期関数を即座に実行
        setupRealtime();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [conferenceId, currentParticipant?.id]);

    // 既存の通知を読み込む（既読・未読問わず）
    useEffect(() => {
        const loadExistingNotifications = async () => {
            if (!currentParticipant?.id || participants.length === 0 || notificationsLoadedRef.current) return;

            try {
                // すべての通知を取得（既読・未読問わず）
                const { data: allRequests, error } = await supabase
                    .from('participant_meet_requests')
                    .select('*')
                    .eq('to_participant_id', currentParticipant.id)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Failed to load existing notifications:', error);
                    return;
                }

                const existingNotifications = allRequests.map(request => {
                    // 参加者情報をリアルタイムで取得
                    const sender = participants.find(p => p.id === request.from_participant_id);
                    const senderName = sender?.introduction?.name ||
                        sender?.introduction?.affiliation ||
                        '他の参加者';

                    const messagePreview = request.message?.trim()
                        ? request.message.trim()
                        : 'メッセージをご確認ください。';

                    return {
                        id: request.id,
                        title: 'ミートリクエスト',
                        message: messagePreview,
                        senderName,
                        content: request.message,
                        timestamp: request.created_at,
                        is_read: request.is_read || false,
                        requestData: request
                    };
                });

                // 既存の通知を完全に置き換える（重複を避けるため）
                setNotifications(existingNotifications);
                notificationsLoadedRef.current = true;
            } catch (error) {
                console.error('Failed to load existing notifications:', error);
            }
        };

        loadExistingNotifications();
    }, [currentParticipant?.id, participants]); // participantsを依存配列に戻す

    // バッジ用: 机名取得
    const mapRegionLabel = useMemo(() => {
        if (!currentParticipant?.current_map_region_id || !currentLocation) return '';
        const map = mapsByLocationId?.[currentLocation.id];
        if (!map || !Array.isArray(map.regions)) return '';
        const region = map.regions.find(r => String(r.id) === String(currentParticipant.current_map_region_id));
        return region?.label || '';
    }, [currentParticipant, currentLocation, mapsByLocationId]);

    if (!conferenceId) {
        return (
            <div className="min-h-screen bg-background">
                <Header notifications={[]} onNotificationClick={() => { }} showSettings={false} />
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
            <Header
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                showSettings={true}
                onConferenceSwitch={handleConferenceSwitch}
            />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div className="flex items-center justify-end gap-3 w-full">
                    {currentLocation && (
                        <span className="flex items-center text-base text-muted-foreground">
                            <svg className="w-5 h-5 mr-1 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 21c4.418 0 8-7.29 8-11A8 8 0 0 0 4 10c0 3.71 3.582 11 8 11Zm0-9a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" fill="currentColor" /></svg>
                            現在地：{currentLocation.name}{mapRegionLabel && `・${mapRegionLabel}`}
                        </span>
                    )}
                </div>
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
                {/* タブUI */}
                <Tabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                />
                {/* タブコンテンツ */}
                <div className="mt-6">
                    {activeTab === 'home' && (
                        <HomeTab
                            participants={visibleParticipants}
                            currentParticipant={currentParticipant}
                            conferenceId={conferenceId}
                            occupationFilter={occupationFilter}
                            onOccupationFilterChange={setOccupationFilter}
                            isLoading={participantsLoading}
                            error={participantsError}
                            maps={maps}
                            selectedMap={selectedMap}
                            selectedMapId={selectedMapId}
                            mapsByLocationId={mapsByLocationId}
                            locations={locations}
                            currentLocation={currentLocation}
                            onMapSelect={handleSelectMap}
                            onLocationUpdate={handleLocationUpdate}
                            onQrScanSuccess={handleScanSuccess}
                            onQrScanError={handleScanError}
                            onRefetchLocations={refetchLocations}
                            onRefetchMaps={refetchMaps}
                            locationsLoading={locationsLoading}
                            mapsLoading={mapsLoading}
                            locationError={locationsError}
                            mapError={mapsError}
                            user={user}
                        />
                    )}
                    {activeTab === 'recommended' && (
                        <RecommendedTab
                            recommendedPresentations={recommendedPresentations}
                            currentParticipant={currentParticipant}
                            conferenceId={conferenceId}
                            isLoading={presentationsLoading}
                            error={presentationsError}
                            onRefetch={refetchPresentations}
                        />
                    )}
                    {activeTab === 'location' && (
                        <LocationTab
                            currentParticipant={currentParticipant}
                            currentLocation={currentLocation}
                            locations={locations}
                            maps={maps}
                            selectedMap={selectedMap}
                            selectedMapId={selectedMapId}
                            onMapSelect={handleSelectMap}
                            onLocationUpdate={handleLocationUpdate}
                            onRefetchLocations={refetchLocations}
                            onRefetchMaps={refetchMaps}
                            conferenceId={conferenceId}
                            mapsByLocationId={mapsByLocationId}
                            locationsLoading={locationsLoading}
                            mapsLoading={mapsLoading}
                            locationError={locationsError}
                            mapError={mapsError}
                        />
                    )}
                    {activeTab === 'messages' && (
                        <MessagesTab
                            currentParticipant={currentParticipant}
                            conferenceId={conferenceId}
                        />
                    )}
                </div>
            </main>
            <Toast
                isVisible={toast.isVisible}
                message={toast.message}
                type={toast.type}
                position="bottom"
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />
            <MessageModal
                isOpen={isMessageModalOpen}
                message={selectedMessage}
                onClose={() => {
                    setIsMessageModalOpen(false);
                    setSelectedMessage(null);
                }}
            />
        </div >
    );
};

export default Dashboard;
