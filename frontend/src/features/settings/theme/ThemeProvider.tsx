import { PropsWithChildren, createContext, useContext, useEffect, useMemo } from 'react';
import { useUserSettings } from '../context/UserSettingsProvider';
import { ProjectRecord, SortDirection, ThemeMode, UserPreferences } from '../../../shared/types/models';

interface ThemeContextValue {
    preferences: UserPreferences | null;
    isLoading: boolean;
    setTheme: (theme: ThemeMode) => Promise<void>;
    setDashboardSort: (field: keyof ProjectRecord, direction: SortDirection) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
    const { settings, isLoading, updateSettings } = useUserSettings();
    const preferences = useMemo<UserPreferences | null>(
        () =>
            settings
                ? {
                      theme: settings.theme,
                      dashboardSortField: settings.dashboardSortField,
                      dashboardSortDirection: settings.dashboardSortDirection,
                  }
                : null,
        [settings],
    );

    useEffect(() => {
        const theme = preferences?.theme ?? 'light';
        document.documentElement.setAttribute('data-bs-theme', theme);
        document.body.classList.toggle('app-dark', theme === 'dark');
    }, [preferences]);

    const value = useMemo<ThemeContextValue>(
        () => ({
            preferences,
            isLoading,
            setTheme: async (theme) => {
                await updateSettings((current) => ({ ...current, theme }));
            },
            setDashboardSort: async (field, direction) => {
                await updateSettings((current) => ({
                    ...current,
                    dashboardSortField: field,
                    dashboardSortDirection: direction,
                }));
            },
        }),
        [isLoading, preferences, updateSettings],
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
