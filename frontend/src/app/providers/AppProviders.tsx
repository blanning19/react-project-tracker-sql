import { PropsWithChildren } from 'react';
import { ThemeProvider } from '../../features/settings/theme/ThemeProvider';

export function AppProviders({ children }: PropsWithChildren) {
    return <ThemeProvider>{children}</ThemeProvider>;
}
