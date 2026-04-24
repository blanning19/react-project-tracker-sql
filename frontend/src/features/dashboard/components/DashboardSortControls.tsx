import { Form } from 'react-bootstrap';
import { DASHBOARD_SORT_FIELDS, DASHBOARD_SORT_LABELS } from '../../../shared/constants/projectUi';
import { ProjectRecord, SortDirection } from '../../../shared/types/models';

interface DashboardSortControlsProps {
    sortField: keyof ProjectRecord;
    sortDirection: SortDirection;
    onChange: (field: keyof ProjectRecord, direction: SortDirection) => void | Promise<void>;
}

export function DashboardSortControls({
    sortField,
    sortDirection,
    onChange,
}: DashboardSortControlsProps) {
    return (
        <div className="d-flex flex-column flex-sm-row gap-3 align-items-sm-center">
            <Form.Group>
                <Form.Label className="small text-body-secondary mb-1">Sort field</Form.Label>
                <Form.Select
                    value={sortField}
                    onChange={(event) => void onChange(event.target.value as keyof ProjectRecord, sortDirection)}
                >
                    {DASHBOARD_SORT_FIELDS.map((field) => (
                        <option key={field} value={field}>
                            {DASHBOARD_SORT_LABELS[field]}
                        </option>
                    ))}
                </Form.Select>
            </Form.Group>
            <Form.Group>
                <Form.Label className="small text-body-secondary mb-1">Direction</Form.Label>
                <Form.Select
                    value={sortDirection}
                    onChange={(event) => void onChange(sortField, event.target.value as SortDirection)}
                >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                </Form.Select>
            </Form.Group>
        </div>
    );
}
