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

const JOB_TITLE_KEYS = [
    'job',
    'job_title',
    'jobtitle',
    'position',
    'title',
    'role',
    'occupation',
    'duty'
];

const mapResearchExperienceToCareerEntries = (data) => {
    const items = getGraphItems(data, 'research_experience');

    return items
        .map((item) => {
            const organization = pickLocalizedValue(item?.affiliation);
            const department = pickLocalizedValue(item?.section);
            const jobTitle = pickFirstNonEmptyString(JOB_TITLE_KEYS.map((key) => item?.[key]));
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
                is_current: !(item?.to_date || item?.end_date),
                raw: item
            };
        })
        .filter((entry) => pickFirstNonEmptyString([
            entry.organization,
            entry.department,
            entry.job_title
        ]));
};

export const normalizeResearcherId = (input) => {
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

export const deriveResearcherName = (data) => {
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

const extractYearMonthFromValue = (value) => {
    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value === 'number') {
        const stringified = String(value);
        if (/^\d{4}$/.test(stringified)) {
            return stringified;
        }
        return stringified.slice(0, 4);
    }

    if (typeof value !== 'string') {
        return '';
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }

    const normalized = trimmed
        .replace(/[.年]/g, '-')
        .replace(/[\/]/g, '-')
        .replace(/月/g, '-')
        .replace(/日/g, '');
    const yearMonthMatch = normalized.match(/(\d{4})-(\d{1,2})/);
    if (yearMonthMatch) {
        const [, year, month] = yearMonthMatch;
        return `${year}-${month.padStart(2, '0')}`;
    }

    const yearOnlyMatch = normalized.match(/(\d{4})/);
    if (yearOnlyMatch) {
        return yearOnlyMatch[1];
    }

    const parsed = parseDateValue(trimmed);
    if (!parsed) {
        return '';
    }

    return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}`;
};

const isOngoingEndValue = (value) => {
    if (value === null || value === undefined) {
        return false;
    }

    if (typeof value === 'number') {
        return value >= 9999;
    }

    if (typeof value !== 'string') {
        return false;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return false;
    }

    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length >= 4 && digitsOnly.startsWith('9999')) {
        return true;
    }

    return trimmed === '9999';
};

const formatCareerEntryPeriod = (entry) => {
    if (!entry || typeof entry !== 'object') {
        return '';
    }

    const startRaw = entry?.start ?? entry?.start_date ?? entry?.from_date ?? entry?.from ?? null;
    const endRaw = entry?.end ?? entry?.end_date ?? entry?.to_date ?? entry?.to ?? entry?.term_end ?? null;
    const start = extractYearMonthFromValue(startRaw);
    const end = extractYearMonthFromValue(endRaw);
    const isOngoing = isOngoingEndValue(endRaw);

    if (isOngoing) {
        return start ? `${start}〜現在` : '〜現在';
    }

    if (start && end) {
        if (start === end) {
            return start;
        }
        return `${start}〜${end}`;
    }

    if (start) {
        const hasExplicitEnd = typeof endRaw === 'string' && endRaw.trim();
        return hasExplicitEnd ? `${start}〜${endRaw.trim()}` : `${start}〜現在`;
    }

    if (typeof endRaw === 'string' && endRaw.trim()) {
        return `〜${endRaw.trim()}`;
    }

    return '';
};

export const deriveAffiliationOptionsFromResearchExperience = (data) => {
    if (!data || typeof data !== 'object') {
        return { affiliation: '', options: [] };
    }

    const entries = mapResearchExperienceToCareerEntries(data);
    if (!entries.length) {
        return { affiliation: '', options: [] };
    }

    const normalizeList = (values = []) => {
        if (!Array.isArray(values)) {
            return [];
        }

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

    const endDateKeys = ['term_end', 'end_date', 'to_date', 'end', 'to'];
    const hasCurrentFlag = (entry) => parseBooleanFlag(
        entry?.is_current ??
        entry?.current ??
        entry?.is_current_job ??
        entry?.in_current_position
    );
    const hasMeaningfulEndDate = (entry) => endDateKeys.some((key) => {
        const value = entry?.[key];
        if (value === undefined || value === null) {
            return false;
        }
        if (typeof value === 'string' && !value.trim()) {
            return false;
        }
        if (isOngoingEndValue(value)) {
            return false;
        }
        return true;
    });

    const entriesWithoutEndDate = sortedEntries.filter((entry) => !hasMeaningfulEndDate(entry));
    const flaggedCurrentEntries = sortedEntries.filter((entry) => hasCurrentFlag(entry));
    const prioritizedEntries = entriesWithoutEndDate.length
        ? entriesWithoutEndDate
        : flaggedCurrentEntries;

    const prioritizedAffiliations = normalizeList(prioritizedEntries.map(formatAffiliation));
    const fallbackAffiliations = prioritizedAffiliations.length
        ? prioritizedAffiliations
        : normalizeList(sortedEntries.map(formatAffiliation));
    const primaryAffiliation = fallbackAffiliations[0] || '';

    const uniqueOptionCandidates = [];
    const seenOptionKeys = new Set();

    const addOptionCandidate = (entry, reason = '') => {
        const affiliation = formatAffiliation(entry);
        if (!affiliation) {
            return;
        }

        const jobTitle = entry?.job_title ? sanitizeResearchmapString(entry.job_title) : '';
        const period = formatCareerEntryPeriod(entry);
        const occupationValue = jobTitle ? mapJobTitleToOccupation(jobTitle) : '';
        const occupationOtherValue = occupationValue === 'その他' ? jobTitle : '';
        const optionKey = [
            affiliation,
            jobTitle,
            period
        ].filter(Boolean).join('::');

        if (seenOptionKeys.has(optionKey)) {
            return;
        }

        seenOptionKeys.add(optionKey);
        uniqueOptionCandidates.push({
            affiliation,
            jobTitle,
            period,
            reason,
            occupationValue,
            occupationOtherValue,
            careerEntry: entry?.raw || entry
        });
    };

    entriesWithoutEndDate.forEach((entry) => addOptionCandidate(entry, 'no_end_date'));
    flaggedCurrentEntries.forEach((entry) => addOptionCandidate(entry, 'current_flag'));

    if (!uniqueOptionCandidates.length) {
        sortedEntries.slice(0, 3).forEach((entry) => addOptionCandidate(entry, 'recent_history'));
    }

    const formattedOptions = uniqueOptionCandidates.map((candidate, index) => {
        const labelParts = [candidate.affiliation];
        if (candidate.jobTitle) {
            labelParts.push(candidate.jobTitle);
        }
        if (candidate.period) {
            labelParts.push(candidate.period);
        }

        const value = `${candidate.reason || 'candidate'}-${index}`;

        return {
            value,
            label: labelParts.join(' / '),
            affiliation: candidate.affiliation,
            jobTitle: candidate.jobTitle,
            period: candidate.period,
            reason: candidate.reason,
            isPrimary: index === 0,
            occupationValue: candidate.occupationValue || '',
            occupationOtherValue: candidate.occupationOtherValue || '',
            careerEntry: candidate.careerEntry || null
        };
    });

    const options = formattedOptions;
    const primaryCandidate = options.length > 0 ? { ...options[0], isPrimary: true } : null;
    const otherAffiliations = options.slice(1).map((option) => ({ ...option, isPrimary: false }));
    const selectionRequired = options.length > 1;

    return {
        affiliation: primaryAffiliation,
        options,
        primaryCandidate,
        otherAffiliations,
        selectionRequired
    };
};

export const deriveAffiliationFromProfile = (data) => {
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

const COLLAPSE_PATTERN = /[\s\-‐−–—―・,，/／\\()（）［］\[\]{}｛｝<>\u3000「」『』【】〔〕]/g;

const collapseForMatch = (value) => {
    return value.replace(COLLAPSE_PATTERN, '');
};

const matchesToken = ({ normalized, lower, collapsed }, token) => {
    if (!token) {
        return false;
    }

    if (token instanceof RegExp) {
        return token.test(normalized) || token.test(lower) || token.test(collapsed);
    }

    const normalizedToken = token.normalize('NFKC');
    const lowerToken = normalizedToken.toLowerCase();
    const collapsedToken = collapseForMatch(lowerToken);

    return (
        lower.includes(lowerToken) ||
        collapsed.includes(collapsedToken) ||
        normalized.includes(normalizedToken)
    );
};

const OCCUPATION_KEYWORD_MAP = [
    {
        value: '学士課程',
        keywords: [
            '学士課程',
            '学士学生',
            '学部生',
            '学部学生',
            '本科生',
            '学部4年生',
            '学部3年生',
            '学部2年生',
            '学部1年生',
            'undergraduate student',
            'undergraduate researcher',
            'undergraduate intern',
            'undergrad student',
            'undergrad researcher',
            'bachelor student',
            'bachelor course',
            'college student'
        ],
        patterns: [
            /\bundergrad\b/i,
            /\bb[1-4]\b/i,
            /学部[1-4１-４]年/
        ]
    },
    {
        value: '修士課程',
        keywords: [
            '修士課程',
            '修士学生',
            '修士院生',
            '修士号',
            '大学院修士課程',
            '大学院前期課程',
            '博士前期課程',
            '大学院生',
            '院生',
            'graduate student',
            'graduate school student',
            'master student',
            'masters student',
            'master\'s student',
            'master course',
            'ms student',
            'm.s. student',
            'msc student'
        ],
        patterns: [
            /\bm[1-2]\b/i,
            /\bmaster'?s?\b/i,
            /\bgrad(uate)? student\b/i
        ],
        exclude: [
            /博士/,
            /ph\.?d/i,
            /\bd[1-5]\b/i,
            /\bdc[12]\b/i,
            /doctoral/i
        ]
    },
    {
        value: '博士課程',
        keywords: [
            '博士課程',
            '博士後期課程',
            '博士学生',
            '博士院生',
            '博士課程院生',
            '博士後期課程大学院生',
            'phd student',
            'phd candidate',
            'ph.d student',
            'ph.d. candidate',
            'doctoral student',
            'doctoral researcher',
            'doctor course student',
            'doctoral candidate',
            'doctor of philosophy student',
            'jsps dc1',
            'jsps dc2'
        ],
        patterns: [
            /\bd[1-5]\b/i,
            /\bdc[12]\b/i,
            /doctoral/i,
            /doctor(al)?\s*candidate/i,
            /ph\.?d/i,
            /phd/i,
            /博士後期/
        ],
        exclude: [
            /\bpost[-\s]?doc\b/i,
            /\bpd\b/i
        ]
    },
    {
        value: 'ポスドク',
        keywords: [
            'ポスドク',
            'postdoc',
            'post-doc',
            'post doctoral researcher',
            'postdoctoral researcher',
            'postdoctoral fellow',
            '博士研究員',
            '特別研究員（pd）',
            '特別研究員(pd)',
            'jsps research fellow (pd)',
            '研究員（pd）',
            'research fellow (pd)',
            'プロジェクト研究員',
            'project researcher'
        ],
        patterns: [
            /\bpost[-\s]?doc\b/i,
            /postdoctoral/i,
            /\bpd\b/i,
            /博士研究員/,
            /特別研究員\s*\(?pd\)?/i
        ],
        exclude: [
            /\bdc[12]\b/i
        ]
    },
    {
        value: '教員',
        keywords: [
            '教授',
            '准教授',
            '助教',
            '講師',
            '特任教授',
            '特任准教授',
            '特任講師',
            '特任助教',
            '客員教授',
            '客員准教授',
            '客員講師',
            '客員助教',
            '特命教授',
            '特命准教授',
            '特命講師',
            '特命助教',
            '特別教授',
            '教授（兼任）',
            '教授（特任）',
            '教授（非常勤）',
            '教授（客員）',
            '准教授（特任）',
            '准教授（非常勤）',
            '専任講師',
            '常勤講師',
            '非常勤講師',
            'visiting professor',
            'visiting associate professor',
            'visiting assistant professor',
            'visiting lecturer',
            'associate professor',
            'assistant professor',
            'project professor',
            'project associate professor',
            'project assistant professor',
            'project lecturer',
            'adjunct professor',
            'full professor',
            'emeritus professor',
            'professor emeritus',
            'professor',
            'lecturer',
            'instructor',
            'faculty',
            'teacher',
            '専任教員',
            '大学教員',
            '助手'
        ],
        patterns: [
            /professor/i,
            /lecturer/i,
            /instructor/i,
            /faculty/i,
            /teacher/i,
            /助教/,
            /講師/,
            /教授/
        ]
    },
    {
        value: '研究者',
        keywords: [
            '研究者',
            '研究員',
            '主任研究員',
            '上席研究員',
            '特任研究員',
            '特別研究員',
            '専門研究員',
            'senior researcher',
            'senior research scientist',
            'research scientist',
            'researcher',
            'research associate',
            'research engineer',
            'research staff',
            'research specialist',
            '研究専門職',
            '研究職',
            '研究科学者',
            'scientist',
            'principal investigator',
            'principal scientist',
            'chief scientist',
            'lead researcher',
            'senior scientist',
            'senior research fellow'
        ],
        patterns: [
            /research(er| scientist| fellow| associate| staff| engineer)/i,
            /scientist/i,
            /principal investigator/i,
            /\bpi\b/i
        ],
        exclude: [
            /\bpost[-\s]?doc\b/i,
            /\bpd\b/i
        ]
    },
    {
        value: '企業',
        keywords: [
            '株式会社',
            '有限会社',
            '合同会社',
            '企業',
            '起業家',
            '起業',
            'スタートアップ',
            'startup',
            'company',
            'corporation',
            'corp',
            'co., ltd',
            'co ltd',
            'ltd.',
            'ltd',
            'inc.',
            'inc',
            'llc',
            '代表取締役',
            '取締役',
            '役員',
            '社長',
            'president',
            'ceo',
            'cto',
            'cfo',
            'coo',
            'chief executive officer',
            'chief technology officer',
            'chief financial officer',
            'chief operating officer',
            'managing director',
            'executive officer',
            'founder',
            'co-founder',
            'entrepreneur',
            'business development'
        ],
        patterns: [
            /co\.\s*ltd/i,
            /\binc\b/i,
            /\bllc\b/i,
            /\bceo\b/i,
            /\bcto\b/i,
            /\bcfo\b/i,
            /\bcoo\b/i,
            /corporation/i,
            /startup/i,
            /代表取締役/,
            /取締役/
        ]
    },
    {
        value: 'スタッフ',
        keywords: [
            '職員',
            'スタッフ',
            '事務職員',
            '事務スタッフ',
            '事務補佐員',
            '事務補佐',
            '秘書',
            '支援員',
            '技術職員',
            '技術スタッフ',
            'technical staff',
            'technical specialist',
            'technician',
            'lab technician',
            'laboratory technician',
            'laboratory staff',
            'lab manager',
            'research administrator',
            'administrative staff',
            'administrative assistant',
            'administrative officer',
            'office staff',
            'office assistant',
            'office administrator',
            'support staff',
            'supporter',
            'coordinator',
            'coordination staff',
            'project coordinator',
            'program coordinator'
        ],
        patterns: [
            /staff/i,
            /technician/i,
            /administrator/i,
            /coordinator/i,
            /秘書/,
            /職員/
        ],
        exclude: [
            /professor/i,
            /lecturer/i,
            /instructor/i,
            /faculty/i,
            /teacher/i,
            /研究員/,
            /research/i,
            /post[-\s]?doc/i
        ]
    }
];

const mapJobTitleToOccupation = (jobTitle) => {
    if (!jobTitle || typeof jobTitle !== 'string') {
        return '';
    }

    const normalized = jobTitle.normalize('NFKC');
    const lower = normalized.toLowerCase();
    const collapsed = collapseForMatch(lower);
    const normalizedForms = { normalized, lower, collapsed };

    for (const mapping of OCCUPATION_KEYWORD_MAP) {
        if (mapping.exclude && mapping.exclude.some((token) => matchesToken(normalizedForms, token))) {
            continue;
        }

        const hasKeyword = mapping.keywords?.some((token) => matchesToken(normalizedForms, token));
        const hasPattern = mapping.patterns?.some((token) => matchesToken(normalizedForms, token));

        if (hasKeyword || hasPattern) {
            return mapping.value;
        }
    }

    return 'その他';
};

const extractJobTitleFromText = (value) => {
    if (!value || typeof value !== 'string') {
        return '';
    }

    const sanitized = sanitizeResearchmapString(value);
    if (!sanitized) {
        return '';
    }

    const delimiterSegments = sanitized.split(/[,，、;；／\/\\|\n]+/);
    const segments = [];
    const seenSegments = new Set();

    const addSegment = (segment) => {
        if (!segment) {
            return;
        }
        const normalizedSegment = segment.trim();
        if (!normalizedSegment || seenSegments.has(normalizedSegment)) {
            return;
        }
        seenSegments.add(normalizedSegment);
        segments.push(normalizedSegment);
    };

    delimiterSegments.forEach((fragment) => {
        const trimmedFragment = fragment.trim();
        if (!trimmedFragment) {
            return;
        }

        const whitespaceParts = trimmedFragment.split(/\s+/).filter(Boolean);

        if (whitespaceParts.length > 1) {
            // Prioritize suffixes such as "准教授" extracted from "○○ 准教授".
            for (let start = whitespaceParts.length - 1; start >= 0; start -= 1) {
                addSegment(whitespaceParts.slice(start).join(' '));
            }
        }

        addSegment(trimmedFragment);
        whitespaceParts.forEach((part) => addSegment(part));

        if (whitespaceParts.length > 1) {
            for (let index = 0; index < whitespaceParts.length - 1; index += 1) {
                addSegment(`${whitespaceParts[index]} ${whitespaceParts[index + 1]}`);
            }
        }
    });

    if (!segments.length) {
        addSegment(sanitized);
    }

    for (const segment of segments) {
        const occupation = mapJobTitleToOccupation(segment);
        if (occupation && occupation !== 'その他') {
            return segment;
        }
    }

    const directOccupation = mapJobTitleToOccupation(sanitized);
    if (directOccupation && directOccupation !== 'その他') {
        return sanitized;
    }

    return '';
};

const extractJobTitleFromCareerEntry = (entry) => {
    if (!entry) {
        return '';
    }

    if (typeof entry === 'string') {
        return extractJobTitleFromText(entry);
    }

    if (Array.isArray(entry)) {
        for (const item of entry) {
            const nested = extractJobTitleFromCareerEntry(item);
            if (nested) {
                return nested;
            }
        }
        return '';
    }

    if (typeof entry !== 'object') {
        return '';
    }

    const jobFieldCandidate = pickFirstNonEmptyString(JOB_TITLE_KEYS.map((key) => entry?.[key]));
    if (jobFieldCandidate) {
        return jobFieldCandidate;
    }

    const stringCandidates = [];

    const addCandidate = (value) => {
        if (!value) {
            return;
        }
        if (typeof value === 'string') {
            const sanitized = sanitizeResearchmapString(value);
            if (sanitized) {
                stringCandidates.push(sanitized);
            }
            return;
        }
        if (Array.isArray(value)) {
            value.forEach(addCandidate);
            return;
        }
        if (typeof value === 'object') {
            Object.values(value).forEach(addCandidate);
        }
    };

    const fallbackKeys = [
        'organization',
        'affiliation',
        'department',
        'value',
        'values',
        'text',
        'content',
        'description',
        'body',
        'note',
        'remarks',
        'summary',
        'detail',
        'label'
    ];

    fallbackKeys.forEach((key) => addCandidate(entry?.[key]));

    for (const candidate of stringCandidates) {
        const extracted = extractJobTitleFromText(candidate);
        if (extracted) {
            return extracted;
        }
    }

    return '';
};

export const deriveOccupationFromCareerEntry = (entry, fallbackJobTitle = '') => {
    const normalizedEntry = entry && typeof entry === 'object' ? entry : null;

    let rawJobTitle = extractJobTitleFromCareerEntry(normalizedEntry);

    if (!rawJobTitle && fallbackJobTitle) {
        const sanitizedFallback = sanitizeResearchmapString(fallbackJobTitle);
        if (sanitizedFallback) {
            rawJobTitle = sanitizedFallback;
        }
    }

    if (!rawJobTitle) {
        return { occupationValue: '', occupationOtherValue: '' };
    }

    const occupationValue = mapJobTitleToOccupation(rawJobTitle);
    return {
        occupationValue,
        occupationOtherValue: occupationValue === 'その他' ? rawJobTitle : ''
    };
};

export const deriveOccupation = (data) => {
    if (!data || typeof data !== 'object') {
        return { occupationValue: '', occupationOtherValue: '' };
    }

    const profile = data?.profile || {};
    const careerEntry = getPrimaryCareerEntry(data?.career) || getPrimaryCareerEntryFromGraph(data);

    let rawJobTitle = pickFirstNonEmptyString([
        profile?.job_title,
        profile?.position,
        careerEntry?.job_title,
        careerEntry?.position,
        careerEntry?.title
    ]);

    if (!rawJobTitle && careerEntry) {
        rawJobTitle = extractJobTitleFromCareerEntry(careerEntry);
    }

    if (!rawJobTitle) {
        const additionalCareerEntries = normalizeCareerList(data?.career);
        for (const entry of additionalCareerEntries) {
            const candidate = extractJobTitleFromCareerEntry(entry);
            if (candidate) {
                rawJobTitle = candidate;
                break;
            }
        }
    }

    if (!rawJobTitle) {
        const profileFallback = pickFirstNonEmptyString([
            profile?.current_position,
            profile?.career_summary,
            profile?.biography
        ]);
        rawJobTitle = extractJobTitleFromText(profileFallback);
    }

    if (!rawJobTitle) {
        return { occupationValue: '', occupationOtherValue: '' };
    }

    const mappedOccupation = mapJobTitleToOccupation(rawJobTitle);
    return {
        occupationValue: mappedOccupation,
        occupationOtherValue: mappedOccupation === 'その他' ? rawJobTitle : ''
    };
};


const RESEARCH_FIELD_DELIMITER_PATTERN = /[\,，、;；／\/\\|\n・\u3000\t]+/;
const RESEARCH_FIELD_KEY_PARTS = [
    'research_field',
    'research-fields',
    'researchfield',
    'research_fields',
    'research_theme',
    'research-themes',
    'fields_of_study',
    'field_of_study',
    'field-of-study',
    'fields-of-study',
    'field',
    'fields',
    'keyword',
    'keywords',
    'topic',
    'topics',
    'subject',
    'subjects',
    'specialty',
    'specialities',
    'speciality',
    'specialties',
    'expertise',
    'expertises',
    'domain',
    'domains',
    'area',
    'areas',
    'focus',
    'discipline'
];
const RESEARCH_FIELD_JA_KEY_PATTERN = /(研究(分野|領域|課題|テーマ)|専門(分野)?|分野|領域|テーマ|キーワード|興味|関心|技術)/;
const MAX_FIELD_SEARCH_DEPTH = 6;

const shouldInspectKeyForResearchField = (key) => {
    if (!key && key !== 0) {
        return false;
    }

    const normalizedKey = String(key).normalize('NFKC');
    const lowerKey = normalizedKey.toLowerCase();

    if (
        lowerKey === '@id' ||
        lowerKey === '@type' ||
        lowerKey === 'id' ||
        lowerKey === 'identifier' ||
        lowerKey.endsWith('_id') ||
        lowerKey.endsWith('-id') ||
        lowerKey.includes('url') ||
        lowerKey.includes('link')
    ) {
        return false;
    }

    if (RESEARCH_FIELD_KEY_PARTS.some((part) => lowerKey.includes(part))) {
        return true;
    }

    return RESEARCH_FIELD_JA_KEY_PATTERN.test(normalizedKey);
};

const addResearchFieldCandidate = (value, results, visited, depth = 0) => {
    if (value === null || value === undefined) {
        return;
    }

    if (typeof value === 'string') {
        const sanitized = sanitizeResearchmapString(value);

        if (!sanitized) {
            return;
        }

        const parts = sanitized
            .split(RESEARCH_FIELD_DELIMITER_PATTERN)
            .map((part) => part.trim())
            .filter(Boolean);

        if (!parts.length) {
            if (sanitized.length <= 120) {
                results.add(sanitized);
            }
            return;
        }

        for (const part of parts) {
            if (!part || part.length > 120 || /^\d+$/.test(part)) {
                continue;
            }
            results.add(part);
        }
        return;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            addResearchFieldCandidate(item, results, visited, depth + 1);
        }
        return;
    }

    if (typeof value !== 'object') {
        return;
    }

    if (visited.has(value)) {
        return;
    }

    visited.add(value);

    const localized = pickLocalizedValue(value);
    if (localized) {
        addResearchFieldCandidate(localized, results, visited, depth + 1);
    }

    const candidateKeys = [
        '@value',
        'label',
        'name',
        'title',
        'value',
        'values',
        'text',
        'content',
        'description',
        'keyword',
        'keywords',
        'field',
        'fields',
        'research_field',
        'research_fields',
        'research_keyword',
        'research_keywords',
        'research_theme',
        'research_topic',
        'specialty',
        'specialities',
        'speciality',
        'specialties',
        'expertise',
        'expertises',
        'subject',
        'subjects',
        'area',
        'areas',
        'domain',
        'domains',
        'focus',
        'foci',
        'topic',
        'topics',
        'theme',
        'themes'
    ];

    for (const key of candidateKeys) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
            addResearchFieldCandidate(value[key], results, visited, depth + 1);
        }
    }
};

const extractResearchFieldCandidates = (data) => {
    if (!data || typeof data !== 'object') {
        return [];
    }

    const results = new Set();
    const visitedContainers = new WeakSet();
    const visitedCandidates = new WeakSet();

    const addCandidate = (value) => addResearchFieldCandidate(value, results, visitedCandidates);

    const inspect = (node, depth = 0) => {
        if (!node || typeof node !== 'object') {
            return;
        }

        if (visitedContainers.has(node) || depth > MAX_FIELD_SEARCH_DEPTH) {
            return;
        }

        visitedContainers.add(node);

        for (const [key, value] of Object.entries(node)) {
            if (shouldInspectKeyForResearchField(key)) {
                addCandidate(value);
            }

            if (value && typeof value === 'object') {
                inspect(value, depth + 1);
            }
        }
    };

    const profile = data?.profile || {};
    const rootCandidates = [
        data?.research_field,
        data?.research_fields,
        data?.research_keyword,
        data?.research_keywords,
        data?.research_topic,
        data?.research_topics,
        data?.specialized_field,
        data?.specialized_fields,
        profile?.research_field,
        profile?.research_fields,
        profile?.research_keyword,
        profile?.research_keywords,
        profile?.research_topic,
        profile?.research_topics,
        profile?.specialized_field,
        profile?.specialized_fields,
        profile?.fields_of_study,
        profile?.field_of_study,
        profile?.speciality,
        profile?.specialities,
        profile?.specialty,
        profile?.specialties,
        profile?.expertise,
        profile?.expertises,
        profile?.keywords,
        profile?.keyword
    ];

    rootCandidates.forEach(addCandidate);

    const graphTypes = [
        'research_field',
        'research_fields',
        'research_keyword',
        'research_keywords',
        'research_theme',
        'research_topic',
        'research_subject',
        'specialized_field',
        'specialized_fields',
        'field_of_study',
        'fields_of_study',
        'keyword',
        'keywords',
        'topic',
        'topics',
        'subject',
        'subjects'
    ];

    graphTypes.forEach((type) => {
        const items = getGraphItems(data, type);
        if (!Array.isArray(items)) {
            return;
        }

        items.forEach((item) => {
            if (!item || typeof item !== 'object') {
                return;
            }

            addCandidate([
                item?.label,
                item?.title,
                item?.name,
                item?.value,
                item?.values,
                item?.keyword,
                item?.keywords,
                item?.text,
                item?.content,
                item?.description
            ]);
        });
    });

    inspect(data);

    return Array.from(results);
};

const INTEREST_TAG_KEYWORD_MAP = [
    {
        tags: ['機械学習'],
        keywords: [
            '機械学習',
            '統計的学習',
            '知能情報学',
            '知能情報処理',
            'インテリジェントシステム',
            'パターン認識',
            'データ駆動型',
            'データ駆動学習',
            'データ駆動モデリング',
            '機械知能'
        ],
        patterns: [
            /\bmachine learning\b/i,
            /\bstatistical learning\b/i,
            /\bintelligent system/i,
            /data[-\s]?driven/i,
            /\bml\b/i
        ]
    },
    {
        tags: ['機械学習', '深層学習'],
        keywords: [
            '深層学習',
            'ディープラーニング',
            'ニューラルネットワーク',
            'ニューラルネット',
            '深層ニューラルネットワーク',
            '畳み込みニューラルネットワーク',
            'リカレントニューラルネットワーク',
            '生成モデル',
            '自己教師あり学習',
            '自己教師付き学習',
            '深層生成モデル',
            'グラフニューラルネットワーク'
        ],
        patterns: [
            /\bdeep learning\b/i,
            /\bneural network\b/i,
            /\bcnn\b/i,
            /\brnn\b/i,
            /\bgnn\b/i,
            /\btransformer/i,
            /\bgenerative (ai|model)/i
        ]
    },
    {
        tags: ['自然言語処理'],
        keywords: [
            '自然言語処理',
            '言語処理',
            '計算言語学',
            'コーパス言語学',
            '言語理解',
            '言語生成',
            '機械翻訳',
            '対話システム',
            '会話システム',
            '質問応答'
        ],
        patterns: [
            /\bnatural language processing\b/i,
            /\bcomputational linguistics\b/i,
            /\bnlp\b/i,
            /text mining/i,
            /sentiment analysis/i,
            /speech (processing|recognition)/i
        ]
    },
    {
        tags: ['自然言語処理', '深層学習'],
        keywords: [
            '大規模言語モデル',
            '生成言語モデル',
            '生成AI',
            '言語モデル',
            '対話型AI'
        ],
        patterns: [
            /large language model/i,
            /\bllm\b/i,
            /language model/i,
            /chatbot/i
        ]
    },
    {
        tags: ['コンピュータビジョン'],
        keywords: [
            'コンピュータビジョン',
            'コンピュータビジュアル',
            '画像認識',
            '画像理解',
            '画像解析',
            '映像解析',
            '映像理解',
            '物体検出',
            '物体追跡',
            '三次元再構成',
            '3次元再構成',
            '姿勢推定',
            '視覚情報処理'
        ],
        patterns: [
            /computer vision/i,
            /\bcv\b/i,
            /image (processing|recognition|analysis)/i,
            /object detection/i,
            /instance segmentation/i,
            /semantic segmentation/i,
            /visual SLAM/i
        ]
    },
    {
        tags: ['強化学習', '機械学習'],
        keywords: [
            '強化学習',
            '逆強化学習',
            '模倣学習',
            'マルチエージェント強化学習',
            '探索と利用',
            'バンディット問題',
            '方策勾配'
        ],
        patterns: [
            /reinforcement learning/i,
            /\brl\b/i,
            /multi[-\s]armed bandit/i,
            /policy gradient/i,
            /temporal difference/i
        ]
    },
    {
        tags: ['データベース'],
        keywords: [
            'データベース',
            'データベースシステム',
            'データマネジメント',
            'データ管理',
            'データモデル',
            'トランザクション処理'
        ],
        patterns: [
            /database system/i,
            /\bdbms\b/i,
            /relational database/i,
            /transaction processing/i,
            /data management/i
        ]
    },
    {
        tags: ['分散データベース', 'クラウドコンピューティング'],
        keywords: [
            '分散データベース',
            '分散DB',
            '並列データベース',
            'レプリケーション',
            '分散トランザクション',
            '分散合意'
        ],
        patterns: [
            /(distributed|parallel) database/i,
            /replicated database/i,
            /distributed transaction/i,
            /consistency protocol/i
        ]
    },
    {
        tags: ['NoSQL'],
        keywords: [
            'NoSQL',
            'ドキュメントデータベース',
            'グラフデータベース',
            'カラム指向データベース',
            'カラムナーDB',
            'キーバリューストア'
        ],
        patterns: [
            /nosql/i,
            /document (database|store)/i,
            /graph database/i,
            /key[-\s]?value store/i,
            /wide column store/i
        ]
    },
    {
        tags: ['クエリ最適化', 'データベース'],
        keywords: [
            'クエリ最適化',
            'クエリプラン',
            'クエリ計画',
            'クエリプランナ',
            'SQL最適化'
        ],
        patterns: [
            /query optimization/i,
            /query planner/i,
            /query plan/i,
            /cost-based optimizer/i,
            /sql tuning/i
        ]
    },
    {
        tags: ['データマイニング', '機械学習'],
        keywords: [
            'データマイニング',
            'データサイエンス',
            '知識発見',
            'ビッグデータ解析',
            '時系列解析',
            'クラスタリング',
            '分類',
            '予測分析'
        ],
        patterns: [
            /data mining/i,
            /data analytics/i,
            /knowledge discovery/i,
            /big data/i,
            /predictive analytics/i,
            /\bkdd\b/i
        ]
    },
    {
        tags: ['サイバーセキュリティ'],
        keywords: [
            'サイバーセキュリティ',
            '情報セキュリティ',
            'セキュアシステム',
            '侵入検知',
            '脆弱性対策',
            'マルウェア対策',
            '脅威分析'
        ],
        patterns: [
            /cyber ?security/i,
            /information security/i,
            /intrusion detection/i,
            /malware/i,
            /threat (analysis|intelligence)/i,
            /security operation/i
        ]
    },
    {
        tags: ['暗号技術'],
        keywords: [
            '暗号技術',
            '暗号化',
            '暗号理論',
            '公開鍵暗号',
            '秘密分散',
            'ゼロ知識証明',
            '秘匿計算'
        ],
        patterns: [
            /cryptography/i,
            /encryption/i,
            /cipher/i,
            /public key/i,
            /zero[-\s]?knowledge/i,
            /homomorphic/i,
            /secure multi[-\s]?party/i
        ]
    },
    {
        tags: ['プライバシー保護'],
        keywords: [
            'プライバシー保護',
            'データ保護',
            '匿名化',
            '匿名化技術',
            '個人情報保護',
            '差分プライバシー',
            '秘匿化'
        ],
        patterns: [
            /privacy/i,
            /data protection/i,
            /anonymi[sz]ation/i,
            /privacy[-\s]?preserving/i,
            /differential privacy/i,
            /gdpr/i
        ]
    },
    {
        tags: ['ネットワーク'],
        keywords: [
            'ネットワーク',
            '通信ネットワーク',
            'ネットワーク設計',
            'ネットワークアーキテクチャ',
            'ネットワーク制御',
            'ネットワークプロトコル',
            'モバイルネットワーク',
            '無線通信'
        ],
        patterns: [
            /network(ing)?/i,
            /routing protocol/i,
            /wireless network/i,
            /mobile network/i,
            /5g/i,
            /software[-\s]?defined network/i,
            /sdn/i
        ]
    },
    {
        tags: ['IoT', '組み込みシステム'],
        keywords: [
            'IoT',
            'センサネットワーク',
            'センサーネットワーク',
            'スマートシティ',
            'サイバーフィジカルシステム',
            'CPS',
            'エッジコンピューティング',
            'エッジAI'
        ],
        patterns: [
            /internet of things/i,
            /sensor network/i,
            /wireless sensor network/i,
            /m2m/i,
            /cyber-physical system/i,
            /edge computing/i,
            /edge ai/i
        ]
    },
    {
        tags: ['クラウドコンピューティング'],
        keywords: [
            'クラウドコンピューティング',
            'クラウドインフラ',
            '仮想化',
            'コンテナオーケストレーション',
            'マイクロサービス',
            '分散システム'
        ],
        patterns: [
            /cloud computing/i,
            /cloud infrastructure/i,
            /virtualization/i,
            /kubernetes/i,
            /container orchestration/i,
            /microservice/i,
            /distributed system/i,
            /serverless/i
        ]
    },
    {
        tags: ['ソフトウェア工学'],
        keywords: [
            'ソフトウェア工学',
            'ソフトウェア開発プロセス',
            'ソフトウェア設計',
            'ソフトウェアアーキテクチャ',
            'ソフトウェア品質',
            'ソフトウェア保守'
        ],
        patterns: [
            /software engineering/i,
            /software process/i,
            /software architecture/i,
            /software quality/i,
            /software maintenance/i
        ]
    },
    {
        tags: ['アジャイル開発', 'ソフトウェア工学'],
        keywords: [
            'アジャイル開発',
            'スクラム',
            'カンバン',
            'リーン開発',
            'DevOps',
            '継続的デリバリー',
            '継続的インテグレーション'
        ],
        patterns: [
            /agile development/i,
            /scrum/i,
            /kanban/i,
            /lean development/i,
            /devops/i,
            /continuous (delivery|integration)/i,
            /ci\/cd/i
        ]
    },
    {
        tags: ['テスト自動化', 'ソフトウェア工学'],
        keywords: [
            'テスト自動化',
            '自動テスト',
            'ソフトウェアテスト',
            '品質保証',
            'テスト駆動開発',
            'テストエンジニアリング'
        ],
        patterns: [
            /test automation/i,
            /software testing/i,
            /unit testing/i,
            /integration testing/i,
            /quality assurance/i,
            /qa automation/i
        ]
    },
    {
        tags: ['ヒューマンコンピュータインタラクション', 'UI/UX'],
        keywords: [
            'ヒューマンコンピュータインタラクション',
            'ヒューマンインタフェース',
            'ヒューマンインタラクション',
            'ユーザビリティ',
            'ユーザーリサーチ',
            'インタラクションデザイン'
        ],
        patterns: [
            /human[-\s]?computer interaction/i,
            /human[-\s]?machine interaction/i,
            /usability/i,
            /user study/i,
            /interaction design/i
        ]
    },
    {
        tags: ['UI/UX'],
        keywords: [
            'UI/UX',
            'UIデザイン',
            'UXデザイン',
            'ユーザーエクスペリエンス',
            'ユーザーインタフェース',
            'ユーザー中心設計'
        ],
        patterns: [
            /user experience/i,
            /user interface/i,
            /ux design/i,
            /ui design/i,
            /visual design/i,
            /user-centered design/i
        ]
    },
    {
        tags: ['アクセシビリティ'],
        keywords: [
            'アクセシビリティ',
            'ユニバーサルデザイン',
            'インクルーシブデザイン',
            'バリアフリー',
            '支援技術'
        ],
        patterns: [
            /accessibility/i,
            /inclusive design/i,
            /universal design/i,
            /assistive technology/i,
            /wcag/i
        ]
    },
    {
        tags: ['Web技術', 'クラウドコンピューティング'],
        keywords: [
            'Web技術',
            'Webアプリケーション',
            'Webサービス',
            'フロントエンド',
            'バックエンド',
            'フルスタック',
            'SPA'
        ],
        patterns: [
            /web technology/i,
            /web development/i,
            /web service/i,
            /frontend/i,
            /backend/i,
            /full[-\s]?stack/i,
            /single page application/i
        ]
    },
    {
        tags: ['モバイルアプリケーション'],
        keywords: [
            'モバイルアプリケーション',
            'スマートフォンアプリ',
            'スマホアプリ',
            'モバイル開発',
            'モバイルコンピューティング',
            'モバイルUX'
        ],
        patterns: [
            /mobile application/i,
            /mobile app/i,
            /smartphone/i,
            /android/i,
            /ios/i,
            /wearable/i
        ]
    },
    {
        tags: ['量子コンピューティング'],
        keywords: [
            '量子コンピューティング',
            '量子計算',
            '量子情報',
            '量子アルゴリズム',
            '量子回路',
            '量子ソフトウェア'
        ],
        patterns: [
            /quantum computing/i,
            /quantum information/i,
            /quantum algorithm/i,
            /quantum circuit/i,
            /qubit/i
        ]
    },
    {
        tags: ['量子コンピューティング', '暗号技術'],
        keywords: [
            '量子暗号',
            '量子鍵配送',
            '量子耐性暗号'
        ],
        patterns: [
            /quantum cryptography/i,
            /post-quantum cryptography/i,
            /quantum key distribution/i
        ]
    },
    {
        tags: ['ブロックチェーン'],
        keywords: [
            'ブロックチェーン',
            '分散台帳',
            'スマートコントラクト',
            '暗号資産',
            'Web3',
            '分散型アプリケーション'
        ],
        patterns: [
            /block ?chain/i,
            /distributed ledger/i,
            /smart contract/i,
            /crypto( currency| asset|economy)/i,
            /web3/i,
            /defi/i
        ]
    },
    {
        tags: ['ライフサイエンス', '医工学'],
        keywords: [
            'ライフサイエンス',
            '生命科学',
            '生物医学',
            '医工学',
            '医療工学',
            '医用工学',
            'バイオサイエンス',
            'バイオテクノロジー',
            'バイオインフォマティクス',
            'ゲノミクス',
            'トランスレーショナルリサーチ',
            '医療技術',
            '医療機器',
            '再生医療',
            '細胞工学'
        ],
        patterns: [
            /life science/i,
            /biomedical engineering/i,
            /biomedical science/i,
            /bioscience/i,
            /biotechnology/i,
            /bioinformatics/i,
            /computational biology/i,
            /medical technology/i,
            /medical device/i,
            /regenerative medicine/i
        ]
    },
    {
        tags: ['医用画像処理', 'ライフサイエンス'],
        keywords: [
            '医用画像処理',
            '医用画像解析',
            '医療画像処理',
            '医療画像解析',
            '医用画像診断',
            'メディカルイメージング',
            '放射線画像',
            '放射線診断',
            '画像診断',
            'MRI',
            '磁気共鳴画像',
            'CT',
            'X線CT',
            '超音波画像',
            '超音波診断',
            'PET',
            '医用画像AI',
            'CADシステム'
        ],
        patterns: [
            /medical imaging/i,
            /medical image (processing|analysis)/i,
            /radiological imaging/i,
            /diagnostic imaging/i,
            /picture archiving/i,
            /radiology/i,
            /\bMRI\b/i,
            /\bCT\b/i,
            /\bPET\b/i,
            /ultrasound imaging/i,
            /computer[-\s]?aided diagnosis/i
        ]
    },
    {
        tags: ['AR/VR', 'コンピュータビジョン'],
        keywords: [
            'AR',
            'VR',
            'MR',
            'XR',
            '拡張現実',
            '仮想現実',
            '複合現実',
            'メタバース',
            '没入型体験'
        ],
        patterns: [
            /augmented reality/i,
            /virtual reality/i,
            /mixed reality/i,
            /extended reality/i,
            /immersive/i,
            /metaverse/i,
            /head[-\s]?mounted display/i
        ]
    },
    {
        tags: ['ゲーム開発'],
        keywords: [
            'ゲーム開発',
            'ゲームデザイン',
            'ゲームプログラミング',
            'ゲームAI',
            'シリアスゲーム',
            'ゲーミフィケーション',
            'eスポーツ'
        ],
        patterns: [
            /game development/i,
            /game design/i,
            /game programming/i,
            /serious game/i,
            /gamification/i,
            /game engine/i,
            /unreal engine/i,
            /unity3d?/i
        ]
    },
    {
        tags: ['組み込みシステム'],
        keywords: [
            '組み込みシステム',
            '組込みシステム',
            '組み込みソフトウェア',
            'ファームウェア',
            'リアルタイムシステム',
            '制御システム',
            'ロボット工学',
            'メカトロニクス',
            'ハードウェア・ソフトウェア協調設計'
        ],
        patterns: [
            /embedded system/i,
            /embedded software/i,
            /firmware/i,
            /real[-\s]?time system/i,
            /control system/i,
            /robotics/i,
            /mechatronics/i,
            /hardware[-\s]?software co[-\s]?design/i,
            /fpga/i
        ]
    }
];

export const deriveInterestTagRecommendations = (data, options = {}) => {
    if (!data || typeof data !== 'object') {
        return [];
    }

    const fieldCandidates = extractResearchFieldCandidates(data);

    if (!fieldCandidates.length) {
        return [];
    }

    const { availableTagNames = [] } = options;
    const trimmedAvailable = Array.isArray(availableTagNames)
        ? availableTagNames
            .map((name) => (typeof name === 'string' ? name.trim() : ''))
            .filter(Boolean)
        : [];

    const availableNameSet = new Set(trimmedAvailable);
    const availableForms = trimmedAvailable.map((name) => {
        const normalized = name.normalize('NFKC');
        const lower = normalized.toLowerCase();
        const collapsed = collapseForMatch(lower);
        return {
            name,
            normalized,
            lower,
            collapsed
        };
    });

    const restrictToAvailable = availableNameSet.size > 0;
    const matchedNames = new Set();

    const ensureTagName = (tagName) => {
        if (!tagName || typeof tagName !== 'string') {
            return;
        }

        const trimmed = tagName.trim();
        if (!trimmed) {
            return;
        }

        if (restrictToAvailable && !availableNameSet.has(trimmed)) {
            return;
        }

        matchedNames.add(trimmed);
    };

    for (const field of fieldCandidates) {
        const normalizedField = field.normalize('NFKC');
        const lowerField = normalizedField.toLowerCase();
        const collapsedField = collapseForMatch(lowerField);
        const forms = {
            normalized: normalizedField,
            lower: lowerField,
            collapsed: collapsedField
        };

        if (availableForms.length) {
            for (const tagForm of availableForms) {
                if (
                    forms.normalized === tagForm.normalized ||
                    forms.collapsed === tagForm.collapsed ||
                    forms.lower.includes(tagForm.lower) ||
                    tagForm.lower.includes(forms.lower)
                ) {
                    ensureTagName(tagForm.name);
                }
            }
        }

        for (const mapping of INTEREST_TAG_KEYWORD_MAP) {
            if (!mapping?.tags?.length) {
                continue;
            }

            if (mapping.exclude && mapping.exclude.some((token) => matchesToken(forms, token))) {
                continue;
            }

            const hasKeyword = Array.isArray(mapping.keywords)
                ? mapping.keywords.some((token) => matchesToken(forms, token))
                : false;
            const hasPattern = Array.isArray(mapping.patterns)
                ? mapping.patterns.some((token) => matchesToken(forms, token))
                : false;

            if (hasKeyword || hasPattern) {
                mapping.tags.forEach(ensureTagName);
            }
        }
    }

    return Array.from(matchedNames);
};

export default {
    normalizeResearcherId,
    deriveResearcherName,
    deriveAffiliationOptionsFromResearchExperience,
    deriveAffiliationFromProfile,
    deriveOccupation,
    deriveOccupationFromCareerEntry,
    deriveInterestTagRecommendations
};
