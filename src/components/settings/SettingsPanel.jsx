import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import Input from 'components/ui/Input';
import MultiSelect from 'components/ui/MultiSelect';
import Select from 'components/ui/Select';
import Textarea from 'components/ui/Textarea';
import Toast from 'components/ui/Toast';
import { db, supabase } from 'lib/supabase';
import { cn } from 'utils/cn';
import VisibilityToggle from 'pages/self-introduction-form/components/VisibilityToggle';

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

const SettingsPanel = ({ isOpen, onClose, user, onLogout }) => {
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

    const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
    const [passwordErrors, setPasswordErrors] = useState({});
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const [toast, setToast] = useState({
        isVisible: false,
        message: '',
        type: 'success'
    });

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
            showToast('パスワードを更新しました。', 'success');
        } catch (error) {
            showToast(error.message || 'パスワードの更新に失敗しました。', 'error');
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
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">設定</p>
                            <h2 className="text-lg font-heading font-semibold text-foreground">アカウントとプロフィール</h2>
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
                                <p className="text-sm text-muted-foreground">参加者に表示される情報を更新します。</p>
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
                                    <Input
                                        name="name"
                                        value={introForm.name}
                                        onChange={handleIntroChange}
                                        label="お名前"
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

                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            loading={isSavingIntro}
                                            disabled={isSavingIntro}
                                        >
                                            自己紹介を保存
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </section>

                        <section className="px-6 py-5 space-y-5 border-b border-border">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">パスワードの更新</h3>
                                <p className="text-sm text-muted-foreground">アカウントのセキュリティを高めるため定期的に変更しましょう。</p>
                            </div>

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

                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        variant="secondary"
                                        loading={isUpdatingPassword}
                                        disabled={isUpdatingPassword}
                                    >
                                        パスワードを変更
                                    </Button>
                                </div>
                            </form>
                        </section>

                        <section className="px-6 py-5">
                            <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">ログアウト</h3>
                                    <p className="text-sm text-muted-foreground">アカウントからサインアウトします。</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="danger"
                                    onClick={handleLogoutClick}
                                    loading={isLoggingOut}
                                    disabled={isLoggingOut}
                                >
                                    ログアウト
                                </Button>
                            </div>
                        </section>
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
