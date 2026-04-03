import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, isAbortError } from '../../../shared/api/http';
import { DEFAULT_USER_NAME } from '../../../shared/config/app';
import { UserAccessRecord } from '../../../shared/types/models';
import { useUserSettings } from '../../settings/context/UserSettingsProvider';

interface CurrentUserContextValue {
    currentUserName: string;
    userAccess: UserAccessRecord | null;
    isLoading: boolean;
}

const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(undefined);

export function CurrentUserProvider({ children }: PropsWithChildren) {
    const { settings, isLoading: isSettingsLoading } = useUserSettings();
    const [userAccess, setUserAccess] = useState<UserAccessRecord | null>(null);
    const [isAccessLoading, setIsAccessLoading] = useState(true);
    const currentUserName = settings?.currentUserName ?? DEFAULT_USER_NAME;

    useEffect(() => {
        if (isSettingsLoading) {
            return;
        }

        const controller = new AbortController();
        let isActive = true;

        // Identity and authorization belong together. Keeping the active user
        // here lets the rest of the app ask for "who am I?" without coupling
        // permission checks to theme/preference state.
        setIsAccessLoading(true);
        apiFetch<UserAccessRecord>(`/admin/access/me?user_name=${encodeURIComponent(currentUserName)}`, {
            signal: controller.signal,
        })
            .then((accessRecord) => {
                if (isActive) {
                    setUserAccess(accessRecord);
                }
            })
            .catch((error) => {
                if (isAbortError(error)) {
                    return;
                }

                if (isActive) {
                    setUserAccess(null);
                }
            })
            .finally(() => {
                if (isActive) {
                    setIsAccessLoading(false);
                }
            });

        return () => {
            isActive = false;
            controller.abort();
        };
    }, [currentUserName, isSettingsLoading]);

    const value = useMemo<CurrentUserContextValue>(
        () => ({
            currentUserName,
            userAccess,
            isLoading: isSettingsLoading || isAccessLoading,
        }),
        [currentUserName, isAccessLoading, isSettingsLoading, userAccess],
    );

    return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser() {
    const context = useContext(CurrentUserContext);

    if (!context) {
        throw new Error('useCurrentUser must be used within CurrentUserProvider');
    }

    return context;
}
