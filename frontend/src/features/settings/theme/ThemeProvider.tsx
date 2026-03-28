import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../shared/api/http';
import { DEFAULT_USER_NAME } from '../../../shared/config/app';
import { ProjectRecord, SortDirection, ThemeMode, UserSettings } from '../../../shared/types/models';

interface ThemeContextValue {
    settings: UserSettings | null;
    isLoading: boolean;
    setTheme: (theme: ThemeMode) => Promise<void>;
    setDashboardSort: (field: keyof ProjectRecord, direction: SortDirection) => Promise<void>;
}

const DEFAULT_USER_ID = 'demo-user';
const defaultSettings: UserSettings = {
    userId: DEFAULT_USER_ID,
    currentUserName: DEFAULT_USER_NAME,
    theme: 'light',
    dashboardSortField: 'Finish',
    dashboardSortDirection: 'asc',
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

async function persistSettings(nextSettings: UserSettings) {
    return apiFetch<UserSettings>(`/settings/${DEFAULT_USER_ID}`, {
        method: 'PUT',
        body: JSON.stringify(nextSettings),
    });
}

export function ThemeProvider({ children }: PropsWithChildren) {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        apiFetch<UserSettings>(`/settings/${DEFAULT_USER_ID}`)
            .then((data) => setSettings(data))
            .catch(() => setSettings(defaultSettings))
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        const theme = settings?.theme ?? defaultSettings.theme;
        document.documentElement.setAttribute('data-bs-theme', theme);
        document.body.classList.toggle('app-dark', theme === 'dark');
    }, [settings]);

    const value = useMemo<ThemeContextValue>(
        () => ({
            settings,
            isLoading,
            setTheme: async (theme) => {
                const next = { ...(settings ?? defaultSettings), theme };
                setSettings(next);
                const saved = await persistSettings(next);
                setSettings(saved);
            },
            setDashboardSort: async (field, direction) => {
                const next = {
                    ...(settings ?? defaultSettings),
                    dashboardSortField: field,
                    dashboardSortDirection: direction,
                };
                setSettings(next);
                const saved = await persistSettings(next);
                setSettings(saved);
            },
        }),
        [isLoading, settings],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeSettings() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useThemeSettings must be used within ThemeProvider');
    }

    return context;
}
