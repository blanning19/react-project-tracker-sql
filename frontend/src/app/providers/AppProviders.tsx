import { PropsWithChildren } from 'react';
import { CurrentUserProvider } from '../../features/auth/context/CurrentUserProvider';
import { UserSettingsProvider } from '../../features/settings/context/UserSettingsProvider';
import { ThemeProvider } from '../../features/settings/theme/ThemeProvider';

export function AppProviders({ children }: PropsWithChildren) {
    return (
        <UserSettingsProvider>
            <ThemeProvider>
                <CurrentUserProvider>{children}</CurrentUserProvider>
            </ThemeProvider>
        </UserSettingsProvider>
    );
}
