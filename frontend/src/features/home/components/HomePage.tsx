import { useEffect, useMemo, useState } from 'react';
import { Col, Container, Pagination, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { LiveClock } from '../../dashboard/components/LiveClock';
import { HomeProjectSortField, ProjectSummaryTable } from './ProjectSummaryTable';
import { useThemeSettings } from '../../settings/theme/ThemeProvider';
import { useProjectData } from '../../dashboard/hooks/useProjectData';
import { SortDirection } from '../../../shared/types/models';

const PROJECTS_PER_PAGE = 10;

export function HomePage() {
    const { preferences, isLoading: isSettingsLoading } = useThemeSettings();
    const { projects, isLoading, error } = useProjectData(preferences);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState<HomeProjectSortField>('Finish');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const sortedProjects = useMemo(() => {
        return [...projects].sort((left, right) => {
            const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

            if (sortField === 'OpenTasks') {
                const leftValue = left.tasks.filter((task) => task.Status.toLowerCase() !== 'completed').length;
                const rightValue = right.tasks.filter((task) => task.Status.toLowerCase() !== 'completed').length;
                return (leftValue - rightValue) * directionMultiplier;
            }

            const leftValue = left[sortField];
            const rightValue = right[sortField];

            if (typeof leftValue === 'number' && typeof rightValue === 'number') {
                return (leftValue - rightValue) * directionMultiplier;
            }

            return String(leftValue).localeCompare(String(rightValue)) * directionMultiplier;
        });
    }, [projects, sortDirection, sortField]);

    const totalPages = Math.max(1, Math.ceil(sortedProjects.length / PROJECTS_PER_PAGE));
    const pagedProjects = useMemo(() => {
        const startIndex = (currentPage - 1) * PROJECTS_PER_PAGE;
        return sortedProjects.slice(startIndex, startIndex + PROJECTS_PER_PAGE);
    }, [currentPage, sortedProjects]);

    function handleSort(field: HomeProjectSortField) {
        setCurrentPage(1);
        if (field === sortField) {
            setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
            return;
        }

        setSortField(field);
        setSortDirection(field === 'ProjectName' || field === 'ProjectManager' || field === 'Status' ? 'asc' : 'desc');
    }

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
                                <h1 className="display-6 fw-semibold mb-2">All projects</h1>
                                <p className="mb-0 text-body-secondary">
                                    This is the default landing page for the workspace. It shows the complete project
                                    list and status.
                                </p>
                            </div>
                            <div className="d-flex flex-column align-items-lg-end gap-3">
                                <LiveClock />
                                <Link to="/projects/new" className="btn btn-primary">
                                    Create or Import Project
                                </Link>
                            </div>
                        </div>
                    </div>
                </Col>
            </Row>

            <div className="mt-4">
                {error ? (
                    <div className="mb-4">
                        <ProjectSummaryTable
                            projects={[]}
                            title="All Projects"
                            subtitle="Project data could not be loaded."
                            sortField={sortField}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                        />
                        <div className="alert alert-danger mt-3 mb-0" role="alert">
                            {error}
                        </div>
                    </div>
                ) : null}
                <ProjectSummaryTable
                    projects={error ? [] : pagedProjects}
                    title="All Projects"
                    subtitle={`Showing ${pagedProjects.length} of ${sortedProjects.length} projects. Page ${currentPage} of ${totalPages}.`}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    actionLabel="Open Project"
                    actionHref={(project) => `/projects/${project.ProjectUID}?from=home`}
                />
                {sortedProjects.length > PROJECTS_PER_PAGE ? (
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
