import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import MultiSelect from '../../components/ui/MultiSelect';
import Toast from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import { getStoredConferenceId, setStoredConferenceId } from '../../constants/conference';
import useConferences from '../../hooks/useConferences';
import useParticipantProfile from '../../hooks/useParticipantProfile';
import useTags from '../../hooks/useTags';
import FormActions from './components/FormActions';
import FormField from './components/FormField';
import FormHeader from './components/FormHeader';
import VisibilityToggle from './components/VisibilityToggle';

const SelfIntroductionForm = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const preferredConferenceId = location?.state?.preferredConferenceId || '';
    const isEditMode = location?.state?.isEditMode || false;

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        affiliation: '',
        researchTopic: '',
        oneLiner: '',
        occupation: '',
        occupationOther: '' // 追加：その他入力用
    });

    // 興味タグの選択状態（tag IDの配列）
    const [selectedTags, setSelectedTags] = useState([]);

    // UI state
    const [isPublic, setIsPublic] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [errors, setErrors] = useState({});
    const [toast, setToast] = useState({
        isVisible: false,
        message: '',
        type: 'success'
    });
    const [selectedConferenceId, setSelectedConferenceId] = useState(preferredConferenceId || '');
    const [existingIntroductionId, setExistingIntroductionId] = useState(null);

    const {
        data: conferences = [],
        isLoading: isConferencesLoading,
        isError: isConferencesError,
        error: conferencesError
    } = useConferences();

    const {
        data: participantProfile,
        refetch: refetchParticipantProfile
    } = useParticipantProfile(user?.id);

    const {
        data: tags = [],
        isLoading: isTagsLoading,
        isError: isTagsError,
        error: tagsError
    } = useTags();

    const conferenceOptions = useMemo(() => {
        return conferences?.map((conf) => {
            const details = [
                conf?.start_date && conf?.end_date
                    ? `${conf.start_date} ~ ${conf.end_date}`
                    : null,
                conf?.location || null
            ].filter(Boolean).join(' / ');

            return {
                value: conf?.id,
                label: conf?.name,
                description: details || undefined
            };
        }) ?? [];
    }, [conferences]);

    const tagOptions = useMemo(() => {
        return tags?.map((tag) => ({
            value: tag.id,
            label: tag.name,
            description: tag.description || undefined
        })) ?? [];
    }, [tags]);

    useEffect(() => {
        if (!conferences?.length) {
            return;
        }

        const hasValidSelection = selectedConferenceId &&
            conferences.some((conf) => conf?.id === selectedConferenceId);

        if (hasValidSelection) {
            return;
        }

        const candidates = [
            preferredConferenceId,
            participantProfile?.conference_id || null,
            getStoredConferenceId()
        ].filter(Boolean);

        const fallbackConferenceId = candidates.find(candidate =>
            conferences.some(conf => conf?.id === candidate)
        ) || conferences[0]?.id || '';

        if (fallbackConferenceId) {
            setSelectedConferenceId(fallbackConferenceId);
        }
    }, [conferences, participantProfile, preferredConferenceId, selectedConferenceId]);

    // 編集モードの場合、既存の自己紹介データとタグを取得
    useEffect(() => {
        if (!isEditMode || !user?.id) {
            return;
        }

        const loadExistingIntroduction = async () => {
            setIsLoadingData(true);
            try {
                // ユーザーの自己紹介を取得（最新のものを1つ）
                const introductions = await db.getUserIntroductions(user.id, {
                    conferenceId: selectedConferenceId || null
                });

                if (introductions && introductions.length > 0) {
                    const introduction = introductions[0]; // 最新のものを使用

                    // フォームデータに設定
                    setFormData({
                        name: introduction.name || '',
                        affiliation: introduction.affiliation || '',
                        researchTopic: introduction.research_topic || '',
                        oneLiner: introduction.one_liner || '',
                        occupation: introduction.occupation || '',
                        occupationOther: introduction.occupation_other || ''
                    });

                    setIsPublic(introduction.is_public ?? true);
                    setExistingIntroductionId(introduction.id);

                    // 学会IDが設定されている場合は選択
                    if (introduction.conference_id) {
                        setSelectedConferenceId(introduction.conference_id);
                    }
                } else {
                    // 既存データがない場合は新規作成モードに切り替え
                    setToast({
                        isVisible: true,
                        message: '既存の自己紹介が見つかりませんでした。新規作成してください。',
                        type: 'info'
                    });
                }

                // ユーザーの興味タグを取得
                const userInterests = await db.getUserInterests(user.id);
                const tagIds = userInterests.map(interest => interest.tag_id);
                setSelectedTags(tagIds);

            } catch (error) {
                console.error('Failed to load introduction:', error);
                setToast({
                    isVisible: true,
                    message: `データの読み込みに失敗しました: ${error.message}`,
                    type: 'error'
                });
            } finally {
                setIsLoadingData(false);
            }
        };

        loadExistingIntroduction();
    }, [isEditMode, user?.id]);

    // Form validation
    const validateForm = () => {
        const newErrors = {};

        if (!formData?.name?.trim()) {
            newErrors.name = "お名前は必須項目です";
        }

        if (formData?.oneLiner?.length > 120) {
            newErrors.oneLiner = "一言メッセージは120文字以内で入力してください";
        }

        if (!selectedConferenceId) {
            newErrors.conference = "参加する学会を選択してください";
        }

        setErrors(newErrors);
        return Object.keys(newErrors)?.length === 0;
    };

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e?.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (errors?.[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleConferenceChange = (value) => {
        setSelectedConferenceId(value);
        setStoredConferenceId(value);

        if (errors?.conference) {
            setErrors(prev => ({
                ...prev,
                conference: ''
            }));
        }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e?.preventDefault();

        if (!validateForm()) {
            return;
        }

        if (!user?.id) {
            setToast({
                isVisible: true,
                message: 'ログインしてから自己紹介を登録してください。',
                type: 'error'
            });
            return;
        }

        setIsLoading(true);

        try {
            const conferenceIdToUse = selectedConferenceId || null;

            // Prepare data for Supabase (interestsは削除)
            const introductionData = {
                name: formData.name.trim(),
                affiliation: formData.affiliation?.trim() || null,
                research_topic: formData.researchTopic?.trim() || null,
                one_liner: formData.oneLiner?.trim() || null,
                occupation: formData.occupation || null,
                occupation_other: formData.occupationOther?.trim() || null,
                is_public: isPublic,
                conference_id: conferenceIdToUse
            };

            let savedIntroduction;

            // 編集モードか新規作成モードかで処理を分岐
            if (isEditMode && existingIntroductionId) {
                // 更新処理
                savedIntroduction = await db.updateIntroduction(existingIntroductionId, introductionData);

                setToast({
                    isVisible: true,
                    message: '自己紹介を更新しました！',
                    type: 'success'
                });
            } else {
                // 新規作成処理
                introductionData.created_by = user.id || null;
                savedIntroduction = await db.createIntroduction(introductionData);

                setToast({
                    isVisible: true,
                    message: `自己紹介が保存されました！ID: ${savedIntroduction.id.slice(-6)}`,
                    type: 'success'
                });
            }

            console.log(savedIntroduction);

            if (savedIntroduction?.id) {
                setExistingIntroductionId(savedIntroduction.id);
            }

            // ユーザーの興味タグを保存（user_interestsテーブル）
            // 既存のタグをすべて削除してから新しいタグを追加
            try {
                const existingInterests = await db.getUserInterests(user.id);

                // 既存のタグを削除
                for (const interest of existingInterests) {
                    await db.removeUserInterest(user.id, interest.tag_id);
                }

                // 新しく選択されたタグを追加
                for (const tagId of selectedTags) {
                    await db.addUserInterest(user.id, tagId);
                }
            } catch (tagError) {
                console.error('Failed to update user interests:', tagError);
                // タグの保存に失敗してもエラーにはしない（自己紹介は保存されているため）
            }

            const participantIntroductionId = savedIntroduction?.id || existingIntroductionId || null;

            await db.setParticipantConference({
                userId: user.id,
                conferenceId: conferenceIdToUse,
                introductionId: participantIntroductionId
            });
            setStoredConferenceId(conferenceIdToUse);
            refetchParticipantProfile?.();

            // 編集モードの場合はリセットせず、新規作成の場合のみリセット
            if (!isEditMode) {
                handleReset();
            }

            // ダッシュボードに遷移
            if (conferenceIdToUse) {
                setTimeout(() => {
                    navigate(`/dashboard/${conferenceIdToUse}`);
                }, 1000);
            }

        } catch (error) {
            console.error('Error saving introduction:', error);
            setToast({
                isVisible: true,
                message: `保存中にエラーが発生しました: ${error.message}`,
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle form reset
    const handleReset = () => {
        setFormData({
            name: '',
            affiliation: '',
            researchTopic: '',
            oneLiner: '',
            occupation: '',
            occupationOther: ''
        });
        setSelectedTags([]);
        setIsPublic(true);
        setErrors({});
    };

    // Check if form is valid
    const isFormValid =
        formData?.name?.trim()?.length > 0 &&
        formData?.oneLiner?.length <= 120 &&
        Boolean(selectedConferenceId);

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-2xl mx-auto">
                    {/* Form Header */}
                    <FormHeader className="mb-8" isEditMode={isEditMode} />

                    {/* データ読み込み中の表示 */}
                    {isLoadingData && (
                        <div className="bg-card border border-border rounded-xl p-6 shadow-soft text-center">
                            <div className="flex flex-col items-center space-y-3">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <p className="text-sm text-muted-foreground">自己紹介データを読み込み中...</p>
                            </div>
                        </div>
                    )}

                    {/* Main Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-card border border-border rounded-xl p-6 shadow-soft space-y-6">
                            <Select
                                label="参加する学会"
                                name="conference"
                                value={selectedConferenceId}
                                onChange={handleConferenceChange}
                                options={conferenceOptions}
                                placeholder="学会を選択してください"
                                required
                                searchable
                                loading={isConferencesLoading}
                                disabled={isConferencesLoading && !conferenceOptions?.length}
                                error={
                                    errors?.conference ||
                                    (isConferencesError
                                        ? (conferencesError?.message || '学会リストの取得に失敗しました')
                                        : undefined)
                                }
                                description={
                                    isConferencesError
                                        ? undefined
                                        : "参加予定の学会を選択してください"
                                }
                            />

                            {/* Name Field - Required */}
                            <FormField
                                type="text"
                                label="お名前"
                                name="name"
                                value={formData?.name}
                                onChange={handleInputChange}
                                placeholder="山田太郎"
                                required
                                error={errors?.name}
                                description="学会での表示名として使用されます"
                            />

                            {/* Affiliation Field - Optional */}
                            <FormField
                                type="text"
                                label="所属"
                                name="affiliation"
                                value={formData?.affiliation}
                                onChange={handleInputChange}
                                placeholder="東京大学 工学部"
                                description="大学、企業、研究機関など"
                                error={errors?.affiliation}
                                maxLength={undefined}
                            />
                            {/* 職業: 選択式、その他の場合は入力を表示 */}
                            <FormField
                                label="職業"
                                name="occupation"
                                error={errors?.occupation}
                                description="当てはまる職業を選択してください（「その他」を選んだ場合は具体的に記入）"
                            >
                                <select
                                    name="occupation"
                                    value={formData.occupation}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="" disabled>選択してください</option>
                                    <option value="学士課程">学士課程</option>
                                    <option value="修士課程">修士課程</option>
                                    <option value="博士課程">博士課程</option>
                                    <option value="ポスドク">ポスドク</option>
                                    <option value="教員">教員</option>
                                    <option value="研究者">研究者</option>
                                    <option value="企業">企業</option>
                                    <option value="スタッフ">スタッフ</option>
                                    <option value="その他">その他</option>
                                </select>

                                {formData.occupation === 'その他' && (
                                    <Input
                                        name="occupationOther"
                                        value={formData.occupationOther}
                                        onChange={handleInputChange}
                                        placeholder="具体的に入力してください（例: フリーランス）"
                                        className="mt-2"
                                    />
                                )}
                            </FormField>

                            {/* Research Topic Field - Optional */}
                            <FormField
                                type="text"
                                label="研究テーマ"
                                name="researchTopic"
                                value={formData?.researchTopic}
                                onChange={handleInputChange}
                                placeholder="機械学習を用いた画像認識"
                                description="現在取り組んでいる研究分野"
                                error={errors?.researchTopic}
                                maxLength={undefined}
                            />

                            {/* Interests Field - MultiSelect */}
                            <MultiSelect
                                label="興味・関心"
                                name="interests"
                                options={tagOptions}
                                value={selectedTags}
                                onChange={setSelectedTags}
                                placeholder="興味のあるタグを選択してください"
                                description="複数選択可能です。選択したタグに基づいて関連する発表が推奨されます"
                                loading={isTagsLoading}
                                error={
                                    isTagsError
                                        ? (tagsError?.message || 'タグリストの取得に失敗しました')
                                        : undefined
                                }
                            />

                            {/* One-liner Message Field - Optional with character limit */}
                            <FormField
                                type="text"
                                label="一言メッセージ"
                                name="oneLiner"
                                value={formData?.oneLiner}
                                onChange={handleInputChange}
                                placeholder="研究を通じて社会に貢献したいと思っています！"
                                error={errors?.oneLiner}
                                description="参加者への簡単な挨拶やメッセージ"
                                maxLength={120}
                                showCharacterCounter={true}
                            />
                        </div>

                        {/* Visibility Toggle */}
                        <VisibilityToggle
                            isPublic={isPublic}
                            onChange={setIsPublic}
                        />

                        {/* Form Actions */}
                        <FormActions
                            onSubmit={handleSubmit}
                            onReset={handleReset}
                            isLoading={isLoading}
                            isValid={isFormValid}
                            isEditMode={isEditMode}
                        />
                    </form>
                </div>
            </main>
            {/* Toast Notification */}
            <Toast
                message={toast?.message}
                type={toast?.type}
                isVisible={toast?.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
                duration={5000}
                position="top"
            />
        </div>
    );
};

export default SelfIntroductionForm;
