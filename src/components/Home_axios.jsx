import React, { useEffect, useMemo, useState } from "react";
import AxiosInstance from "./Axios";
import Dayjs from "dayjs";
import { Link } from "react-router-dom";
import { Container, Button, Spinner } from "react-bootstrap";
import DataTable from "react-data-table-component";

const Home = () => {
  const [myData, setMyData] = useState([]);
  const [loading, setLoading] = useState(true);

  const GetData = () => {
    AxiosInstance.get("project/").then((res) => {
      const data = res.data;

      // handle DRF paginated or non-paginated responses
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : [];

      setMyData(list);
      setLoading(false);
    });
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
        sortable: true, // optional: allow sorting comments too
        grow: 3,
        wrap: true,
      },
      {
        name: "Start date",
        selector: (row) => row.start_date ?? "", // raw value used for sorting
        sortable: true,
        format: (row) => (row.start_date ? Dayjs(row.start_date).format("DD-MM-YYYY") : ""),
        width: "140px",
      },
      {
        name: "End date",
        selector: (row) => row.end_date ?? "",
        sortable: true,
        format: (row) => (row.end_date ? Dayjs(row.end_date).format("DD-MM-YYYY") : ""),
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
        allowOverflow: true,
        button: true,
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

          {/* Optional: add create button if you have a route */}
          <Button as={Link} to="create" variant="light" size="sm">
            + Create
          </Button>
        </div>
      </div>

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
            defaultSortFieldId={1} // if you set ids on columns; otherwise remove this line
            noDataComponent={<div className="text-muted py-4">No projects found.</div>}
          />
        </div>
      )}
    </Container>
  );
};

export default Home;
