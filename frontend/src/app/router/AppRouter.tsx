import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../../features/navigation/components/AppLayout';
import { HomePage } from '../../features/home/components/HomePage';
import { MyDashboardPage } from '../../features/dashboard/components/MyDashboardPage';
import { ProjectDetailPage } from '../../features/projects/components/ProjectDetailPage';
import { SettingsPage } from '../../features/settings/components/SettingsPage';

export function AppRouter() {
    return (
        <Routes>
            <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/my-dashboard" element={<MyDashboardPage />} />
                <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
                <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
