import { NavLink, Outlet } from 'react-router-dom';
import { useThemeSettings } from '../../settings/theme/ThemeProvider';

export function AppLayout() {
    const { settings } = useThemeSettings();

    return (
        <div className="app-shell app-shell-grid">
            <aside className="sidebar-shell p-3 p-lg-4">
                <div className="sidebar-panel rounded-4 shadow-sm h-100 d-flex flex-column">
                    <div className="p-3 p-lg-4 border-bottom border-secondary-subtle">
                        <p className="text-uppercase small text-body-secondary mb-1">Project Tracker</p>
                        <h1 className="h4 mb-1">Portfolio Workspace</h1>
                        <p className="mb-0 text-body-secondary small">{settings?.currentUserName ?? 'Ava Patel'}</p>
                    </div>
                    <nav className="p-3 d-grid gap-2">
                        <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                            Home
                        </NavLink>
                        <NavLink
                            to="/my-dashboard"
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            My Dashboard
                        </NavLink>
                        <NavLink
                            to="/settings"
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            Settings
                        </NavLink>
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
