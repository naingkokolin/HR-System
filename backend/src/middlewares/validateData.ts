import { type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";

export const validateData = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const {
    employee_id,
    employee_name,
    department,
    employee_salary,
    location,
    isActive,
  } = req.body;
  if (typeof employee_id !== "number" || employee_id <= 0) {
    return res.status(400).json({
      message: "Employee ID must be number or greater than O!",
    });
  }
  if (
    !employee_id ||
    !employee_name ||
    !department ||
    !employee_salary ||
    !location ||
    !isActive
  ) {
    return res.status(400).json({
      message: "All fields are required!",
    });
  }
  if (typeof employee_salary !== "number" || employee_salary <= 0) {
    return res.status(400).json({
      message: "Employee Salary must be number or greater than O!",
    });
  }
  next();
};

export const validateID = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      message: `Invalid ID!`,
    });
  }
  next();
};
