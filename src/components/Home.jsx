import { useEffect, useMemo, useState } from "react";
import FetchInstance from "./fetchClient"; // <- changed
import Dayjs from "dayjs";
import { Link } from "react-router-dom";
import { Container, Button, Spinner, Alert } from "react-bootstrap";
import DataTable from "react-data-table-component";

const Home = () => {
  const [myData, setMyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const GetData = async () => {
    setApiError("");
    setLoading(true);

    try {
      const res = await FetchInstance.get("project/");
      const data = res.data;

      // handle DRF paginated or non-paginated responses
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : [];

      setMyData(list);
    } catch (err) {
      console.error("GET /project/ failed:", err?.data ?? err);
      setApiError("Failed to load projects.");
      setMyData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    GetData();
  }, []);

  const columns = useMemo(
    () => [
      {
        name: "Name",
        selector: (row) => row.name ?? "",
        sortable: true,
        grow: 2,
      },
      {
        name: "Status",
        selector: (row) => row.status ?? "",
        sortable: true,
        grow: 1,
      },
      {
        name: "Comments",
        selector: (row) => row.comments ?? "",
        sortable: true,
        grow: 3,
        wrap: true,
      },
      {
        name: "Start date",
        selector: (row) => row.start_date ?? "",
        sortable: true,
        format: (row) => (row.start_date ? Dayjs(row.start_date).format("MM-DD-YYYY") : ""),
        width: "140px",
      },
      {
        name: "End date",
        selector: (row) => row.end_date ?? "",
        sortable: true,
        format: (row) => (row.end_date ? Dayjs(row.end_date).format("MM-DD-YYYY") : ""),
        width: "140px",
      },
      {
        name: "Actions",
        cell: (row) => (
          <div className="d-flex gap-2">
            <Button as={Link} to={`edit/${row.id}`} variant="outline-secondary" size="sm">
              Edit
            </Button>
            <Button as={Link} to={`delete/${row.id}`} variant="outline-danger" size="sm">
              Delete
            </Button>
          </div>
        ),
        ignoreRowClick: true,
        width: "190px",
      },
    ],
    []
  );

  return (
    <Container className="py-4">
      {/* Header bar */}
      <div className="text-white px-3 py-2 mb-3" style={{ backgroundColor: "#00003f" }}>
        <div className="d-flex align-items-center justify-content-between">
          <strong>Projects</strong>

          <Button as={Link} to="create" variant="light" size="sm">
            + Create
          </Button>
        </div>
      </div>

      {apiError && (
        <Alert variant="danger" className="fw-bold">
          {apiError}{" "}
          <Button variant="outline-light" size="sm" className="ms-2" onClick={GetData}>
            Retry
          </Button>
        </Alert>
      )}

      {loading ? (
        <div className="d-flex align-items-center gap-2">
          <Spinner animation="border" size="sm" />
          <span>Loading data...</span>
        </div>
      ) : (
        <div className="table-responsive">
          <DataTable
            columns={columns}
            data={myData}
            pagination
            responsive
            highlightOnHover
            striped
            persistTableHead
            noDataComponent={<div className="text-muted py-4">No projects found.</div>}
          />
        </div>
      )}
    </Container>
  );
};

export default Home;
