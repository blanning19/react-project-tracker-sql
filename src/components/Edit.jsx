import { useEffect, useMemo, useState } from "react";
import FetchInstance from "./fetchClient"; // <- changed
import { Container, Row, Col, Form, Button, Alert, Card } from "react-bootstrap";
import { useForm, Controller } from "react-hook-form";
import Dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";

const Edit = () => {
  const { id: MyId } = useParams();

  // Initialize correctly (no undefined states)
  const [projectmanager, setProjectmanager] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const navigate = useNavigate();

  const hardcoded_options = [
    { id: "", name: "None" },
    { id: "Open", name: "Open" },
    { id: "In progress", name: "In progress" },
    { id: "Done", name: "Done" },
  ];

  // -------- DEFAULT VALUES FIRST --------
  const defaultValues = {
    name: "",
    comments: "",
    status: "",
    employees: [],
    projectmanager: "",
    start_date: null,
    end_date: null,
  };

  // -------- useForm MUST be here --------
  const { handleSubmit, setValue, control, formState: { errors }, watch } = useForm({
    defaultValues
  });

  // -------- Normalizer --------
  const normalizeEmployees = (emps) => {
    if (!emps) return [];
    return emps.map((e) => Number(e?.id ?? e));
  };

  const employeeOptions = useMemo(
    () =>
      (employees ?? []).map((e) => ({
        id: e.id,
        name: `${e.first_name} ${e.last_name}`,
      })),
    [employees]
  );

  // -------- Fetch everything --------
  const GetData = async () => {
    setApiError("");
    setLoading(true);    
    try {
      const [pmRes, empRes, projRes] = await Promise.all([
        FetchInstance.get("projectmanager/"),
        FetchInstance.get("employees/"),
        FetchInstance.get(`project/${MyId}`),
      ]);

      setProjectmanager(pmRes.data);

      // handle employees API being paginated or not
      const empData = empRes.data;
      const empList = Array.isArray(empData)
        ? empData
        : Array.isArray(empData?.results)
        ? empData.results
        : [];
      setEmployees(empList);

      const p = projRes.data;

      setValue("name", p.name ?? "");
      setValue("status", p.status ?? "");
      setValue("projectmanager", String(p.projectmanager ?? "")); // keep as string in select
      setValue("comments", p.comments ?? "");

      // Convert backend date to YYYY-MM-DD for <input type="date">
      setValue("start_date", p.start_date ? Dayjs(p.start_date).format("YYYY-MM-DD") : "");
      setValue("end_date", p.end_date ? Dayjs(p.end_date).format("YYYY-MM-DD") : "");

      const normalized = normalizeEmployees(p.employees);
      setValue("employees", normalized.map(String)); // keep select values as strings

      setLoading(false);
    } catch (err) {
      console.error("Edit GetData failed:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    GetData();
  }, [MyId]);

  // Log employee changes
  useEffect(() => {
    //console.log("FORM employees VALUE:", watch("employees"));
  }, [watch("employees")]);


  const submission = async (data) => {
    // With <input type="date"> data.start_date already "YYYY-MM-DD"
    const payload = {
      name: data.name,
      projectmanager: Number(data.projectmanager),
      employees: (data.employees ?? []).map(Number),
      status: data.status,
      comments: data.comments,
      start_date: data.start_date,
      end_date: data.end_date,
    };

    try {
      await FetchInstance.put(`project/${MyId}/`, payload);
      navigate(`/`);
    } catch (err) {
      console.error("PUT /project failed:", err?.data ?? err);

      const errorsObj = err?.data;
      if (errorsObj && typeof errorsObj === "object") {
        const message = Object.values(errorsObj).flat().join(" ");
        setApiError(message);
      } else if (err?.code === "ECONNABORTED") {
        setApiError("Request timed out. Please try again.");
      } else {
        setApiError("An unexpected error occurred.");
      }
    }
  };


  if (loading) return <p>Loading data...</p>;
  
  return (
    <Container className="py-4">
      {/* Header bar */}
      <div className="text-white px-3 py-2 mb-3" style={{ backgroundColor: "#00003f" }}>
        <strong>Edit Project</strong>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          {apiError && (
            <Alert variant="danger" className="fw-bold">
              {apiError}
            </Alert>
          )}          
          <Form onSubmit={handleSubmit(submission)}>
            {/* Row 1 */}
            <Row className="g-4 mb-3">
              <Col md={4}>
                <Form.Label>Name</Form.Label>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <Form.Control {...field} isInvalid={!!errors.name} />
                  )}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.name?.message}
                </Form.Control.Feedback>
              </Col>

              <Col md={4}>
                <Form.Label>Start date</Form.Label>
                <Controller
                  name="start_date"
                  control={control}
                  render={({ field }) => (
                    <Form.Control {...field} type="date" isInvalid={!!errors.start_date} />
                  )}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.start_date?.message}
                </Form.Control.Feedback>
              </Col>

              <Col md={4}>
                <Form.Label>End date</Form.Label>
                <Controller
                  name="end_date"
                  control={control}
                  render={({ field }) => (
                    <Form.Control {...field} type="date" isInvalid={!!errors.end_date} />
                  )}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.end_date?.message}
                </Form.Control.Feedback>
              </Col>
            </Row>

            {/* Row 2 */}
            <Row className="g-4 mb-3">
              <Col md={4}>
                <Form.Label>Comments</Form.Label>
                <Controller
                  name="comments"
                  control={control}
                  render={({ field }) => <Form.Control {...field} as="textarea" rows={4} />}
                />
              </Col>

              <Col md={4}>
                <Form.Label>Status</Form.Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Form.Select {...field} isInvalid={!!errors.status}>
                      <option value="">Select status...</option>
                      {hardcoded_options.map((o) => (
                        <option key={o.id || o.name} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </Form.Select>
                  )}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.status?.message}
                </Form.Control.Feedback>
              </Col>

              <Col md={4}>
                <Form.Label>Project manager</Form.Label>
                <Controller
                  name="projectmanager"
                  control={control}
                  render={({ field }) => (
                    <Form.Select {...field} isInvalid={!!errors.projectmanager}>
                      <option value="">Select project manager...</option>
                      {projectmanager.map((pm) => (
                        <option key={pm.id} value={String(pm.id)}>
                          {((pm.name ?? `${pm.first_name ?? ""} ${pm.last_name ?? ""}`.trim()) || `PM #${pm.id}`)}
                        </option>
                      ))}
                    </Form.Select>
                  )}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.projectmanager?.message}
                </Form.Control.Feedback>
              </Col>
            </Row>

            {/* Row 3 */}
            <Row className="g-4 mb-4">
              <Col md={4}>
                <Form.Label>Employees</Form.Label>
                <Controller
                  name="employees"
                  control={control}
                  render={({ field }) => (
                    <Form.Select
                      multiple
                      value={field.value || []}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                        field.onChange(selected);
                      }}
                      isInvalid={!!errors.employees}
                      style={{ minHeight: 160 }}
                    >
                      {employeeOptions.map((emp) => (
                        <option key={emp.id} value={String(emp.id)}>
                          {emp.name}
                        </option>
                      ))}
                    </Form.Select>
                  )}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.employees?.message}
                </Form.Control.Feedback>
                <div className="text-muted small mt-2">
                  Hold Ctrl (Windows) / Cmd (Mac) to select multiple.
                </div>
              </Col>
            </Row>

            {/* Submit row (right aligned or centered - pick one) */}
            <div className="d-flex justify-content-end">
              <Button type="submit" variant="primary" style={{ width: "30%" }}>
                Submit
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Edit;
