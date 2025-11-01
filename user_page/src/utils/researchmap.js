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

export default {
    normalizeResearcherId,
    deriveResearcherName,
    deriveAffiliationOptionsFromResearchExperience,
    deriveAffiliationFromProfile,
    deriveOccupation,
    deriveOccupationFromCareerEntry
};
