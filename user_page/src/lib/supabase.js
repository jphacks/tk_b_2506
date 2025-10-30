import { createClient } from '@supabase/supabase-js';

// デバッグログの制御（開発環境では常に有効）
const DEBUG_REALTIME = import.meta.env.VITE_DEBUG_REALTIME === 'true' || import.meta.env.DEV;

const debugLog = (message, ...args) => {
    if (DEBUG_REALTIME) {
        console.log(message, ...args);
    }
};

// Supabase設定
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;


// Supabaseクライアントを作成（Realtimeを有効化）
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

// データベース操作のヘルパー関数
export const db = {
    // 学会一覧を取得
    async getConferences(options = {}) {
        const { includeInactive = false } = options;

        let query = supabase
            .from('conferences')
            .select('id, name, description, start_date, end_date, location, is_active, join_password');

        if (!includeInactive) {
            query = query.eq('is_active', true);
        }

        query = query.order('start_date', { ascending: true });

        const { data, error } = await query;

        if (error) throw error;
        return data ?? [];
    },

    // 自己紹介を取得
    async getIntroductions() {
        const { data, error } = await supabase
            .from('introductions')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    // ユーザーの自己紹介を取得
    async getUserIntroductions(userId, options = {}) {
        const { conferenceId = null } = options;

        const buildBaseQuery = () => supabase
            .from('introductions')
            .select('*')
            .eq('created_by', userId)
            .order('created_at', { ascending: false });

        let response;
        if (conferenceId) {
            response = await buildBaseQuery().eq('conference_id', conferenceId);

            // 古いスキーマで conference_id カラムが存在しない場合はフィルタなしで再取得
            if (response?.error?.message?.includes('introductions.conference_id')) {
                console.warn(
                    '[db.getUserIntroductions] conference_id column not found on introductions. ' +
                    'Fallback to non-filtered query. Please apply migration 010_add_conference_reference_to_introductions.'
                );
                response = await buildBaseQuery();
            }
        } else {
            response = await buildBaseQuery();
        }

        const { data, error } = response;

        if (error) throw error;
        return data;
    },

    // 参加者プロフィールを取得
    async getParticipantByUser(userId) {
        if (!userId) {
            return null;
        }

        const { data, error } = await supabase
            .from('participants')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        return data;
    },

    // 参加者の学会選択を保存
    async setParticipantConference({ userId, conferenceId, introductionId = undefined }) {
        if (!userId || !conferenceId) {
            throw new Error('participant conference update requires userId and conferenceId.');
        }

        const existing = await db.getParticipantByUser(userId);
        const updatePayload = {
            conference_id: conferenceId,
            updated_at: new Date().toISOString()
        };
        const insertPayload = {
            user_id: userId,
            conference_id: conferenceId,
            registered_at: new Date().toISOString()
        };

        if (introductionId !== undefined) {
            updatePayload.introduction_id = introductionId;
            insertPayload.introduction_id = introductionId;
        }

        if (existing?.id) {
            const { data, error } = await supabase
                .from('participants')
                .update(updatePayload)
                .eq('id', existing.id)
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        }

        const { data, error } = await supabase
            .from('participants')
            .insert(insertPayload)
            .select()
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    // パスワード検証付きで学会に参加登録
    async joinConferenceWithPassword({ userId, conferenceId, password, introductionId = undefined }) {
        if (!userId || !conferenceId) {
            throw new Error('userId and conferenceId are required.');
        }

        // 学会情報とパスワードを取得
        const { data: conference, error: confError } = await supabase
            .from('conferences')
            .select('join_password, name')
            .eq('id', conferenceId)
            .single();

        if (confError) {
            throw new Error('学会が見つかりませんでした');
        }

        // パスワードが設定されている場合は検証
        if (conference.join_password && conference.join_password.trim() !== '') {
            if (!password) {
                throw new Error('この学会への参加にはパスワードが必要です');
            }
            if (conference.join_password !== password.trim()) {
                throw new Error('パスワードが正しくありません');
            }
        }

        // 既に参加済みかチェック
        const existing = await db.getParticipantByUser(userId);

        let resolvedIntroductionId = introductionId;
        let shouldUpdateIntroduction = introductionId !== undefined;

        if (resolvedIntroductionId === undefined) {
            const introductions = await db.getUserIntroductions(userId, { conferenceId });
            const latestIntroduction = introductions?.[0] || null;

            if (latestIntroduction?.id) {
                resolvedIntroductionId = latestIntroduction.id;
                shouldUpdateIntroduction = true;
            }
        }

        const updatePayload = {
            conference_id: conferenceId,
            updated_at: new Date().toISOString()
        };

        if (shouldUpdateIntroduction) {
            updatePayload.introduction_id = resolvedIntroductionId ?? null;
        }

        const insertPayload = {
            user_id: userId,
            conference_id: conferenceId,
            registered_at: new Date().toISOString()
        };

        if (shouldUpdateIntroduction) {
            insertPayload.introduction_id = resolvedIntroductionId ?? null;
        }

        // 参加登録または更新
        if (existing?.id) {
            const { data, error } = await supabase
                .from('participants')
                .update(updatePayload)
                .eq('id', existing.id)
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        }

        const { data, error } = await supabase
            .from('participants')
            .insert(insertPayload)
            .select()
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    // 自己紹介を作成
    async createIntroduction(introductionData) {
        const insert = async (payload) => supabase
            .from('introductions')
            .insert([payload])
            .select()
            .single();

        let response = await insert(introductionData);

        if (response?.error?.message?.includes('introductions.conference_id')) {
            console.warn(
                '[db.createIntroduction] conference_id column not found on introductions. ' +
                'Retrying without conference_id. Please apply migration 010_add_conference_reference_to_introductions.'
            );
            const fallbackPayload = { ...introductionData };
            delete fallbackPayload.conference_id;
            response = await insert(fallbackPayload);
        }

        const { data, error } = response;

        if (error) throw error;
        return data;
    },

    // 自己紹介を更新
    async updateIntroduction(id, updates) {
        const update = async (payload) => supabase
            .from('introductions')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        let response = await update(updates);

        if (response?.error?.message?.includes('introductions.conference_id')) {
            console.warn(
                '[db.updateIntroduction] conference_id column not found on introductions. ' +
                'Retrying without conference_id. Please apply migration 010_add_conference_reference_to_introductions.'
            );
            const fallbackPayload = { ...updates };
            delete fallbackPayload.conference_id;
            response = await update(fallbackPayload);
        }

        const { data, error } = response;

        if (error) throw error;
        return data;
    },

    // 自己紹介を削除
    async deleteIntroduction(id) {
        const { error } = await supabase
            .from('introductions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // 自己紹介を検索
    async searchIntroductions(searchTerm) {
        const { data, error } = await supabase
            .rpc('search_introductions_by_interests', { search_term: searchTerm });

        if (error) throw error;
        return data;
    },

    // タグ一覧を取得
    async getTags() {
        const { data, error } = await supabase
            .from('tags')
            .select('id, name, description')
            .order('name');

        if (error) throw error;
        return data ?? [];
    },

    // ユーザーの興味タグを取得
    async getUserInterests(userId) {
        const { data, error } = await supabase
            .from('user_interests')
            .select(`
                id,
                tag_id,
                tags (
                    id,
                    name,
                    description
                )
            `)
            .eq('user_id', userId);

        if (error) throw error;
        return data ?? [];
    },

    // ユーザーの興味タグを追加
    async addUserInterest(userId, tagId) {
        const { data, error } = await supabase
            .from('user_interests')
            .insert({
                user_id: userId,
                tag_id: tagId
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ユーザーの興味タグを削除
    async removeUserInterest(userId, tagId) {
        const { error } = await supabase
            .from('user_interests')
            .delete()
            .eq('user_id', userId)
            .eq('tag_id', tagId);

        if (error) throw error;
    },

    // ユーザーの興味に基づいてプレゼンテーションを検索
    async searchPresentationsByUserInterests(userId, conferenceId) {
        const { data, error } = await supabase
            .rpc('search_presentations_by_user_interests', {
                p_user_id: userId,
                p_conference_id: conferenceId
            });

        if (error) throw error;
        return data ?? [];
    },

    // プレゼンテーション一覧を取得（学会別）
    async getPresentations(conferenceId, options = {}) {
        const { presentationType = null } = options;

        let query = supabase
            .from('presentations')
            .select('*')
            .eq('conference_id', conferenceId)
            .order('scheduled_at', { ascending: true, nullsFirst: false });

        if (presentationType) {
            query = query.eq('presentation_type', presentationType);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data ?? [];
    },

    async createMeetRequest({ conferenceId, fromParticipantId, toParticipantId, message }) {
        if (!conferenceId || !fromParticipantId || !toParticipantId) {
            throw new Error('conferenceId, fromParticipantId, toParticipantId は必須です。');
        }

        debugLog('[db.createMeetRequest] ミートリクエスト作成開始:', {
            conferenceId,
            fromParticipantId,
            toParticipantId,
            message: message?.trim() || null
        });

        const payload = {
            conference_id: conferenceId,
            from_participant_id: fromParticipantId,
            to_participant_id: toParticipantId,
            status: 'pending',
            message: message?.trim() ? message.trim() : null,
            is_read: false
            // created_atは自動生成されるため削除
        };

        debugLog('[db.createMeetRequest] 送信するペイロード:', payload);

        // 複数の通知を許可するため、insertを使用
        const { data, error } = await supabase
            .from('participant_meet_requests')
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error('[db.createMeetRequest] エラー詳細:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            throw error;
        }

        debugLog('[db.createMeetRequest] 作成成功:', data);

        // LINE通知を送信（受信者がLINE認証している場合のみ）
        try {
            // 受信者のLINE認証状況を確認
            const { data: recipient, error: recipientError } = await supabase
                .from('participants')
                .select('line_user_id')
                .eq('id', toParticipantId)
                .single();

            debugLog('[db.createMeetRequest] 受信者データ取得結果:', {
                recipient,
                recipientError,
                toParticipantId
            });

            // 受信者の詳細情報も取得してデバッグ
            const { data: recipientDetail, error: detailError } = await supabase
                .from('participants')
                .select('user_id, line_user_id, conference_id')
                .eq('id', toParticipantId)
                .single();

            debugLog('[db.createMeetRequest] 受信者詳細情報:', {
                recipientDetail,
                detailError
            });

            if (!recipientError && recipient?.line_user_id) {
                debugLog('[db.createMeetRequest] 受信者がLINE認証済み、通知を送信します');
                await sendLineNotification({
                    participantId: toParticipantId,
                    message: `新しいミートリクエストが届きました！\n\n${message || 'メッセージなし'}`,
                    type: 'meet_request'
                });
                debugLog('[db.createMeetRequest] LINE通知送信成功');
            } else {
                debugLog('[db.createMeetRequest] 受信者がLINE認証していないため、LINE通知をスキップ', {
                    hasRecipient: !!recipient,
                    hasLineUserId: !!recipient?.line_user_id,
                    recipientError
                });
            }
        } catch (notificationError) {
            console.error('[db.createMeetRequest] LINE通知送信エラー:', notificationError);
            // 通知エラーはミートリクエスト作成を妨げない
        }

        return data;
    },

    // ミートリクエストを既読にする
    async markMeetRequestAsRead(requestId) {
        if (!requestId) {
            throw new Error('requestId は必須です。');
        }

        debugLog('[db.markMeetRequestAsRead] 既読処理開始:', { requestId });

        const { data, error } = await supabase
            .from('participant_meet_requests')
            .update({ is_read: true, updated_at: new Date().toISOString() })
            .eq('id', requestId)
            .select()
            .maybeSingle();

        if (error) {
            console.error('[db.markMeetRequestAsRead] エラー:', error);
            throw error;
        }

        debugLog('[db.markMeetRequestAsRead] 既読処理成功:', data);
        return data;
    },

    // ユーザーの未読ミートリクエストを取得
    async getUnreadMeetRequests(participantId) {
        if (!participantId) {
            throw new Error('participantId は必須です。');
        }

        debugLog('[db.getUnreadMeetRequests] 未読リクエスト取得開始:', { participantId });

        const { data, error } = await supabase
            .from('participant_meet_requests')
            .select('*')
            .eq('to_participant_id', participantId)
            .eq('is_read', false)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[db.getUnreadMeetRequests] エラー:', error);
            throw error;
        }

        debugLog('[db.getUnreadMeetRequests] 未読リクエスト取得成功:', data);
        return data || [];
    }
};

// LINE通知送信関数
export const sendLineNotification = async ({ participantId, message, type = 'meet_request' }) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-line-notification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
                participantId,
                message,
                type
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`LINE通知送信に失敗しました: ${errorData}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('LINE通知送信エラー:', error);
        throw error;
    }
};

// リアルタイム監視ヘルパー関数
export const realtime = {
    /**
     * ミートリクエストのリアルタイム監視を開始
     * @param {string} participantId - 監視対象の参加者ID
     * @param {function} onNewRequest - 新しいリクエストを受信した際のコールバック関数
     * @returns {function} クリーンアップ関数（unsubscribe用）
     */
    async subscribeMeetRequests(participantId, onNewRequest) {
        debugLog('[realtime.subscribeMeetRequests] 開始:', { participantId, onNewRequest: typeof onNewRequest });

        if (!participantId) {
            console.warn('[realtime.subscribeMeetRequests] participantId is required');
            return () => { };
        }

        // 既存のチャンネルをチェックして重複を防ぐ
        const channelName = `meet-requests-to-${participantId}`;
        const existingChannels = supabase.realtime.getChannels();
        const existingChannel = existingChannels.find(ch => ch.topic === `realtime:${channelName}`);

        if (existingChannel) {
            debugLog('[realtime.subscribeMeetRequests] 既存のチャンネルが見つかりました:', existingChannel.topic);
            return () => supabase.removeChannel(existingChannel);
        }

        const channel = supabase.channel(channelName);
        debugLog('[realtime.subscribeMeetRequests] チャンネル作成:', channel);

        // Realtime接続状態を詳細に確認
        const realtimeClient = supabase.realtime;
        debugLog('[realtime.subscribeMeetRequests] Realtime接続状態詳細:', {
            isConnected: realtimeClient.isConnected(),
            connectionState: realtimeClient.connectionState(),
            endpointURL: realtimeClient.endpointURL,
            channels: realtimeClient.getChannels().map(ch => ({
                topic: ch.topic,
                state: ch.state
            }))
        });

        // Realtime接続を強制的に確立
        if (!realtimeClient.isConnected()) {
            debugLog('[realtime.subscribeMeetRequests] Realtime接続を開始中...');
            try {
                await realtimeClient.connect();
                debugLog('[realtime.subscribeMeetRequests] Realtime接続開始');

                // 接続完了を待機（ポーリングで確認）
                let retryCount = 0;
                const maxRetries = 10;
                while (retryCount < maxRetries && !realtimeClient.isConnected()) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    retryCount++;
                    debugLog(`[realtime.subscribeMeetRequests] 接続待機中... (${retryCount}/${maxRetries})`);
                }

                debugLog('[realtime.subscribeMeetRequests] 接続状態確認:', {
                    isConnected: realtimeClient.isConnected(),
                    connectionState: realtimeClient.connectionState(),
                    retryCount
                });
            } catch (error) {
                console.error('[realtime.subscribeMeetRequests] Realtime接続エラー:', error);
            }
        } else {
            debugLog('[realtime.subscribeMeetRequests] Realtimeは既に接続済み');
        }

        // イベントハンドラーを統合
        const handleMeetRequestEvent = async (payload, eventType) => {
            debugLog(`[realtime.subscribeMeetRequests] ${eventType}イベントを受信:`, payload);

            const newRequest = payload?.new;
            if (!newRequest) {
                debugLog('[realtime.subscribeMeetRequests] newRequestが存在しません');
                return;
            }

            debugLog('[realtime.subscribeMeetRequests] 新しいリクエスト:', newRequest);

            // 自分自身からのリクエストは無視
            if (newRequest.from_participant_id === participantId) {
                debugLog('[realtime.subscribeMeetRequests] 自分自身からのリクエストのため無視');
                return;
            }

            debugLog('[realtime.subscribeMeetRequests] コールバック関数を実行中...');
            // コールバック関数を実行
            if (typeof onNewRequest === 'function') {
                onNewRequest(newRequest);
                debugLog('[realtime.subscribeMeetRequests] コールバック関数実行完了');
            } else {
                console.warn('[realtime.subscribeMeetRequests] onNewRequestが関数ではありません:', typeof onNewRequest);
            }
        };

        // INSERTとUPDATEイベントを監視
        channel
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'participant_meet_requests',
                filter: `to_participant_id=eq.${participantId}`
            }, (payload) => handleMeetRequestEvent(payload, 'INSERT'))
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'participant_meet_requests',
                filter: `to_participant_id=eq.${participantId}`
            }, (payload) => handleMeetRequestEvent(payload, 'UPDATE'))
            .subscribe((status) => {
                debugLog(`[realtime.subscribeMeetRequests] チャンネル状態変更:`, status);
                if (status === 'SUBSCRIBED') {
                    debugLog(`[Realtime] Successfully subscribed to meet requests for participant ${participantId}`);
                    debugLog(`[Realtime] 監視対象テーブル: participant_meet_requests`);
                    debugLog(`[Realtime] 監視対象フィルター: to_participant_id=eq.${participantId}`);
                    debugLog(`[Realtime] 監視イベント: INSERT, UPDATE`);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error(`[Realtime] Channel error for participant ${participantId}`);
                } else if (status === 'TIMED_OUT') {
                    console.error(`[Realtime] Channel timeout for participant ${participantId}`);
                } else if (status === 'CLOSED') {
                    debugLog(`[Realtime] Channel closed for participant ${participantId}`);
                }
            });

        // クリーンアップ関数を返す
        return () => {
            debugLog('[realtime.subscribeMeetRequests] チャンネルを削除中...');
            supabase.removeChannel(channel);
        };
    }
};

// 認証ヘルパー関数
export const auth = {
    // 現在のユーザーを取得
    async getCurrentUser() {
        const { data, error } = await supabase.auth.getUser();
        return { data, error };
    },

    // サインアップ
    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        return { data, error };
    },

    // サインイン
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { data, error };
    },

    // LINE認証（LIFF + Edge Function）
    async loginWithLine() {
        try {
            const liff = await import('@line/liff');

            await liff.default.init({ liffId: import.meta.env.VITE_LIFF_ID });
            if (!liff.default.isLoggedIn()) await liff.default.login();

            const idToken = liff.default.getIDToken();
            const p = await liff.default.getProfile();

            const resp = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-login`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({
                        id_token: idToken,
                        line_user_id: p.userId,
                        name: p.displayName,
                        picture: p.pictureUrl,
                        redirect_to: `${window.location.origin}/auth/callback`,
                    }),
                }
            );

            if (!resp.ok) {
                console.error('line-login failed:', await resp.text());
                alert('LINEログインに失敗しました');
                return;
            }

            const { url } = await resp.json();
            window.location.href = url;
        } catch (e) {
            console.error(e);
            alert('LINEログイン処理でエラーが発生しました');
        }
    },


    // サインアウト
    async signOut() {
        const { error } = await supabase.auth.signOut();
        return { error };
    }
};
