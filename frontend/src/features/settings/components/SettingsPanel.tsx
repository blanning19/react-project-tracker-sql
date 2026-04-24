import { Card, Form } from 'react-bootstrap';
import { useCurrentUser } from '../../auth/context/CurrentUserProvider';
import { useThemeSettings } from '../theme/ThemeProvider';

export function SettingsPanel() {
    const { preferences, setTheme } = useThemeSettings();
    const { currentUserName } = useCurrentUser();
    const isDarkMode = preferences?.theme === 'dark';

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
                            <strong>Current User:</strong> {currentUserName}
                        </p>
                        <p className="mb-0 text-body-secondary small">
                            Identity now comes from the dedicated current-user context, while theme and sorting stay
                            in saved preferences.
                        </p>
                    </div>

                    <div className="settings-toggle-row rounded-3 p-3">
                        <div>
                            <div className="fw-semibold">Dark Mode</div>
                            <div className="text-body-secondary small">
                                Use a darker workspace theme across Home and My Work.
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
                            <strong>Dashboard Sort:</strong> {preferences?.dashboardSortField ?? 'Finish'}
                        </p>
                        <p className="mb-0">
                            <strong>Direction:</strong> {preferences?.dashboardSortDirection ?? 'asc'}
                        </p>
                    </div>

                    <p className="mb-0 text-body-secondary small">
                        These preferences are currently saved through the app settings flow. If we move this screen to
                        Ontology-backed user preferences later, the UI here can stay mostly the same while the storage
                        layer changes underneath it.
                    </p>
                </div>
            </Card.Body>
        </Card>
    );
}
