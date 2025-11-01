import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';
import Input from '../../components/ui/Input';
import MultiSelect from '../../components/ui/MultiSelect';
import Select from '../../components/ui/Select';
import Toast from '../../components/ui/Toast';
import { getStoredConferenceId, setStoredConferenceId } from '../../constants/conference';
import { useAuth } from '../../contexts/AuthContext';
import useConferences from '../../hooks/useConferences';
import useParticipantProfile from '../../hooks/useParticipantProfile';
import useTags from '../../hooks/useTags';
import { db } from '../../lib/supabase';
import FormActions from './components/FormActions';
import FormField from './components/FormField';
import FormHeader from './components/FormHeader';
import VisibilityToggle from './components/VisibilityToggle';

const decodeHtmlEntities = (value) => {
    if (typeof value !== 'string' || !value) {
        return '';
    }

    return value
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/');
};

const sanitizeResearchmapString = (value) => {
    if (typeof value !== 'string') {
        return '';
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }

    const withoutTags = trimmed.includes('<')
        ? trimmed.replace(/<[^>]*>/g, ' ')
        : trimmed;

    const decoded = decodeHtmlEntities(withoutTags);
    return decoded.replace(/\s+/g, ' ').trim();
};

const pickFirstNonEmptyString = (values = []) => {
    if (!Array.isArray(values)) {
        return '';
    }

    for (const value of values) {
        if (typeof value === 'string') {
            const sanitized = sanitizeResearchmapString(value);
            if (sanitized) {
                return sanitized;
            }
        } else if (value && typeof value === 'object') {
            const localized = pickLocalizedValue(value);
            if (localized) {
                return localized;
            }
        }
    }
    return '';
};

const combineNameParts = (...parts) => {
    return parts
        .filter((part) => typeof part === 'string' && part.trim())
        .map((part) => part.trim())
        .join(' ');
};

const pickLocalizedValue = (value) => {
    if (!value) {
        return '';
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const candidate = pickLocalizedValue(item);
            if (candidate) {
                return candidate;
            }
        }
        return '';
    }

    if (typeof value === 'string') {
        return sanitizeResearchmapString(value);
    }

    if (typeof value === 'object') {
        const directKeys = ['value', '@value', 'text', 'content', 'label', 'title', 'name'];
        for (const key of directKeys) {
            const candidate = value?.[key];
            if (!candidate) {
                continue;
            }
            if (typeof candidate === 'string' && candidate.trim()) {
                const sanitized = sanitizeResearchmapString(candidate);
                if (sanitized) {
                    return sanitized;
                }
            }
            const nested = pickLocalizedValue(candidate);
            if (nested) {
                return nested;
            }
        }

        const preferredKeys = ['ja', 'ja-JP', 'ja-kana', 'ja-Kana', 'ja-hira', 'ja-Hira', 'en'];

        for (const key of preferredKeys) {
            const candidate = value?.[key];
            if (typeof candidate === 'string' && candidate.trim()) {
                const sanitized = sanitizeResearchmapString(candidate);
                if (sanitized) {
                    return sanitized;
                }
            }
            if (!candidate) {
                continue;
            }
            const nested = pickLocalizedValue(candidate);
            if (nested) {
                return nested;
            }
        }

        for (const candidate of Object.values(value)) {
            if (!candidate) {
                continue;
            }
            if (typeof candidate === 'string' && candidate.trim()) {
                const sanitized = sanitizeResearchmapString(candidate);
                if (sanitized) {
                    return sanitized;
                }
            }
            const nested = pickLocalizedValue(candidate);
            if (nested) {
                return nested;
            }
        }
    }

    return '';
};

const getProfileGraphEntry = (data) => {
    if (!data || typeof data !== 'object') {
        return null;
    }

    const graph = data?.['@graph'];
    if (!Array.isArray(graph)) {
        return null;
    }

    return graph.find((entry) => {
        if (!entry || typeof entry !== 'object') {
            return false;
        }

        const entryId = entry?.['@id'] || entry?.id;
        const entryType = entry?.['@type'] || entry?.type;
        return entryId === 'profile' || entryType === 'profile';
    }) || null;
};

const collectAffiliationsFromItems = (items) => {
    if (!Array.isArray(items)) {
        return [];
    }

    const results = [];
    const visit = (item) => {
        if (!item || typeof item !== 'object') {
            return;
        }

        const nestedCollections = [
            item?.items,
            item?.entries,
            item?.sections
        ];
        for (const collection of nestedCollections) {
            if (Array.isArray(collection)) {
                collection.forEach(visit);
            }
        }

        const label = pickLocalizedValue(item?.label || item?.title || item?.name);
        if (!label) {
            return;
        }

        const normalizedLabel = label.toLowerCase();
        const isAffiliationLabel = label.includes('所属') || normalizedLabel.includes('affiliation');
        if (!isAffiliationLabel) {
            return;
        }

        const value = pickFirstNonEmptyString([
            item?.value,
            item?.values,
            item?.text,
            item?.content,
            item?.description,
            item?.body,
            item?.value_text,
            item?.value_html
        ]);

        if (value) {
            results.push(value);
        }
    };

    items.forEach(visit);

    return results;
};

const getAffiliationsFromProfileGraph = (profileEntry) => {
    if (!profileEntry || typeof profileEntry !== 'object') {
        return [];
    }

    const candidates = [];

    const directValues = [
        pickLocalizedValue(profileEntry?.affiliation),
        pickLocalizedValue(profileEntry?.affiliations),
        pickLocalizedValue(profileEntry?.affiliation_organization),
        pickLocalizedValue(profileEntry?.affiliation_faculty),
        pickLocalizedValue(profileEntry?.organization),
        pickLocalizedValue(profileEntry?.department)
    ];

    for (const value of directValues) {
        if (value) {
            candidates.push(value);
        }
    }

    const itemAffiliations = collectAffiliationsFromItems(
        Array.isArray(profileEntry?.items)
            ? profileEntry.items
            : Array.isArray(profileEntry?.entries)
                ? profileEntry.entries
                : Array.isArray(profileEntry?.sections)
                    ? profileEntry.sections
                    : []
    );

    if (Array.isArray(profileEntry?.affiliations)) {
        for (const affiliation of profileEntry.affiliations) {
            const organization = pickLocalizedValue(
                affiliation?.organization ||
                affiliation?.name ||
                affiliation?.title
            );
            if (organization) {
                candidates.push(organization);
            }
        }
    }

    candidates.push(...itemAffiliations);

    const seen = new Set();
    return candidates.filter((value) => {
        if (seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    });
};

const getGraphItems = (data, type) => {
    if (!data || typeof data !== 'object' || !type) {
        return [];
    }

    const graph = data?.['@graph'];
    if (!Array.isArray(graph)) {
        return [];
    }

    const section = graph.find((entry) => entry?.['@type'] === type);
    const items = section?.items;

    if (!Array.isArray(items)) {
        return [];
    }

    return items.filter((item) => item && typeof item === 'object');
};

const mapResearchExperienceToCareerEntries = (data) => {
    const items = getGraphItems(data, 'research_experience');

    return items
        .map((item) => {
            const organization = pickLocalizedValue(item?.affiliation);
            const department = pickLocalizedValue(item?.section);
            const jobTitle = pickLocalizedValue(item?.job);
            const start = item?.start_date || item?.from_date || item?.start || item?.from || null;
            const end = item?.end_date || item?.to_date || item?.end || item?.to || null;

            return {
                organization,
                department,
                job_title: jobTitle,
                start,
                start_date: start,
                end,
                end_date: end,
                is_current: !(item?.to_date || item?.end_date)
            };
        })
        .filter((entry) => pickFirstNonEmptyString([
            entry.organization,
            entry.department,
            entry.job_title
        ]));
};

const normalizeResearcherId = (input) => {
    if (!input || typeof input !== 'string') {
        return '';
    }

    const trimmed = input.trim();
    if (!trimmed) {
        return '';
    }

    const extractFromUrl = (value) => {
        try {
            const url = new URL(value);
            if (!url.hostname.endsWith('researchmap.jp')) {
                return '';
            }
            const segments = url.pathname.split('/').filter(Boolean);
            return segments.pop() || '';
        } catch (error) {
            return '';
        }
    };

    const fromAbsolute = extractFromUrl(trimmed);
    if (fromAbsolute) {
        return fromAbsolute;
    }

    const fromRelative = extractFromUrl(`https://${trimmed}`);
    if (fromRelative) {
        return fromRelative;
    }

    return trimmed;
};

const normalizeCareerList = (career) => {
    if (!career) {
        return [];
    }

    if (Array.isArray(career)) {
        return career.filter(Boolean);
    }

    if (typeof career === 'object') {
        const entries = [];
        for (const value of Object.values(career)) {
            if (!value) continue;
            if (Array.isArray(value)) {
                for (const item of value) {
                    if (item && typeof item === 'object') {
                        entries.push(item);
                    }
                }
            } else if (typeof value === 'object') {
                entries.push(value);
            }
        }
        return entries;
    }

    return [];
};

const parseBooleanFlag = (value) => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (value === null || value === undefined) {
        return false;
    }

    return ['1', 'true', 'yes', 'y'].includes(String(value).toLowerCase());
};

const parseDateValue = (value) => {
    if (!value) {
        return null;
    }

    if (typeof value === 'number') {
        const numericString = String(value);
        if (/^\d{4}$/.test(numericString)) {
            const dateFromYear = new Date(`${numericString}-12-31T00:00:00Z`);
            return Number.isNaN(dateFromYear.getTime()) ? null : dateFromYear;
        }
        return new Date(value);
    }

    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    const normalized = /^\d{4}$/.test(trimmed)
        ? `${trimmed}-12-31`
        : /^\d{4}-\d{2}$/.test(trimmed)
            ? `${trimmed}-01`
            : trimmed;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
};

const getComparableDate = (entry) => {
    if (!entry || typeof entry !== 'object') {
        return Number.MIN_SAFE_INTEGER;
    }

    const candidates = [
        entry?.term_end,
        entry?.end_date,
        entry?.to_date,
        entry?.end,
        entry?.to,
        entry?.term_start,
        entry?.start_date,
        entry?.from_date,
        entry?.start,
        entry?.from
    ];

    for (const candidate of candidates) {
        const parsed = parseDateValue(candidate);
        if (parsed) {
            return parsed.getTime();
        }
    }

    return Number.MIN_SAFE_INTEGER;
};

const getPrimaryCareerEntry = (career) => {
    const entries = normalizeCareerList(career);
    if (!entries.length) {
        return null;
    }

    const currentEntry = entries.find((entry) => parseBooleanFlag(
        entry?.is_current ??
        entry?.current ??
        entry?.is_current_job ??
        entry?.in_current_position
    ));

    if (currentEntry) {
        return currentEntry;
    }

    return entries
        .slice()
        .sort((a, b) => getComparableDate(b) - getComparableDate(a))[0];
};

const getPrimaryCareerEntryFromGraph = (data) => {
    const entries = mapResearchExperienceToCareerEntries(data);
    if (!entries.length) {
        return null;
    }

    return getPrimaryCareerEntry(entries);
};

const deriveResearcherName = (data) => {
    if (!data || typeof data !== 'object') {
        return '';
    }

    const person = data?.person || {};
    const profile = data?.profile || {};
    const localizedFamilyName = pickLocalizedValue(data?.family_name);
    const localizedGivenName = pickLocalizedValue(data?.given_name);

    return pickFirstNonEmptyString([
        profile?.name,
        profile?.researcher_name,
        combineNameParts(profile?.family_name, profile?.given_name),
        combineNameParts(profile?.last_name, profile?.first_name),
        person?.full_name,
        person?.name,
        combineNameParts(person?.last_name, person?.first_name),
        combineNameParts(person?.last_name_ja, person?.first_name_ja),
        combineNameParts(localizedFamilyName, localizedGivenName),
        localizedFamilyName
    ]);
};

const deriveAffiliationOptionsFromResearchExperience = (data) => {
    if (!data || typeof data !== 'object') {
        return { affiliation: '', options: [] };
    }

    const entries = mapResearchExperienceToCareerEntries(data);
    if (!entries.length) {
        return { affiliation: '', options: [] };
    }

    const normalizeList = (values = []) => {
        const seen = new Set();
        const results = [];
        values.forEach((value) => {
            if (!value || typeof value !== 'string') {
                return;
            }
            const normalized = value.trim();
            if (!normalized || seen.has(normalized)) {
                return;
            }
            seen.add(normalized);
            results.push(normalized);
        });
        return results;
    };

    const formatAffiliation = (entry) => {
        if (!entry || typeof entry !== 'object') {
            return '';
        }

        return pickFirstNonEmptyString([
            combineNameParts(entry.organization, entry.department),
            entry.organization,
            entry.department
        ]);
    };

    const sortedEntries = entries
        .slice()
        .sort((a, b) => getComparableDate(b) - getComparableDate(a));

    const currentEntries = sortedEntries.filter((entry) => parseBooleanFlag(
        entry?.is_current ??
        entry?.current ??
        entry?.is_current_job ??
        entry?.in_current_position
    ));

    const currentAffiliations = normalizeList(currentEntries.map(formatAffiliation));
    const prioritizedAffiliations = currentEntries.length
        ? currentAffiliations
        : normalizeList(sortedEntries.map(formatAffiliation));

    const primaryAffiliation = prioritizedAffiliations[0] || '';

    return {
        affiliation: primaryAffiliation,
        options: currentAffiliations.length > 1 ? currentAffiliations : []
    };
};

const deriveAffiliationFromProfile = (data) => {
    if (!data || typeof data !== 'object') {
        return '';
    }

    const profileGraphEntry = getProfileGraphEntry(data);
    const profile = data?.profile || profileGraphEntry || {};
    const basicInfo = profile?.basic_information || profile?.basic || {};
    const profileGraphAffiliations = getAffiliationsFromProfileGraph(profileGraphEntry);
    const basicInfoItems = Array.isArray(basicInfo?.items)
        ? basicInfo.items
        : Array.isArray(basicInfo)
            ? basicInfo
            : Array.isArray(basicInfo?.entries)
                ? basicInfo.entries
                : Array.isArray(basicInfo?.sections)
                    ? basicInfo.sections
                    : [];
    const basicInfoAffiliations = collectAffiliationsFromItems(basicInfoItems);

    const affiliationOrganization = pickLocalizedValue(profile?.affiliation_organization);
    const affiliationFaculty = pickLocalizedValue(profile?.affiliation_faculty);
    const affiliation = pickLocalizedValue(profile?.affiliation);
    const organization = pickLocalizedValue(profile?.organization);
    const currentAffiliation = pickLocalizedValue(profile?.current_affiliation);
    const department = pickLocalizedValue(profile?.department);
    const basicAffiliation = pickLocalizedValue(basicInfo?.affiliation);
    const basicAffiliationOrganization = pickLocalizedValue(
        basicInfo?.affiliation_organization ||
        basicInfo?.organization
    );
    const basicAffiliationDepartment = pickLocalizedValue(
        basicInfo?.affiliation_faculty ||
        basicInfo?.affiliation_department ||
        basicInfo?.department
    );

    return pickFirstNonEmptyString([
        ...profileGraphAffiliations,
        combineNameParts(affiliationOrganization, affiliationFaculty),
        affiliationOrganization,
        affiliation,
        organization,
        ...basicInfoAffiliations,
        combineNameParts(basicAffiliationOrganization, basicAffiliationDepartment),
        basicAffiliationOrganization,
        basicAffiliationDepartment,
        basicAffiliation,
        currentAffiliation,
        department
    ]);
};

const deriveAffiliation = (data) => {
    const { affiliation } = deriveAffiliationOptionsFromResearchExperience(data);
    if (affiliation) {
        return affiliation;
    }

    return deriveAffiliationFromProfile(data);
};

const mapJobTitleToOccupation = (jobTitle) => {
    if (!jobTitle || typeof jobTitle !== 'string') {
        return '';
    }

    const normalized = jobTitle.toLowerCase();
    const checks = {
        bachelor: ['学士', '学士課程', 'bachelor'],
        master: ['修士', '修士課程', 'master'],
        doctor: ['博士', 'phd', 'ph.d', 'doctoral', 'doctorate'],
        postdoc: ['ポスドク', 'postdoc', 'post-doctoral', 'post doctoral'],
        faculty: ['教授', '准教授', '講師', '助教', 'teacher', 'faculty', 'professor', 'lecturer', 'instructor'],
        researcher: ['研究員', '研究者', 'researcher', 'scientist', 'research fellow'],
        company: ['企業', 'company', 'corporation', 'inc', 'ltd', 'co.,', 'co.', '株式会社'],
        staff: ['スタッフ', 'staff'],
    };

    const includesAny = (keywords) => {
        return keywords.some((keyword) => {
            if (!keyword) return false;
            if (jobTitle.includes(keyword)) return true;
            return normalized.includes(keyword.toLowerCase());
        });
    };

    if (includesAny(checks.bachelor)) return '学士課程';
    if (includesAny(checks.master)) return '修士課程';
    if (includesAny(checks.doctor)) return '博士課程';
    if (includesAny(checks.postdoc)) return 'ポスドク';
    if (includesAny(checks.faculty)) return '教員';
    if (includesAny(checks.researcher)) return '研究者';
    if (includesAny(checks.company)) return '企業';
    if (includesAny(checks.staff)) return 'スタッフ';

    return 'その他';
};

const deriveOccupation = (data) => {
    if (!data || typeof data !== 'object') {
        return { occupationValue: '', occupationOtherValue: '' };
    }

    const profile = data?.profile || {};
    const careerEntry = getPrimaryCareerEntry(data?.career) || getPrimaryCareerEntryFromGraph(data);

    const rawJobTitle = pickFirstNonEmptyString([
        profile?.job_title,
        profile?.position,
        careerEntry?.job_title,
        careerEntry?.position,
        careerEntry?.title
    ]);

    if (!rawJobTitle) {
        return { occupationValue: '', occupationOtherValue: '' };
    }

    const mappedOccupation = mapJobTitleToOccupation(rawJobTitle);
    return {
        occupationValue: mappedOccupation,
        occupationOtherValue: mappedOccupation === 'その他' ? rawJobTitle : ''
    };
};

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
    const [researcherId, setResearcherId] = useState('');
    const [researcherAffiliationOptions, setResearcherAffiliationOptions] = useState([]);
    const [selectedResearcherAffiliationOption, setSelectedResearcherAffiliationOption] = useState('');

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
    const [isFetchingResearcher, setIsFetchingResearcher] = useState(false);
    const [researcherFetchError, setResearcherFetchError] = useState('');

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

        if (name === 'affiliation') {
            setSelectedResearcherAffiliationOption('');
        }

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

    const handleResearcherIdChange = (e) => {
        const nextValue = e?.target?.value ?? '';
        setResearcherId(nextValue);

        if (researcherFetchError) {
            setResearcherFetchError('');
        }
    };

    const handleResearcherAffiliationOptionSelect = (e) => {
        const nextValue = e?.target?.value ?? '';
        setSelectedResearcherAffiliationOption(nextValue);

        if (!nextValue) {
            return;
        }

        setFormData((prev) => ({
            ...prev,
            affiliation: nextValue
        }));

        if (errors?.affiliation) {
            setErrors((prev) => ({
                ...prev,
                affiliation: ''
            }));
        }
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
            const { occupationValue, occupationOtherValue } = deriveOccupation(profileData);
            const hasDerivedValue = Boolean(
                derivedName ||
                derivedAffiliation ||
                occupationValue ||
                occupationOtherValue
            );

            setFormData((prev) => {
                const next = { ...prev };

                if (derivedName) {
                    next.name = derivedName;
                }

                if (derivedAffiliation) {
                    next.affiliation = derivedAffiliation;
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

            if (derivedName || occupationValue) {
                setErrors(prev => ({
                    ...prev,
                    ...(derivedName ? { name: '' } : {}),
                    ...(occupationValue ? { occupation: '' } : {})
                }));
            }

            setResearcherAffiliationOptions(affiliationOptions);
            setSelectedResearcherAffiliationOption(
                affiliationOptions.length > 0 ? affiliationFromResearchExperience : ''
            );

            if (hasDerivedValue) {
                setToast({
                    isVisible: true,
                    message: 'researchmapから情報を読み込みました。',
                    type: 'success'
                });
            } else {
                setResearcherFetchError('researchmapに該当情報が見つかりませんでした。');
                setToast({
                    isVisible: true,
                    message: 'researchmapに該当情報が見つかりませんでした。',
                    type: 'warning'
                });
            }
        } catch (error) {
            const message = error?.message || 'researchmap情報の取得に失敗しました。';
            setResearcherFetchError(message);
            setResearcherAffiliationOptions([]);
            setSelectedResearcherAffiliationOption('');
            setToast({
                isVisible: true,
                message,
                type: 'error'
            });
        } finally {
            setIsFetchingResearcher(false);
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
            <Header notifications={[]} onNotificationClick={() => { }} showSettings={false} />
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

                            <FormField
                                label="researchmap研究者ID"
                                name="researcherId"
                                description="researchmapの公開プロフィールURL末尾のresearcher_idを入力すると、氏名・所属・職業を自動入力します"
                                error={researcherFetchError}
                            >
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Input
                                        name="researcherId"
                                        value={researcherId}
                                        onChange={handleResearcherIdChange}
                                        placeholder="例: example_researcher"
                                        className={`sm:flex-1 ${researcherFetchError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                        autoComplete="off"
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                event.preventDefault();
                                                handleResearcherFetch();
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleResearcherFetch}
                                        loading={isFetchingResearcher}
                                        disabled={isFetchingResearcher}
                                        className="sm:w-auto w-full"
                                    >
                                        自動入力
                                    </Button>
                                </div>
                            </FormField>

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

                            {researcherAffiliationOptions.length > 1 && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        現所属候補（researchmap）
                                    </label>
                                    <select
                                        value={selectedResearcherAffiliationOption}
                                        onChange={handleResearcherAffiliationOptionSelect}
                                        className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="">候補を選択</option>
                                        {researcherAffiliationOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-[10px] text-gray-500">
                                        選んだ候補が所属欄に反映されます。必要に応じて直接編集してください。
                                    </p>
                                </div>
                            )}

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
