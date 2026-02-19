import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import MyDatePickerField from "./forms/MyDatePickerField";
import MyTextField from "./forms/MyTextField";
import MySelectField from "./forms/MySelectField";
import MyMultiLineField from "./forms/MyMultilineField";
import MyMultiSelectField from "./forms/MyMultiSelectField";
import { useForm } from "react-hook-form";
import AxiosInstance from "./Axios";
import Dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const Create = () => {
  const [projectmanager, setProjectmanager] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");   // <-- NEW: API error message

  const hardcoded_options = [
    { id: "", name: "None" },
    { id: "Open", name: "Open" },
    { id: "In progress", name: "In progress" },
    { id: "Completed", name: "Completed" },
  ];

  const GetData = () => {
    AxiosInstance.get(`projectmanager/`).then((res) => {
      setProjectmanager(res.data);
    });

    // AxiosInstance.get(`employees/`).then((res) => {
    //   const list = Array.isArray(res.data) ? res.data : (res.data?.employees ?? []);
    //   setEmployees(list);
    //   setLoading(false);
        AxiosInstance.get("employees/").then((res) => {
          const data = res.data;

          let list = [];

          if (Array.isArray(data)) {
            list = data;                 // no pagination
          } else if (Array.isArray(data.results)) {
            list = data.results;         // paginated
          }

          setEmployees(list);
          console.log("RAW employees from API:", res.data);
          console.log("Mapped employeeOptions:", list.map(e => ({
            id: e.id,
            name: `${e.first_name} ${e.last_name}`
          })));

          setLoading(false);    
        });
  };

  useEffect(() => {
    GetData();
  }, []);

  const navigate = useNavigate();

  const defaultValues = {
    name: "",
    comments: "",
    status: "",
    projectmanager: "",
    employees: [],
    start_date: null,
    end_date: null,
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

  const { handleSubmit, control } = useForm({
    defaultValues,
    resolver: yupResolver(schema),
  });

  const submission = (data) => {
    setApiError(""); // clear old errors

    const StartDate = Dayjs(data.start_date?.["$d"] ?? data.start_date).format("YYYY-MM-DD");
    const EndDate = Dayjs(data.end_date?.["$d"] ?? data.end_date).format("YYYY-MM-DD");

    const payload = {
      name: data.name,
      projectmanager: Number(data.projectmanager),
      employees: (data.employees ?? []).map(Number),
      status: data.status,
      comments: data.comments,
      start_date: StartDate,
      end_date: EndDate,
    };
console.log("FINAL employeeOptions passed to component:", employeeOptions);

    return AxiosInstance.post("project/", payload)
      .then((res) => {
        console.log("POST /project/ OK", res.status, res.data);
        navigate(`/`);
      })
      .catch((err) => {
        console.error("POST /project/ failed:", err?.response?.data);

        const errors = err?.response?.data;

        if (errors && typeof errors === "object") {
          // Flatten DRF error messages into a single readable string
          const message = Object.values(errors)
            .flat()
            .join(" ");
          setApiError(message);
        } else {
          setApiError("An unexpected error occurred.");
        }
      });
  };

  const employeeOptions = useMemo(
    () =>
      (employees ?? []).map((e) => ({
        id: e.id,
        name: `${e.first_name} ${e.last_name}`,
      })),
    [employees]
  );
  
  console.log("FINAL employeeOptions passed to component:", employeeOptions);

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
            <Typography sx={{ marginLeft: "20px", color: "#fff" }}>Create records</Typography>
          </Box>

          <Box sx={{ display: "flex", width: "100%", boxShadow: 3, padding: 4, flexDirection: "column" }}>
            
            {/* NEW: Show API error to user */}
            {apiError && (
              <Typography color="error" sx={{ mb: 2, fontWeight: "bold" }}>
                {apiError}
              </Typography>
            )}

            <Box sx={{ display: "flex", justifyContent: "space-around", marginBottom: "40px" }}>
              <MyTextField label="Name" name="name" control={control} placeholder="Provide a project name" width="30%" />
              <MyDatePickerField label="Start date" name="start_date" control={control} width="30%" />
              <MyDatePickerField label="End date" name="end_date" control={control} width="30%" />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-around" }}>
              <MyMultiLineField
                label="Comments"
                name="comments"
                control={control}
                placeholder="Provide project comments"
                width="30%"
              />

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

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 5 }}>
              <Button variant="contained" type="submit" sx={{ width: "10%" }}>
                Submit
              </Button>
            </Box>
          </Box>
        </form>
      )}
    </div>
  );
};

export default Create;
