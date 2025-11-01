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

const formatCareerEntryPeriod = (entry) => {
    if (!entry || typeof entry !== 'object') {
        return '';
    }

    const startRaw = entry?.start ?? entry?.start_date ?? entry?.from_date ?? entry?.from ?? null;
    const endRaw = entry?.end ?? entry?.end_date ?? entry?.to_date ?? entry?.to ?? entry?.term_end ?? null;
    const start = extractYearMonthFromValue(startRaw);
    const end = extractYearMonthFromValue(endRaw);

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
    const hasExplicitNullEndDate = (entry) => endDateKeys.some((key) => entry?.[key] === null);
    const hasMeaningfulEndDate = (entry) => endDateKeys.some((key) => {
        const value = entry?.[key];
        if (value === undefined || value === null) {
            return false;
        }
        if (typeof value === 'string' && !value.trim()) {
            return false;
        }
        return true;
    });

    const nullEndDateEntries = sortedEntries.filter((entry) => hasExplicitNullEndDate(entry));
    const flaggedCurrentEntries = sortedEntries.filter((entry) => {
        if (!entry || typeof entry !== 'object') {
            return false;
        }
        if (hasCurrentFlag(entry)) {
            return true;
        }
        return !hasMeaningfulEndDate(entry);
    });

    const prioritizedCurrentEntries = nullEndDateEntries.length
        ? nullEndDateEntries
        : flaggedCurrentEntries;

    const prioritizedAffiliations = normalizeList(prioritizedCurrentEntries.map(formatAffiliation));
    const fallbackAffiliations = prioritizedAffiliations.length
        ? prioritizedAffiliations
        : normalizeList(sortedEntries.map(formatAffiliation));
    const primaryAffiliation = fallbackAffiliations[0] || '';

    const uniqueOptionCandidates = [];
    const seenOptionKeys = new Set();

    const addOptionCandidate = (entry) => {
        const affiliation = formatAffiliation(entry);
        if (!affiliation) {
            return;
        }

        const jobTitle = entry?.job_title ? sanitizeResearchmapString(entry.job_title) : '';
        const period = formatCareerEntryPeriod(entry);
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
            period
        });
    };

    prioritizedCurrentEntries.forEach(addOptionCandidate);

    const formattedOptions = uniqueOptionCandidates.map((candidate, index) => {
        const labelParts = [candidate.affiliation];
        if (candidate.jobTitle) {
            labelParts.push(candidate.jobTitle);
        }
        if (candidate.period) {
            labelParts.push(candidate.period);
        }

        return {
            value: `current-${index}`,
            label: labelParts.join(' / '),
            affiliation: candidate.affiliation
        };
    });

    const options = formattedOptions.length > 1 ? formattedOptions : [];

    return {
        affiliation: primaryAffiliation,
        options
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

export const deriveOccupation = (data) => {
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

export default {
    normalizeResearcherId,
    deriveResearcherName,
    deriveAffiliationOptionsFromResearchExperience,
    deriveAffiliationFromProfile,
    deriveOccupation
};
