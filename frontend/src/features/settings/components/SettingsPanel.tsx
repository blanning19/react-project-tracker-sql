import { Card, Form } from 'react-bootstrap';
import { DEFAULT_USER_NAME } from '../../../shared/config/app';
import { useThemeSettings } from '../theme/ThemeProvider';

export function SettingsPanel() {
    const { settings, setTheme } = useThemeSettings();
    const isDarkMode = settings?.theme === 'dark';

    return (
        <Card className="shadow-sm border-0 h-100 dashboard-panel">
            <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <p className="text-uppercase small text-body-secondary mb-1">User Settings</p>
                        <h2 className="h5 mb-0">Saved dashboard preferences</h2>
                    </div>
                    <span className="badge text-bg-secondary">Account scoped</span>
                </div>

                <div className="settings-stack">
                    <div>
                        <p className="mb-1">
                            <strong>Current User:</strong> {settings?.currentUserName ?? DEFAULT_USER_NAME}
                        </p>
                        <p className="mb-0 text-body-secondary small">
                            Theme and sorting preferences are stored against this account profile.
                        </p>
                    </div>

                    <div className="settings-toggle-row rounded-3 p-3">
                        <div>
                            <div className="fw-semibold">Dark Mode</div>
                            <div className="text-body-secondary small">
                                Use a darker workspace theme across Home and My Dashboard.
                            </div>
                        </div>
                        <Form.Check
                            type="switch"
                            id="theme-toggle"
                            checked={isDarkMode}
                            onChange={() => void setTheme(isDarkMode ? 'light' : 'dark')}
                            label={isDarkMode ? 'On' : 'Off'}
                        />
                    </div>

                    <div>
                        <p className="mb-2">
                            <strong>Dashboard Sort:</strong> {settings?.dashboardSortField ?? 'Finish'}
                        </p>
                        <p className="mb-0">
                            <strong>Direction:</strong> {settings?.dashboardSortDirection ?? 'asc'}
                        </p>
                    </div>
                </div>
            </Card.Body>
        </Card>
    );
}
