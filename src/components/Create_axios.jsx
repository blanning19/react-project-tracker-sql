import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Form, Button, Alert, Card } from "react-bootstrap";
import { useForm, Controller } from "react-hook-form";
import AxiosInstance from "./Axios";
import Dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const Create = () => {
  const [projectmanager, setProjectmanager] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const navigate = useNavigate();

  const hardcoded_options = [
    { id: "", name: "None" },
    { id: "Open", name: "Open" },
    { id: "In progress", name: "In progress" },
    { id: "Completed", name: "Completed" },
  ];

  const defaultValues = {
    name: "",
    comments: "",
    status: "",
    projectmanager: "",
    employees: [],
    start_date: "",
    end_date: "",
  };

  const schema = yup.object({
    name: yup.string().required("Name is a required field"),
    projectmanager: yup.string().required("Project manager is a required field"),
    status: yup.string().required("Status is a required field"),
    employees: yup.array().min(1, "Pick at least one option from the select field"),
    comments: yup.string(),
    start_date: yup.date().required("Start date is a required field"),
    end_date: yup
      .date()
      .required("End date is a required field")
      .min(yup.ref("start_date"), "The end date can not be before the start date"),
  });

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues,
    resolver: yupResolver(schema),
  });

  const employeeOptions = useMemo(
    () =>
      (employees ?? []).map((e) => ({
        id: e.id,
        name: `${e.first_name} ${e.last_name}`,
      })),
    [employees]
  );

  const GetData = () => {
    AxiosInstance.get("projectmanager/").then((res) => {
      setProjectmanager(res.data);
    });

    AxiosInstance.get("employees/").then((res) => {
      const data = res.data;

      let list = [];
      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data.results)) list = data.results;

      setEmployees(list);
      setLoading(false);
    });
  };

  useEffect(() => {
    GetData();
  }, []);

  const submission = (data) => {
    setApiError("");

    // start_date / end_date from <input type="date"> will already be "YYYY-MM-DD"
    // but we’ll normalize anyway for safety:
    const StartDate = Dayjs(data.start_date).format("YYYY-MM-DD");
    const EndDate = Dayjs(data.end_date).format("YYYY-MM-DD");

    const payload = {
      name: data.name,
      projectmanager: Number(data.projectmanager),
      employees: (data.employees ?? []).map(Number),
      status: data.status,
      comments: data.comments,
      start_date: StartDate,
      end_date: EndDate,
    };

    return AxiosInstance.post("project/", payload)
      .then((res) => {
        console.log("POST /project/ OK", res.status, res.data);
        navigate(`/`);
      })
      .catch((err) => {
        console.error("POST /project/ failed:", err?.response?.data);

        const errorsObj = err?.response?.data;

        if (errorsObj && typeof errorsObj === "object") {
          const message = Object.values(errorsObj).flat().join(" ");
          setApiError(message);
        } else {
          setApiError("An unexpected error occurred.");
        }
      });
  };

  if (loading) return <p>Loading data...</p>;

  return (
    <Container className="py-4">
      {/* Header bar */}
      <div className="text-white px-3 py-2 mb-3" style={{ backgroundColor: "#00003f" }}>
        <strong>Create records</strong>
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
                    <Form.Control
                      {...field}
                      placeholder="Provide a project name"
                      isInvalid={!!errors.name}
                    />
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
                  render={({ field }) => (
                    <Form.Control {...field} as="textarea" rows={4} placeholder="Provide project comments" />
                  )}
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
                        <option key={pm.id} value={pm.id}>
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
                        // convert selectedOptions -> array of values
                        const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                        field.onChange(selected);
                      }}
                      isInvalid={!!errors.employees}
                      style={{ minHeight: 160 }}
                    >
                      {employeeOptions.map((emp) => (
                        <option key={emp.id} value={emp.id}>
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

            {/* Submit row (right-justified) */}
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

export default Create;
