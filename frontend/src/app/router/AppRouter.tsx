import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminPage } from '../../features/admin/components/AdminPage';
import { MyDashboardPage } from '../../features/dashboard/components/MyDashboardPage';
import { HomePage } from '../../features/home/components/HomePage';
import { AppLayout } from '../../features/navigation/components/AppLayout';
import { ProjectCreatePage } from '../../features/projects/components/ProjectCreatePage';
import { ProjectDetailPage } from '../../features/projects/components/ProjectDetailPage';
import { ImportPlannerPage } from '../../features/projects/components/ImportPlannerPage';
import { SettingsPage } from '../../features/settings/components/SettingsPage';

export function AppRouter() {
    return (
        <Routes>
            <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/my-dashboard" element={<MyDashboardPage />} />
                <Route path="/projects/new" element={<ProjectCreatePage />} />
                <Route path="/import-planner" element={<ImportPlannerPage />} />
                <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/admin" element={<AdminPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
