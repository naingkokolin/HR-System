import mongoose, { trusted } from "mongoose";

type RawLogTypes = {
  employee_id: number;
  timestamp: Date | string;
  verify_mode: number;
  in_out_state: number;
};

const rawAttendanceLogSchema = new mongoose.Schema<RawLogTypes>(
  {
    employee_id: {
      type: Number,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    verify_mode: {
      type: Number,
      default: 0,
    },
    in_out_state: {
      type: Number,
    },
  },
  { timestamps: true },
);

const RawAttendanceLog = mongoose.model(
  "RawAttendanceLog",
  rawAttendanceLogSchema,
);
export default RawAttendanceLog;
