import mongoose from "mongoose";

export type EmployeeTypes = {
  employee_id: number;
  employee_name: string;
  department: string;
  employee_salary: number;
  location: string;
  isActive: boolean;
};

const employeeSchema = new mongoose.Schema<EmployeeTypes>(
  {
    employee_id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    employee_name: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      default: "Academic",
    },
    employee_salary: {
      type: Number,
      default: 100000,
      min: [0, "Salary can't be negative!"],
    },
    location: {
      type: String,
      enum: ["Yangon", "Mandalay"],
      default: "Yangon",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const Employee = mongoose.model("Employee", employeeSchema);
export default Employee;
