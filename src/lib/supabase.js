import { createClient } from '@supabase/supabase-js';

// Supabase設定
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://norgtcdqffgbtqfytmrb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vcmd0Y2RxZmZnYnRxZnl0bXJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3Mzk2MDYsImV4cCI6MjA3NjMxNTYwNn0.M6dnFhI86UwfjSFIS7Kl1fC1kOM1uHpWys1GqcvBwAI';

// Supabaseクライアントを作成
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// データベース操作のヘルパー関数
export const db = {
    // 学会一覧を取得
    async getConferences(options = {}) {
        const { includeInactive = false } = options;

        let query = supabase
            .from('conferences')
            .select('id, name, description, start_date, end_date, location, is_active');

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
    async setParticipantConference({ userId, conferenceId }) {
        if (!userId || !conferenceId) {
            throw new Error('participant conference update requires userId and conferenceId.');
        }

        const existing = await db.getParticipantByUser(userId);

        if (existing?.id) {
            const { data, error } = await supabase
                .from('participants')
                .update({
                    conference_id: conferenceId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        }

        const { data, error } = await supabase
            .from('participants')
            .insert({
                user_id: userId,
                conference_id: conferenceId,
                registered_at: new Date().toISOString()
            })
            .select()
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    // パスワード検証付きで学会に参加登録
    async joinConferenceWithPassword({ userId, conferenceId, password, introductionId = null }) {
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

        // 参加登録または更新
        if (existing?.id) {
            const { data, error } = await supabase
                .from('participants')
                .update({
                    conference_id: conferenceId,
                    introduction_id: introductionId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        }

        const { data, error } = await supabase
            .from('participants')
            .insert({
                user_id: userId,
                conference_id: conferenceId,
                introduction_id: introductionId,
                registered_at: new Date().toISOString()
            })
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

    // サインアウト
    async signOut() {
        const { error } = await supabase.auth.signOut();
        return { error };
    }
};
