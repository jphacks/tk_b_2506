import liff from '@line/liff'; // 追加
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';
import MessageModal from '../../components/ui/MessageModal';
import Tabs from '../../components/ui/Tabs';
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

function isLineInClient() {
    // LINEアプリ内検出: UA・LIFF環境どちらでもOK
    return /line/i.test(navigator.userAgent) || (window.liff && liff.isInClient && liff.isInClient());
}

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

    const [notifications, setNotifications] = useState([]);
    const [pendingChatParticipantId, setPendingChatParticipantId] = useState(null);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState('info');
    const notificationsLoadedRef = useRef(false);

    const [occupationFilter, setOccupationFilter] = useState('all');

    const showStatusMessage = (message, type = 'info') => {
        if (!message) {
            setStatusMessage('');
            setStatusType('info');
            return;
        }
        const normalizedMessage = typeof message === 'string' ? message : String(message);
        setStatusMessage(normalizedMessage);
        setStatusType(type);
    };

    useEffect(() => {
        if (!statusMessage) {
            return;
        }
        const timer = setTimeout(() => setStatusMessage(''), 5000);
        return () => clearTimeout(timer);
    }, [statusMessage]);

    const getStatusBannerClassName = (type) => {
        switch (type) {
            case 'success':
                return 'border-primary/30 bg-primary/5 text-primary';
            case 'error':
                return 'border-error/30 bg-error/10 text-error';
            case 'warning':
                return 'border-amber-300 bg-amber-50 text-amber-900';
            default:
                return 'border-border bg-muted/40 text-muted-foreground';
        }
    };

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
            { id: 'location', label: '会場マップ' },
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
        showStatusMessage(`${data.locationName} にチェックインしました！`, 'success');
    };

    const handleScanError = (error) => {
        const message = error?.message || 'QRコードの処理中にエラーが発生しました。';
        showStatusMessage(message, 'error');
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

    const handleLocationUpdate = async (locationId, deskInfo = {}, options = {}) => {
        const { suppressToast = false } = options;
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

            if (!suppressToast) {
                const message = deskInfo.deskLabel
                    ? `${deskInfo.deskLabel}に移動しました！`
                    : '位置情報を更新しました！';

                showStatusMessage(message, 'success');
            }
        } catch (error) {
            console.error('Failed to update location:', error);
            showStatusMessage('位置情報の更新に失敗しました。', 'error');
        }
    };

    const getParticipantDisplayName = (participant) => {
        return (
            participant?.introduction?.name ||
            participant?.introduction?.affiliation ||
            'この参加者'
        );
    };

    const showMissingLocationMessage = (participantName) => {
        showStatusMessage(`${participantName}さんの現在地が設定されていません。`, 'error');
    };

    const visitParticipantLocation = async (participant) => {
        if (!participant) {
            showStatusMessage('参加者の情報を取得できませんでした。', 'error');
            return;
        }

        const targetLocationId = participant?.current_location_id || participant?.location?.id;

        if (!targetLocationId) {
            const participantName = getParticipantDisplayName(participant);
            showMissingLocationMessage(participantName);
            return;
        }

        await handleLocationUpdate(
            targetLocationId,
            {
                mapRegionId: participant.current_map_region_id || null,
                deskLabel: participant.current_map_region?.label || participant.location?.name || null
            },
            { suppressToast: true }
        );
    };

    const markNotificationAsRead = async (notificationId) => {
        if (!notificationId) {
            return;
        }

        try {
            await db.markMeetRequestAsRead(notificationId);

            // ローカル状態も更新
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId ? { ...n, is_read: true } : n
                )
            );
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };
    const handleNotificationClick = async (notification) => {
        setSelectedMessage(notification);
        setIsMessageModalOpen(true);
        await markNotificationAsRead(notification.id);
    };

    const handleNotificationChat = async (notification) => {
        await markNotificationAsRead(notification.id);

        const senderParticipantId = notification.senderParticipantId
            || notification.requestData?.from_participant_id;

        if (!senderParticipantId) {
            showStatusMessage('チャット相手の情報を取得できませんでした。', 'error');
            return;
        }

        setActiveTab('messages');
        setSearchParams({ tab: 'messages' });
        setPendingChatParticipantId(senderParticipantId);
    };

    const fetchParticipantLocationSnapshot = async (participantId) => {
        if (!participantId) {
            return null;
        }

        try {
            const { data, error } = await supabase
                .from('participants')
                .select(`
                    id,
                    user_id,
                    current_location_id,
                    current_map_region_id,
                    current_map_region:map_regions!current_map_region_id(
                        id,
                        label
                    )
                `)
                .eq('id', participantId)
                .single();

            if (error) {
                throw error;
            }

            let locationData = null;
            if (data?.current_location_id) {
                const { data: loc, error: locationError } = await supabase
                    .from('locations')
                    .select('id, name, floor, building, location_type')
                    .eq('id', data.current_location_id)
                    .single();

                if (locationError) {
                    console.error('Failed to fetch location details:', locationError);
                } else {
                    locationData = loc;
                }
            }

            return {
                ...data,
                location: locationData
            };
        } catch (error) {
            console.error('Failed to fetch participant location snapshot:', error);
            return null;
        }
    };

    const handleNotificationVisit = async (notification) => {
        await markNotificationAsRead(notification.id);

        const senderParticipantId = notification.senderParticipantId
            || notification.requestData?.from_participant_id;

        if (!senderParticipantId) {
            showStatusMessage('参加者の場所情報を取得できませんでした。', 'error');
            return;
        }

        let senderParticipant = participants.find((participant) => participant.id === senderParticipantId);

        if (!senderParticipant || (!senderParticipant.current_location_id && !senderParticipant.location?.id)) {
            const snapshot = await fetchParticipantLocationSnapshot(senderParticipantId);
            if (snapshot) {
                senderParticipant = {
                    ...senderParticipant,
                    ...snapshot,
                    current_map_region: snapshot.current_map_region || senderParticipant?.current_map_region,
                    location: snapshot.location || senderParticipant?.location
                };
            }
        }

        await visitParticipantLocation(senderParticipant);
    };

    const handleVisitButtonFromProfile = async (participant) => {
        await visitParticipantLocation(participant);
    };

    const handleModalChat = async () => {
        if (!selectedMessage) return;
        await handleNotificationChat(selectedMessage);
        setIsMessageModalOpen(false);
        setSelectedMessage(null);
    };

    const handleModalVisit = async () => {
        if (!selectedMessage) return;
        await handleNotificationVisit(selectedMessage);
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
                                    title: '新しいメッセージ',
                                    message: messagePreview,
                                    senderName,
                                    senderParticipantId: sender?.id || newRequest.from_participant_id,
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
                        title: 'メッセージ',
                        message: messagePreview,
                        senderName,
                        senderParticipantId: sender?.id || request.from_participant_id,
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

    // LIFF 自動ログイン（liff-entryを導線にしたためデフォルト無効）
    useEffect(() => {
        const enableBootstrap = import.meta.env.VITE_ENABLE_DASHBOARD_LIFF === 'true';
        if (!enableBootstrap) {
            // ダッシュボードからの自動LIFF起動を抑止（ループ防止）
            return;
        }
        // すでにログイン済みなら何もしない（メール/既存フローを尊重）
        if (supabase?.auth?.getUser) {
            // getUser はPromiseを返すため、非同期で確認する
            supabase.auth.getUser().then(({ data }) => {
                if (data?.user) return; // ログイン済み
                bootstrapLiff();
            }).catch(() => bootstrapLiff());
        } else {
            bootstrapLiff();
        }

        async function bootstrapLiff() {
            const liffId = import.meta.env.VITE_LIFF_ID;
            if (!liffId) return;

            try {
                await liff.init({ liffId });

                // LINEアプリ内ならそのまま、外部ブラウザでもLIFFログインを試行（Allow External Browser が有効前提）
                if (!liff.isLoggedIn()) {
                    liff.login({ redirectUri: window.location.href });
                    return;
                }

                const idToken = liff.getIDToken();
                if (!idToken) {
                    // まれにトークンが取れない場合は再ログイン
                    liff.login({ redirectUri: window.location.href });
                    return;
                }

                let profile;
                try {
                    profile = await liff.getProfile();
                } catch (e) {
                    // プロフィール取得失敗時は最低限トークンだけ送る
                    profile = null;
                }

                await fetch('/api/line-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken, lineUserId: profile?.userId || null })
                });

                // 認証セッションを確実に反映
                window.location.reload();
            } catch (e) {
                // LIFFが初期化できない（エンドポイント不一致/外部ブラウザ許可なしなど）場合は既存フローにフォールバック
                console.warn('LIFF bootstrap failed:', e);
                showStatusMessage('LINE連携に失敗しました。通常ログインをご利用ください。', 'warning');
            }
        }
    }, []);

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
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
                {statusMessage && (
                    <div className={`px-4 py-3 rounded-lg border text-sm ${getStatusBannerClassName(statusType)}`}>
                        {statusMessage}
                    </div>
                )}
                <div className="flex justify-end">
                    {currentLocation && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card/70 px-3 py-1 text-sm text-muted-foreground shadow-sm">
                            <Icon name="MapPin" size={16} className="text-primary" />
                            <span className="font-medium">現在地：</span>
                            <span>{currentLocation.name}{mapRegionLabel && `・${mapRegionLabel}`}</span>
                        </span>
                    )}
                </div>
                {
                    !conferenceMeta && !conferencesLoading && (
                        <div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleConferenceReselect}
                            >
                                学会を再選択する
                            </Button>
                        </div>
                    )
                }
                {
                    (conferencesError || locationsError || participantsError) && (
                        <div className="bg-error/10 text-error border border-error/30 rounded-lg px-4 py-3 text-sm">
                            データの取得中にエラーが発生しました。必要に応じてリロードしてください。
                            {conferencesError && (
                                <div className="mt-1">
                                    学会情報: {conferencesError.message}
                                </div>
                            )}
                        </div>
                    )
                }
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
                            onVisitParticipant={handleVisitButtonFromProfile}
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
                            selectedParticipantId={pendingChatParticipantId}
                            onConversationReady={() => setPendingChatParticipantId(null)}
                            onVisitParticipant={handleVisitButtonFromProfile}
                        />
                    )}
                </div>
            </main >
            <MessageModal
                isOpen={isMessageModalOpen}
                message={selectedMessage}
                onClose={() => {
                    setIsMessageModalOpen(false);
                    setSelectedMessage(null);
                }}
                onChat={handleModalChat}
                onVisit={handleModalVisit}
            />
        </div >
    );
};

export default Dashboard;
