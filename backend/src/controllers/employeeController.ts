import { type Request, type Response } from "express";
import Employee from "../models/Employee.js";

export const getAllEmployees = async (req: Request, res: Response) => {
  try {
    const employees = await Employee.find();
    if (employees.length === 0)
      return res
        .status(404)
        .json({ message: `There is no employees in database` });

    res.status(200).json({ employees });
  } catch (error) {
    res.status(500).json({
      error: `Error while loading all employess data: ${(error as Error).message}`,
    });
  }
};

export const addEmployee = async (req: Request, res: Response) => {
  try {
    const newEmployee = await Employee.create(req.body);
    res.status(201).json({
      newEmployee,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error while adding new Employee: ${(error as Error).message}`,
    });
  }
};

export const getEmployeeById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        message: "No employee found",
      });
    }
    res.status(200).json({
      employee,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error while getting employee: ${(error as Error).message}`,
    });
  }
};

export const updateEmployeeById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const updatedEmployee = await Employee.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedEmployee) {
      return res.status(404).json({
        message: "There is no employee with this ID!",
      });
    }
    res.status(200).json({
      updatedEmployee,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error while updating employee data: ${(error as Error).message}`,
    });
  }
};

export const deleteEmployeeById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deletedEmployee = await Employee.findByIdAndDelete(id);
    if (!deletedEmployee) {
      return res.status(404).json({
        message: "There is no employee with this ID to be deleted!",
      });
    }
    res.status(200).json({
      deletedEmployee,
    });
  } catch (error) {
    res.status(500).json({
      error: `Error while deleting employee: ${(error as Error).message}`,
    });
  }
};
