import * as React from "react";
import {
  Box,
  OutlinedInput,
  InputLabel,
  MenuItem,
  FormControl,
  Select,
  Chip,
} from "@mui/material";
import { Controller } from "react-hook-form";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

export default function MyMultiSelectField(props) {
  const { control, name, label, width, options } = props;

  console.log("MyMultiSelectField options:", options); // DEBUG

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={[]}
      render={({ field: { onChange, value } }) => (
        <FormControl sx={{ width: width }}>
          <InputLabel>{label}</InputLabel>

          <Select
            multiple
            value={value ?? []}
            onChange={(e) => {
              const numericValues = e.target.value.map((v) => Number(v));
              onChange(numericValues);
            }}
            input={<OutlinedInput label={label} />}
            renderValue={(selected) => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {selected.map((id) => {
                  const employee = options.find(
                    (option) => Number(option.id) === Number(id)
                  );
                  return (
                    <Chip
                      key={id}
                      label={employee ? employee.name : id}
                    />
                  );
                })}
              </Box>
            )}
            MenuProps={MenuProps}
          >
            {options.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    />
  );
}
