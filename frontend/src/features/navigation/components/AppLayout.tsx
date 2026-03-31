import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { apiFetch, isAbortError } from '../../../shared/api/http';
import { DEFAULT_USER_NAME } from '../../../shared/config/app';
import { UserAccessRecord } from '../../../shared/types/models';
import { useThemeSettings } from '../../settings/theme/ThemeProvider';

export function AppLayout() {
    const { settings } = useThemeSettings();
    const [userAccess, setUserAccess] = useState<UserAccessRecord | null>(null);
    const currentUserName = settings?.currentUserName ?? DEFAULT_USER_NAME;

    useEffect(() => {
        const controller = new AbortController();

        // Admin-nav visibility follows the active user. Abort stale requests so
        // fast user switches cannot let an older response overwrite the newest one.
        apiFetch<UserAccessRecord>(`/admin/access/me?user_name=${encodeURIComponent(currentUserName)}`, {
            signal: controller.signal,
        })
            .then(setUserAccess)
            .catch((error) => {
                if (isAbortError(error)) {
                    return;
                }

                setUserAccess(null);
            });

        return () => {
            controller.abort();
        };
    }, [currentUserName]);

    return (
        <div className="app-shell app-shell-grid">
            <aside className="sidebar-shell p-3 p-lg-4">
                <div className="sidebar-panel rounded-4 shadow-sm h-100 d-flex flex-column">
                    <div className="p-3 p-lg-4 border-bottom border-secondary-subtle">
                        <p className="text-uppercase small text-body-secondary mb-1">Project Tracker</p>
                        <h1 className="h4 mb-1">Portfolio Workspace</h1>
                        <p className="mb-0 text-body-secondary small">
                            {settings?.currentUserName ?? DEFAULT_USER_NAME}
                        </p>
                    </div>
                    <nav className="p-3 d-grid gap-2">
                        <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                            Home
                        </NavLink>
                        <NavLink
                            to="/my-dashboard"
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            My Work
                        </NavLink>
                        <NavLink
                            to="/settings"
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            Settings
                        </NavLink>
                        {userAccess?.canViewAdmin ? (
                            <NavLink
                                to="/admin"
                                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            >
                                Admin
                            </NavLink>
                        ) : null}
                    </nav>
                    <div className="mt-auto p-3 p-lg-4 border-top border-secondary-subtle">
                        <p className="mb-0 text-body-secondary small">Theme: {settings?.theme ?? 'light'}</p>
                    </div>
                </div>
            </aside>
            <main className="content-shell">
                <Outlet />
            </main>
        </div>
    );
}
