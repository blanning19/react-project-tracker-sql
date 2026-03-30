import { Alert, Card, Col, Row, Table } from 'react-bootstrap';
import { UserAccessRecord } from '../../../shared/types/models';
import { AccessEditorRow } from './AccessEditorRow';

interface AccessTabProps {
    currentUserName: string;
    userAccessList: UserAccessRecord[];
    onAccessSaved: (nextRecord: UserAccessRecord) => void;
}

export function AccessTab({ currentUserName, userAccessList, onAccessSaved }: AccessTabProps) {
    return (
        <Row className="g-4 mb-4">
            <Col xl={12}>
                <Card className="shadow-sm border-0 dashboard-panel">
                    <Card.Body>
                        <p className="text-uppercase small text-body-secondary mb-1">Visibility</p>
                        <h2 className="h5 mb-3">User visibility and role controls</h2>
                        <p className="small text-body-secondary">
                            Access changes are applied per user so admins can safely grant tools without changing
                            application code.
                        </p>
                        {userAccessList.length === 0 ? (
                            <Alert variant="secondary" className="mb-0">
                                No access records are available yet.
                            </Alert>
                        ) : (
                            <div className="table-responsive">
                                <Table hover responsive className="align-middle mb-0">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Role</th>
                                            <th className="text-center">Admin</th>
                                            <th className="text-center">Logs</th>
                                            <th>Notes</th>
                                            <th className="text-end">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {userAccessList.map((userAccess) => (
                                            <AccessEditorRow
                                                key={userAccess.userName}
                                                currentUserName={currentUserName}
                                                userAccess={userAccess}
                                                onSaved={onAccessSaved}
                                            />
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
}
