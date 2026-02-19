import React, { useEffect, useState } from "react";
import { Container, Card, Button, Alert, Spinner } from "react-bootstrap";
import FetchInstance from "./fetchClient";
import { useNavigate, useParams } from "react-router-dom";

const Delete = () => {
  const { id: MyId } = useParams();
  const navigate = useNavigate();

  const [myData, setMyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const GetData = async () => {
    setApiError("");
    setLoading(true);

    try {
      // If your DRF expects trailing slash, keep it. If not, remove the ending /
      const res = await FetchInstance.get(`project/${MyId}/`);
      setMyData(res.data);
    } catch (err) {
      console.error("GET project failed:", err?.data ?? err);
      setApiError("Failed to load project details.");
      setMyData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    GetData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [MyId]);

  const submission = async () => {
    setApiError("");

    try {
      await FetchInstance.delete(`project/${MyId}/`);
      navigate(`/`);
    } catch (err) {
      console.error("DELETE project failed:", err?.data ?? err);

      const errorsObj = err?.data;
      if (errorsObj && typeof errorsObj === "object") {
        const message = Object.values(errorsObj).flat().join(" ");
        setApiError(message || "Failed to delete project.");
      } else {
        setApiError("Failed to delete project.");
      }
    }
  };

  return (
    <Container className="py-4">
      {/* Header bar */}
      <div className="text-white px-3 py-2 mb-3" style={{ backgroundColor: "#00003f" }}>
        <strong>Delete Project</strong>
      </div>

      {apiError && (
        <Alert variant="danger" className="fw-bold">
          {apiError}
        </Alert>
      )}

      {loading ? (
        <div className="d-flex align-items-center gap-2">
          <Spinner animation="border" size="sm" />
          <span>Loading data...</span>
        </div>
      ) : !myData ? (
        <div className="text-muted">Project not found.</div>
      ) : (
        <Card className="shadow-sm">
          <Card.Body>
            <div className="mb-4">
              Are you sure you want to delete this project: <strong>{myData.name}</strong>?
            </div>

            <div className="d-flex gap-2">
              <Button variant="danger" onClick={submission}>
                Delete the project
              </Button>
              <Button variant="outline-secondary" onClick={() => navigate("/")}>
                Cancel
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default Delete;
