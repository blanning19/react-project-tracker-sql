import React, { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import MyDatePickerField from "./forms/MyDatePickerField";
import MyTextField from "./forms/MyTextField";
import MySelectField from "./forms/MySelectField";
import MyMultiLineField from "./forms/MyMultilineField";
import MyMultiSelectField from "./forms/MyMultiSelectField";
import { useForm } from "react-hook-form";
import AxiosInstance from "./Axios";
import Dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";

const Edit = () => {
  const { id: MyId } = useParams();

  // Initialize correctly (no undefined states)
  const [projectmanager, setProjectmanager] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const hardcoded_options = [
    { id: "", name: "None" },
    { id: "Open", name: "Open" },
    { id: "In progress", name: "In progress" },
    { id: "Completed", name: "Completed" },
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
  const { handleSubmit, setValue, control, watch } = useForm({
    defaultValues,
  });

  // -------- Normalizer --------
  const normalizeEmployees = (emps) => {
    if (!emps) return [];
    return emps.map((e) => Number(e.id ?? e));
  };

  // -------- Fetch everything --------
  const GetData = () => {
    AxiosInstance.get(`projectmanager/`).then((res) => {
      console.log("PROJECT MANAGERS:", res.data);
      setProjectmanager(res.data);
    });

    AxiosInstance.get(`employees/`).then((res) => {
      console.log("EMPLOYEE OPTIONS FOR EDIT:", res.data);
      setEmployees(res.data);
    });

    AxiosInstance.get(`project/${MyId}`).then((res) => {
      console.log("EDIT PROJECT:", res.data);

      setValue("name", res.data.name);
      setValue("status", res.data.status);
      setValue("projectmanager", Number(res.data.projectmanager));
      setValue("comments", res.data.comments);
      setValue("start_date", Dayjs(res.data.start_date));
      setValue("end_date", Dayjs(res.data.end_date));

      console.log("RAW employees from backend:", res.data.employees);

      const normalized = normalizeEmployees(res.data.employees);
      console.log("NORMALIZED employees:", normalized);

      setValue("employees", normalized);

      setLoading(false);
    });
  };

  useEffect(() => {
    console.log("Edit page mounted");
    GetData();
  }, []);

  // Log employee changes
  useEffect(() => {
    console.log("FORM employees VALUE:", watch("employees"));
  }, [watch("employees")]);

  const navigate = useNavigate();

  const submission = (data) => {
    const StartDate = Dayjs(data.start_date["$d"]).format("YYYY-MM-DD");
    const EndDate = Dayjs(data.end_date["$d"]).format("YYYY-MM-DD");

    AxiosInstance.put(`project/${MyId}/`, {
      name: data.name,
      projectmanager: data.projectmanager,
      employees: data.employees,
      status: data.status,
      comments: data.comments,
      start_date: StartDate,
      end_date: EndDate,
    }).then(() => navigate(`/`));
  };

  const employeeOptions = employees.map(e => ({
    id: e.id,
    name: `${e.first_name} ${e.last_name}`
  }));

  return (
    <div>
      {loading ? (
        <p>Loading data...</p>
      ) : (
        <form onSubmit={handleSubmit(submission)}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              backgroundColor: "#00003f",
              marginBottom: "10px",
            }}
          >
            <Typography sx={{ marginLeft: "20px", color: "#fff" }}>
              Edit Project
            </Typography>
          </Box>

          <Box sx={{ display: "flex", width: "100%", boxShadow: 3, padding: 4, flexDirection: "column" }}>
            <Box sx={{ display: "flex", justifyContent: "space-around", marginBottom: "40px" }}>
              <MyTextField label="Name" name="name" control={control} width="30%" />

              <MyDatePickerField label="Start date" name="start_date" control={control} width="30%" />

              <MyDatePickerField label="End date" name="end_date" control={control} width="30%" />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-around" }}>
              <MyMultiLineField label="Comments" name="comments" control={control} width="30%" />

              <MySelectField label="Status" name="status" control={control} width="30%" options={hardcoded_options} />

              <MySelectField
                label="Project manager"
                name="projectmanager"
                control={control}
                width="30%"
                options={projectmanager}
              />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-around", marginTop: "40px" }}>
              <MyMultiSelectField
                label="Employees"
                name="employees"
                control={control}
                width="30%"
                options={employeeOptions}
              />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "center", marginTop: "40px" }}>
              <Button variant="contained" type="submit" sx={{ width: "30%" }}>
                Submit
              </Button>
            </Box>
          </Box>
        </form>
      )}
    </div>
  );
};

export default Edit;
