import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, isAbortError } from '../../../shared/api/http';
import { DEFAULT_USER_NAME } from '../../../shared/config/app';
import { ProjectRecord, SortDirection, ThemeMode, UserPreferences, UserSettings } from '../../../shared/types/models';

interface UserSettingsContextValue {
    settings: UserSettings | null;
    isLoading: boolean;
    updateSettings: (updater: (current: UserSettings) => UserSettings) => Promise<UserSettings>;
}

const DEFAULT_USER_ID = 'demo-user';
const defaultSettings: UserSettings = {
    userId: DEFAULT_USER_ID,
    currentUserName: DEFAULT_USER_NAME,
    theme: 'light',
    dashboardSortField: 'Finish',
    dashboardSortDirection: 'asc',
};

const UserSettingsContext = createContext<UserSettingsContextValue | undefined>(undefined);

async function persistSettings(nextSettings: UserSettings) {
    return apiFetch<UserSettings>(`/settings/${DEFAULT_USER_ID}`, {
        method: 'PUT',
        body: JSON.stringify(nextSettings),
    });
}

export function UserSettingsProvider({ children }: PropsWithChildren) {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        let isActive = true;

        apiFetch<UserSettings>(`/settings/${DEFAULT_USER_ID}`, { signal: controller.signal })
            .then((data) => {
                if (isActive) {
                    setSettings(data);
                }
            })
            .catch((error) => {
                if (isAbortError(error)) {
                    return;
                }

                if (isActive) {
                    setSettings(defaultSettings);
                }
            })
            .finally(() => {
                if (isActive) {
                    setIsLoading(false);
                }
            });

        return () => {
            isActive = false;
            controller.abort();
        };
    }, []);

    const updateSettings = useCallback(async (updater: (current: UserSettings) => UserSettings) => {
        const nextSettings = updater(settings ?? defaultSettings);
        setSettings(nextSettings);
        const saved = await persistSettings(nextSettings);
        setSettings(saved);
        return saved;
    }, [settings]);

    const value = useMemo<UserSettingsContextValue>(
        () => ({
            settings,
            isLoading,
            updateSettings,
        }),
        [isLoading, settings, updateSettings],
    );

    return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
}

export function useUserSettings() {
    const context = useContext(UserSettingsContext);

    if (!context) {
        throw new Error('useUserSettings must be used within UserSettingsProvider');
    }

    return context;
}

export function useUserPreferences(): UserPreferences | null {
    const { settings } = useUserSettings();

    return settings
        ? {
              theme: settings.theme,
              dashboardSortField: settings.dashboardSortField,
              dashboardSortDirection: settings.dashboardSortDirection,
          }
        : null;
}

export type { ThemeMode, SortDirection, ProjectRecord };
