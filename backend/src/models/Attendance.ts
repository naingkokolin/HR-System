import mongoose from "mongoose";

type AttendanceTypes = {
  employee_id: string | mongoose.Types.ObjectId | number;
  date: string | Date;
  checkInTime: string | Date;
  lateMinutes: number;
  penalty: number;
  status: string;
};

const attendanceSchema = new mongoose.Schema<AttendanceTypes>({
  employee_id: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  checkInTime: {
    type: Date,
    required: true,
  },
  lateMinutes: {
    type: Number,
    default: 0,
  },
  penalty: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["Present", "Late", "Absent"],
    default: "Present",
  },
});

attendanceSchema.index({ employee_id: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
