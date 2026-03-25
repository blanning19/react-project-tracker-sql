import { useEffect, useMemo, useState } from 'react';
import { Col, Container, Pagination, Row, Spinner } from 'react-bootstrap';
import { LiveClock } from '../../dashboard/components/LiveClock';
import { ProjectSummaryTable } from './ProjectSummaryTable';
import { useThemeSettings } from '../../settings/theme/ThemeProvider';
import { useProjectData } from '../../dashboard/hooks/useProjectData';

const PROJECTS_PER_PAGE = 10;

export function HomePage() {
    const { settings, isLoading: isSettingsLoading } = useThemeSettings();
    const { projects, isLoading } = useProjectData(settings);
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(projects.length / PROJECTS_PER_PAGE));
    const pagedProjects = useMemo(() => {
        const startIndex = (currentPage - 1) * PROJECTS_PER_PAGE;
        return projects.slice(startIndex, startIndex + PROJECTS_PER_PAGE);
    }, [currentPage, projects]);

    useEffect(() => {
        setCurrentPage((page) => Math.min(page, totalPages));
    }, [totalPages]);

    if (isLoading || isSettingsLoading) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center">
                <Spinner animation="border" role="status" />
            </div>
        );
    }

    return (
        <Container fluid="xl" className="pt-3 pt-lg-4 pb-4 pb-lg-5">
            <Row className="g-4 align-items-stretch mb-4">
                <Col xl={12}>
                    <div className="hero-panel rounded-4 shadow-sm h-100 p-4 p-lg-5">
                        <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center">
                            <div>
                                <p className="text-uppercase small mb-2 hero-kicker">Home</p>
                                <h1 className="display-6 fw-semibold mb-2">
                                    All projects across the portfolio in one place.
                                </h1>
                                <p className="mb-0 text-body-secondary">
                                    This is the default landing page for the workspace. It shows the complete project
                                    list plus live portfolio activity.
                                </p>
                            </div>
                            <LiveClock />
                        </div>
                    </div>
                </Col>
            </Row>

            <div className="mt-4">
                <ProjectSummaryTable
                    projects={pagedProjects}
                    currentUserName={settings?.currentUserName ?? 'Ava Patel'}
                    title="All Projects"
                    subtitle={`Showing ${pagedProjects.length} of ${projects.length} projects. Page ${currentPage} of ${totalPages}.`}
                    actionLabel="Open Project"
                    actionHref={(project) => `/projects/${project.ProjectUID}?from=home`}
                />
                {projects.length > PROJECTS_PER_PAGE ? (
                    <div className="d-flex justify-content-center mt-4">
                        <Pagination className="mb-0">
                            <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
                            <Pagination.Prev
                                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                disabled={currentPage === 1}
                            />
                            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                                <Pagination.Item
                                    key={page}
                                    active={page === currentPage}
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </Pagination.Item>
                            ))}
                            <Pagination.Next
                                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                disabled={currentPage === totalPages}
                            />
                            <Pagination.Last
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                            />
                        </Pagination>
                    </div>
                ) : null}
            </div>
        </Container>
    );
}
