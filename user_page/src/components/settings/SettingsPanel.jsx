import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useConferences from '../../hooks/useConferences';
import { db, supabase } from '../../lib/supabase';
import VisibilityToggle from '../../pages/self-introduction-form/components/VisibilityToggle';
import { cn } from '../../utils/cn';
import {
    deriveAffiliationFromProfile,
    deriveAffiliationOptionsFromResearchExperience,
    deriveOccupation,
    deriveResearcherName,
    normalizeResearcherId
} from '../../utils/researchmap';
import Icon from '../AppIcon';
import Button from '../ui/Button';
import Input from '../ui/Input';
import MultiSelect from '../ui/MultiSelect';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Toast from '../ui/Toast';
import AffiliationCandidates from '../researchmap/AffiliationCandidates';

const initialIntroForm = {
    name: '',
    affiliation: '',
    researchTopic: '',
    comment: '',
    occupation: '',
    occupationOther: ''
};

const occupationOptions = [
    { value: '学士課程', label: '学士課程' },
    { value: '修士課程', label: '修士課程' },
    { value: '博士課程', label: '博士課程' },
    { value: 'ポスドク', label: 'ポスドク' },
    { value: '教員', label: '教員' },
    { value: '研究者', label: '研究者' },
    { value: '企業', label: '企業' },
    { value: 'スタッフ', label: 'スタッフ' },
    { value: 'その他', label: 'その他' }
];

const initialPasswordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
};

const SettingsPanel = ({ isOpen, onClose, user, onLogout, onConferenceSwitch, conferenceName }) => {
    const panelRef = useRef(null);
    const [introForm, setIntroForm] = useState(initialIntroForm);
    const [introErrors, setIntroErrors] = useState({});
    const [introId, setIntroId] = useState(null);
    const [conferenceId, setConferenceId] = useState(null);
    const [isPublic, setIsPublic] = useState(true);
    const [isIntroLoading, setIsIntroLoading] = useState(false);
    const [isSavingIntro, setIsSavingIntro] = useState(false);
    const [introLoadError, setIntroLoadError] = useState(null);
    const [tags, setTags] = useState([]);
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    const [isTagsLoading, setIsTagsLoading] = useState(false);
    const [tagLoadError, setTagLoadError] = useState(null);
    const [researcherId, setResearcherId] = useState('');
    const [researcherFetchError, setResearcherFetchError] = useState('');
    const [isFetchingResearcher, setIsFetchingResearcher] = useState(false);
    const [researcherAffiliationOptions, setResearcherAffiliationOptions] = useState([]);
    const [selectedResearcherAffiliationOption, setSelectedResearcherAffiliationOption] = useState('');

    const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
    const [passwordErrors, setPasswordErrors] = useState({});
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);

    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showConferenceConfirm, setShowConferenceConfirm] = useState(false);
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);

    const [toast, setToast] = useState({
        isVisible: false,
        message: '',
        type: 'success'
    });

    const { data: conferences = [] } = useConferences({ includeInactive: true });

    // conferenceId から conferenceName を取得
    const derivedConferenceName = useMemo(() => {
        if (conferenceName) return conferenceName;
        if (!conferenceId) return '';
        const conf = conferences.find(c => String(c.id) === String(conferenceId));
        return conf?.name || '';
    }, [conferenceName, conferenceId, conferences]);

    // Prevent background scroll when modal is open
    useEffect(() => {
        if (!isOpen || typeof document === 'undefined') {
            return;
        }
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    // Fetch introduction when panel opens
    useEffect(() => {
        if (!isOpen || !user?.id) {
            return;
        }

        let isMounted = true;

        const loadIntroduction = async () => {
            setIsIntroLoading(true);
            setIntroLoadError(null);
            try {
                const introductions = await db.getUserIntroductions(user.id);
                if (!isMounted) {
                    return;
                }

                if (introductions?.length) {
                    const introduction = introductions[0];
                    setIntroId(introduction.id);
                    setConferenceId(introduction.conference_id || null);
                    setIsPublic(introduction.is_public ?? true);
                    setIntroForm({
                        name: introduction.name || '',
                        affiliation: introduction.affiliation || '',
                        researchTopic: introduction.research_topic || '',
                        comment: introduction.one_liner || '',
                        occupation: introduction.occupation || '',
                        occupationOther: introduction.occupation_other || ''
                    });
                } else {
                    setIntroId(null);
                    setConferenceId(null);
                    setIsPublic(true);
                    setIntroForm({ ...initialIntroForm });
                }
                setIntroErrors({});
            } catch (error) {
                if (isMounted) {
                    setIntroLoadError(error.message || '自己紹介の読み込みに失敗しました。');
                }
            } finally {
                if (isMounted) {
                    setIsIntroLoading(false);
                }
            }
        };

        loadIntroduction();

        return () => {
            isMounted = false;
        };
    }, [isOpen, user?.id]);

    useEffect(() => {
        if (!isOpen || !user?.id) {
            return;
        }

        let isMounted = true;

        const loadTags = async () => {
            setIsTagsLoading(true);
            setTagLoadError(null);

            try {
                const [fetchedTags, userInterests] = await Promise.all([
                    db.getTags(),
                    db.getUserInterests(user.id)
                ]);

                if (!isMounted) {
                    return;
                }

                setTags(fetchedTags ?? []);
                setSelectedTagIds(userInterests?.map((interest) => interest.tag_id) ?? []);
            } catch (error) {
                if (isMounted) {
                    setTags([]);
                    setSelectedTagIds([]);
                    setTagLoadError(error.message || '興味タグの読み込みに失敗しました。');
                }
            } finally {
                if (isMounted) {
                    setIsTagsLoading(false);
                }
            }
        };

        loadTags();

        return () => {
            isMounted = false;
        };
    }, [isOpen, user?.id]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setResearcherId('');
        setResearcherFetchError('');
        setIsFetchingResearcher(false);
        setResearcherAffiliationOptions([]);
        setSelectedResearcherAffiliationOption('');
    }, [isOpen]);

    const tagOptions = useMemo(() => {
        return tags.map((tag) => ({
            value: tag.id,
            label: tag.name,
            description: tag.description || undefined
        }));
    }, [tags]);

    const showToast = (message, type = 'success') => {
        setToast({
            isVisible: true,
            message,
            type
        });
    };

    const handleResearcherIdChange = (event) => {
        const value = event?.target?.value ?? '';
        setResearcherId(value);

        if (researcherFetchError) {
            setResearcherFetchError('');
        }
    };

    const handleResearcherAffiliationOptionSelect = (valueOrEvent) => {
        const nextValue = typeof valueOrEvent === 'string'
            ? valueOrEvent
            : valueOrEvent?.target?.value ?? '';
        setSelectedResearcherAffiliationOption(nextValue);

        if (!nextValue) {
            return;
        }

        const selectedOption = researcherAffiliationOptions.find(
            (option) => option?.value === nextValue
        );

        if (!selectedOption) {
            return;
        }

        setIntroForm((prev) => ({
            ...prev,
            affiliation: selectedOption.affiliation
        }));

        setIntroErrors((prev) => {
            if (!prev?.affiliation) {
                return prev;
            }
            return {
                ...prev,
                affiliation: ''
            };
        });
    };

    const handleResearcherFetch = async () => {
        const normalizedId = normalizeResearcherId(researcherId);

        if (!normalizedId) {
            setResearcherFetchError('researcher_idを入力してください。');
            setResearcherAffiliationOptions([]);
            setSelectedResearcherAffiliationOption('');
            return;
        }

        setIsFetchingResearcher(true);
        setResearcherFetchError('');
        setResearcherAffiliationOptions([]);
        setSelectedResearcherAffiliationOption('');

        try {
            const response = await fetch(`https://api.researchmap.jp/${encodeURIComponent(normalizedId)}?format=json`);

            if (!response.ok) {
                throw new Error('researchmapから情報を取得できませんでした。IDをご確認ください。');
            }

            const profileData = await response.json();

            const derivedName = deriveResearcherName(profileData);
            const {
                affiliation: affiliationFromResearchExperience,
                options: affiliationOptions
            } = deriveAffiliationOptionsFromResearchExperience(profileData);
            const derivedAffiliation = affiliationFromResearchExperience || deriveAffiliationFromProfile(profileData);
            const hasMultipleAffiliationCandidates = affiliationOptions.length > 1;
            const singleAffiliationCandidate = affiliationOptions.length === 1 ? affiliationOptions[0] : null;
            const shouldApplyDerivedAffiliation = Boolean(derivedAffiliation && !hasMultipleAffiliationCandidates);
            const shouldApplySingleCandidateAffiliation = Boolean(!hasMultipleAffiliationCandidates && singleAffiliationCandidate?.affiliation);
            const { occupationValue, occupationOtherValue } = deriveOccupation(profileData);
            const hasDerivedValue = Boolean(
                derivedName ||
                shouldApplyDerivedAffiliation ||
                shouldApplySingleCandidateAffiliation ||
                hasMultipleAffiliationCandidates ||
                occupationValue ||
                occupationOtherValue
            );

            setIntroForm((prev) => {
                const next = { ...prev };

                if (derivedName) {
                    next.name = derivedName;
                }

                if (shouldApplyDerivedAffiliation) {
                    next.affiliation = derivedAffiliation;
                } else if (shouldApplySingleCandidateAffiliation) {
                    next.affiliation = singleAffiliationCandidate.affiliation;
                }

                if (occupationValue) {
                    next.occupation = occupationValue;
                    next.occupationOther = occupationValue === 'その他'
                        ? (occupationOtherValue || prev.occupationOther || '')
                        : '';
                } else if (occupationOtherValue) {
                    next.occupationOther = occupationOtherValue;
                }

                return next;
            });

            setIntroErrors((prev) => {
                if (!prev) {
                    return prev;
                }

                let hasChanges = false;
                const next = { ...prev };

                if (derivedName && next.name) {
                    next.name = '';
                    hasChanges = true;
                }

                if ((shouldApplyDerivedAffiliation || shouldApplySingleCandidateAffiliation) && next.affiliation) {
                    next.affiliation = '';
                    hasChanges = true;
                }

                if (occupationValue && next.occupation) {
                    next.occupation = '';
                    hasChanges = true;
                }

                if (next.occupationOther && (
                    (occupationValue && occupationValue !== 'その他') ||
                    (occupationValue === 'その他' && occupationOtherValue)
                )) {
                    next.occupationOther = '';
                    hasChanges = true;
                }

                return hasChanges ? next : prev;
            });

            const formattedAffiliationOptions = hasMultipleAffiliationCandidates
                ? affiliationOptions.map((option, index) => ({
                    ...option,
                    rawLabel: option.rawLabel || option.label || option.affiliation,
                    value: option.value || `candidate-${index}`
                }))
                : [];

            const currentAffiliationValue = introForm?.affiliation?.trim() || '';
            const matchedOption = formattedAffiliationOptions.find(
                (option) => option.affiliation === currentAffiliationValue
            );

            setResearcherAffiliationOptions(formattedAffiliationOptions);
            setSelectedResearcherAffiliationOption(matchedOption?.value || '');

            if (hasMultipleAffiliationCandidates) {
                showToast('所属候補が複数見つかりました。候補一覧から選択してください。', 'success');
            } else if (hasDerivedValue) {
                showToast('researchmapから情報を読み込みました。', 'success');
            } else {
                setResearcherFetchError('researchmapに該当情報が見つかりませんでした。');
                showToast('researchmapに該当情報が見つかりませんでした。', 'warning');
            }
        } catch (error) {
            const message = error?.message || 'researchmap情報の取得に失敗しました。';
            setResearcherFetchError(message);
            setResearcherAffiliationOptions([]);
            setSelectedResearcherAffiliationOption('');
            showToast(message, 'error');
        } finally {
            setIsFetchingResearcher(false);
        }
    };

    const handleIntroChange = (eventOrName, valueArg) => {
        let name;
        let value;

        if (typeof eventOrName === 'string') {
            name = eventOrName;
            value = valueArg;
        } else {
            name = eventOrName?.target?.name;
            value = eventOrName?.target?.value;
        }

        if (!name) {
            return;
        }

        setIntroForm((prev) => {
            const next = {
                ...prev,
                [name]: value
            };

            if (name === 'occupation' && value !== 'その他') {
                next.occupationOther = '';
            }

            return next;
        });

        if (introErrors[name]) {
            setIntroErrors((prev) => ({
                ...prev,
                [name]: ''
            }));
        }

        if (name === 'occupation' && introErrors.occupationOther && value !== 'その他') {
            setIntroErrors((prev) => ({
                ...prev,
                occupationOther: ''
            }));
        }
    };

    const validateIntroForm = () => {
        const errors = {};

        if (!introForm.name.trim()) {
            errors.name = 'お名前は必須です';
        }

        if (introForm.comment && introForm.comment.length > 120) {
            errors.comment = 'コメントは120文字以内にしてください';
        }

        setIntroErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSaveIntroduction = async (event) => {
        event?.preventDefault?.();

        if (!user?.id) {
            showToast('ログイン後に自己紹介を編集できます。', 'error');
            return;
        }

        if (!validateIntroForm()) {
            return;
        }

        setIsSavingIntro(true);

        const payload = {
            name: introForm.name.trim(),
            affiliation: introForm.affiliation?.trim() || null,
            research_topic: introForm.researchTopic?.trim() || null,
            one_liner: introForm.comment?.trim() || null,
            occupation: introForm.occupation || null,
            occupation_other: introForm.occupationOther?.trim() || null,
            is_public: isPublic,
            conference_id: conferenceId || null
        };

        try {
            let successMessage = '自己紹介を保存しました。';
            if (introId) {
                await db.updateIntroduction(introId, payload);
                successMessage = '自己紹介を更新しました。';
            } else {
                payload.created_by = user.id;
                const created = await db.createIntroduction(payload);
                setIntroId(created?.id || null);
                setConferenceId(payload.conference_id || null);
            }

            let tagsUpdateFailed = false;
            try {
                const existingInterests = await db.getUserInterests(user.id);
                const existingTagIds = existingInterests?.map((interest) => interest.tag_id) ?? [];

                const tagsToRemove = existingTagIds.filter((tagId) => !selectedTagIds.includes(tagId));
                const tagsToAdd = selectedTagIds.filter((tagId) => !existingTagIds.includes(tagId));

                await Promise.all(
                    tagsToRemove.map((tagId) => db.removeUserInterest(user.id, tagId))
                );

                await Promise.all(
                    tagsToAdd.map((tagId) => db.addUserInterest(user.id, tagId))
                );
            } catch (tagError) {
                console.error('Failed to update user interests:', tagError);
                tagsUpdateFailed = true;
            }

            if (tagsUpdateFailed) {
                showToast('自己紹介は保存されましたが、興味タグの更新に失敗しました。', 'warning');
            } else {
                showToast(successMessage, 'success');
            }
        } catch (error) {
            showToast(error.message || '自己紹介の保存に失敗しました。', 'error');
        } finally {
            setIsSavingIntro(false);
        }
    };

    const handlePasswordChange = (event) => {
        const { name, value } = event.target;
        setPasswordForm((prev) => ({
            ...prev,
            [name]: value
        }));

        if (passwordErrors[name]) {
            setPasswordErrors((prev) => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validatePasswordForm = () => {
        const errors = {};

        if (!passwordForm.currentPassword.trim()) {
            errors.currentPassword = '現在のパスワードを入力してください';
        }

        if (!passwordForm.newPassword.trim()) {
            errors.newPassword = '新しいパスワードを入力してください';
        } else if (passwordForm.newPassword.length < 6) {
            errors.newPassword = '新しいパスワードは6文字以上で入力してください';
        }

        if (passwordForm.confirmPassword !== passwordForm.newPassword) {
            errors.confirmPassword = '確認用パスワードが一致しません';
        }

        setPasswordErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleUpdatePassword = async (event) => {
        event?.preventDefault?.();

        if (!user?.email) {
            showToast('ユーザー情報を取得できません。再度ログインしてください。', 'error');
            return;
        }

        if (!validatePasswordForm()) {
            return;
        }

        setIsUpdatingPassword(true);

        try {
            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: passwordForm.currentPassword
            });

            if (verifyError) {
                throw new Error('現在のパスワードが正しくありません');
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: passwordForm.newPassword
            });

            if (updateError) {
                throw new Error(updateError.message || 'パスワードの更新に失敗しました');
            }

            setPasswordForm({ ...initialPasswordForm });
            showToast('パスワードを変更しました。', 'success');
        } catch (error) {
            showToast(error.message || 'パスワードの変更に失敗しました。', 'error');
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    const handleLogoutClick = async () => {
        if (!onLogout) {
            return;
        }

        setIsLoggingOut(true);
        try {
            await onLogout();
        } catch (error) {
            setIsLoggingOut(false);
            showToast(error.message || 'ログアウトに失敗しました。', 'error');
        }
    };

    const handleOverlayMouseDown = (event) => {
        if (panelRef.current && !panelRef.current.contains(event.target)) {
            onClose?.();
        }
    };

    const toastPosition = useMemo(() => {
        if (typeof window === 'undefined') {
            return 'top';
        }
        return window.innerWidth < 640 ? 'bottom' : 'top';
    }, []);

    const hasAffiliationCandidates = researcherAffiliationOptions.length > 0;
    const recommendedAffiliationLabel = hasAffiliationCandidates
        ? (researcherAffiliationOptions[0]?.rawLabel || researcherAffiliationOptions[0]?.label || '')
        : '';
    const affiliationSelectionRequiredMessage = '複数の所属候補が見つかりました。候補から選ぶか、下の所属欄に直接入力してください。';
    const affiliationSelectionError = hasAffiliationCandidates && !introForm?.affiliation?.trim()
        ? affiliationSelectionRequiredMessage
        : '';
    const affiliationSelectionHelperText = affiliationSelectionError
        ? ''
        : (hasAffiliationCandidates
            ? '選んだ候補が所属欄に反映されます。必要に応じて直接編集してください。'
            : '');

    if (!isOpen || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
                onMouseDown={handleOverlayMouseDown}
                aria-hidden="true"
            />
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 sm:px-6">
                <div
                    ref={panelRef}
                    role="dialog"
                    aria-modal="true"
                    className={cn(
                        'relative w-full max-w-3xl bg-card border border-border shadow-large',
                        'rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[95vh]'
                    )}
                >
                    <header className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <div>
                            <h2 className="text-lg font-heading font-semibold text-foreground">設定</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-muted/70 transition-gentle"
                            aria-label="Close settings"
                        >
                            <Icon
                                name="X"
                                size={18}
                                color="var(--color-muted-foreground)"
                                strokeWidth={2}
                            />
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto">
                        <section className="px-6 py-5 space-y-5 border-b border-border">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">自己紹介の編集</h3>
                            </div>

                            {isIntroLoading ? (
                                <div className="flex flex-col items-center justify-center space-y-3 py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                                    <p className="text-sm text-muted-foreground">自己紹介を読み込み中...</p>
                                </div>
                            ) : introLoadError ? (
                                <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                                    {introLoadError}
                                </div>
                            ) : (
                                <form className="space-y-4" onSubmit={handleSaveIntroduction}>
                                    <div className="space-y-2">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                            <div className="sm:flex-1">
                                                <Input
                                                    name="researcherId"
                                                    value={researcherId}
                                                    onChange={handleResearcherIdChange}
                                                    label="researchmap研究者ID"
                                                    description="researchmapの公開プロフィールURL末尾のresearcher_idを入力すると、氏名・所属・職業を自動入力します"
                                                    error={researcherFetchError}
                                                    placeholder="例: example_researcher"
                                                    autoComplete="off"
                                                    onKeyDown={(event) => {
                                                        if (event.key === 'Enter') {
                                                            event.preventDefault();
                                                            handleResearcherFetch();
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                onClick={handleResearcherFetch}
                                                loading={isFetchingResearcher}
                                                disabled={isFetchingResearcher}
                                                className="w-full sm:w-auto h-10"
                                            >
                                                自動入力
                                            </Button>
                                        </div>
                                    </div>

                                    {hasAffiliationCandidates && (
                                        <AffiliationCandidates
                                            options={researcherAffiliationOptions}
                                            selectedValue={selectedResearcherAffiliationOption}
                                            onSelect={handleResearcherAffiliationOptionSelect}
                                            recommendedLabel={recommendedAffiliationLabel}
                                            helperText={affiliationSelectionHelperText}
                                            error={affiliationSelectionError}
                                            isSelectionRequired={hasAffiliationCandidates}
                                        />
                                    )}

                                    <Input
                                        name="name"
                                        value={introForm.name}
                                        onChange={handleIntroChange}
                                        label="名前"
                                        required
                                        error={introErrors.name}
                                    />
                                    <Input
                                        name="affiliation"
                                        value={introForm.affiliation}
                                        onChange={handleIntroChange}
                                        label="所属"
                                        placeholder="大学名・企業名など"
                                    />
                                    <Select
                                        name="occupation"
                                        value={introForm.occupation}
                                        onChange={(value) => handleIntroChange('occupation', value)}
                                        label="職業"
                                        placeholder="選択してください"
                                        options={occupationOptions}
                                        description="当てはまる職業を選択してください"
                                        error={introErrors.occupation}
                                        clearable
                                    />
                                    {introForm.occupation === 'その他' && (
                                        <Input
                                            name="occupationOther"
                                            value={introForm.occupationOther}
                                            onChange={handleIntroChange}
                                            label="職業（その他詳細）"
                                            placeholder="具体的に入力してください"
                                            error={introErrors.occupationOther}
                                        />
                                    )}
                                    <Input
                                        name="researchTopic"
                                        value={introForm.researchTopic}
                                        onChange={handleIntroChange}
                                        label="研究テーマ"
                                        placeholder="現在取り組んでいる研究分野"
                                    />
                                    <MultiSelect
                                        label="興味・関心"
                                        name="interests"
                                        options={tagOptions}
                                        value={selectedTagIds}
                                        onChange={setSelectedTagIds}
                                        placeholder="興味のあるタグを選択してください"
                                        description="複数選択可能です。選択したタグに基づいて関連する発表が推奨されます"
                                        loading={isTagsLoading}
                                        error={tagLoadError}
                                    />
                                    <Textarea
                                        name="comment"
                                        value={introForm.comment}
                                        onChange={handleIntroChange}
                                        label="一言コメント"
                                        description="120文字以内で入力してください"
                                        error={introErrors.comment}
                                        rows={4}
                                    />
                                    <VisibilityToggle
                                        isPublic={isPublic}
                                        onChange={setIsPublic}
                                    />

                                    <div className="mt-5">
                                        {/* 自己紹介を保存ボタン */}
                                        <Button
                                            type="submit"
                                            loading={isSavingIntro}
                                            disabled={isSavingIntro}
                                            fullWidth
                                            size="xl"
                                            className="h-10"
                                        >
                                            自己紹介を保存
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </section>

                        <div className="px-6 py-5 border-b border-border">
                            <div className="flex flex-col md:flex-row gap-4 w-full justify-around my-3">
                                {/* 学会変更 ボタン */}
                                <Button
                                    type="button"
                                    size="xl"
                                    variant="primary"
                                    fullWidth={false}
                                    iconName="RefreshCw"
                                    iconPosition="left"
                                    className="flex-1 h-10"
                                    onClick={() => setShowConferenceConfirm(true)}
                                >
                                    学会を変更
                                </Button>
                                {/* パスワード変更 ボタン */}
                                <Button
                                    type="button"
                                    size="xl"
                                    variant="primary"
                                    fullWidth={false}
                                    iconName="Lock"
                                    iconPosition="left"
                                    className="flex-1 h-10"
                                    onClick={() => setShowPasswordDialog(true)}
                                >
                                    パスワードを変更
                                </Button>
                                {/* ログアウト ボタン */}
                                <Button
                                    type="button"
                                    size="xl"
                                    variant="danger"
                                    fullWidth={false}
                                    iconName="LogOut"
                                    iconPosition="left"
                                    className="flex-1 h-10"
                                    onClick={handleLogoutClick}
                                    loading={isLoggingOut}
                                    disabled={isLoggingOut}
                                >
                                    ログアウト
                                </Button>
                            </div>

                            {/* 学会切り替え モーダル */}
                            {showConferenceConfirm && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                                    <div className="bg-card p-8 rounded-xl shadow-xl w-full max-w-md border border-border flex flex-col gap-6">
                                        <div className="space-y-2">
                                            <h4 className="text-lg font-bold">現在選択中の学会</h4>
                                            <div className="p-3 bg-primary/12 font-bold text-center rounded text-foreground">
                                                {derivedConferenceName || '学会名未取得'}
                                            </div>
                                        </div>
                                        <div className="flex justify-center gap-8 mt-4">
                                            <Button variant="secondary" type="button" size="xl" className="w-40 h-10" onClick={() => setShowConferenceConfirm(false)}>
                                                閉じる
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="primary"
                                                iconName="RefreshCw"
                                                iconPosition="left"
                                                size="xl"
                                                className="w-40 h-10"
                                                onClick={() => {
                                                    setShowConferenceConfirm(false);
                                                    onClose?.();
                                                    onConferenceSwitch?.();
                                                }}
                                            >
                                                学会を変更
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* パスワード変更 モーダル */}
                            {showPasswordDialog && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                                    <div className="bg-card p-8 rounded-xl shadow-xl w-full max-w-md border border-border flex flex-col gap-6">
                                        <div className="space-y-2">
                                            <h4 className="text-lg font-bold mb-1">パスワード変更</h4>
                                            <p className="text-sm text-muted-foreground mb-3">アカウントのセキュリティを高めるため定期的に変更してください。</p>
                                            <form className="space-y-4" onSubmit={handleUpdatePassword}>
                                                <Input
                                                    name="currentPassword"
                                                    type="password"
                                                    value={passwordForm.currentPassword}
                                                    onChange={handlePasswordChange}
                                                    label="現在のパスワード"
                                                    required
                                                    error={passwordErrors.currentPassword}
                                                />
                                                <Input
                                                    name="newPassword"
                                                    type="password"
                                                    value={passwordForm.newPassword}
                                                    onChange={handlePasswordChange}
                                                    label="新しいパスワード"
                                                    required
                                                    error={passwordErrors.newPassword}
                                                    description="6文字以上で設定してください"
                                                />
                                                <Input
                                                    name="confirmPassword"
                                                    type="password"
                                                    value={passwordForm.confirmPassword}
                                                    onChange={handlePasswordChange}
                                                    label="新しいパスワード（確認）"
                                                    required
                                                    error={passwordErrors.confirmPassword}
                                                />
                                                <div className="flex justify-center gap-8 mt-4">
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="xl"
                                                        className="w-40 h-10"
                                                        onClick={() => setShowPasswordDialog(false)}
                                                        disabled={isUpdatingPassword}
                                                    >
                                                        閉じる
                                                    </Button>
                                                    <Button
                                                        type="submit"
                                                        variant="primary"
                                                        size="xl"
                                                        className="w-40 h-10"
                                                        loading={isUpdatingPassword}
                                                        disabled={isUpdatingPassword}
                                                    >
                                                        パスワードを変更
                                                    </Button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
                position={toastPosition}
            />
        </>,
        document.body
    );
};

export default SettingsPanel;
