const STORAGE_KEY = 'conference:selected';

export const getStoredConferenceId = () => {
    try {
        if (typeof window === 'undefined') {
            return null;
        }
        return window.localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
};

export const setStoredConferenceId = (conferenceId) => {
    try {
        if (typeof window === 'undefined') {
            return;
        }
        if (conferenceId) {
            window.localStorage.setItem(STORAGE_KEY, conferenceId);
        } else {
            window.localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // Ignore storage failures
    }
};

export const clearStoredConferenceId = () => setStoredConferenceId(null);

export const CONFERENCE_STORAGE_KEY = STORAGE_KEY;
