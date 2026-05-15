import { type Request, type Response } from "express";
import RawAttendanceLog from "../models/RawAttendance.js";
import Attendance from "../models/Attendance.js";

export const processAttendanceLog = async (req: Request, res: Response) => {
  try {
    const rawLogs = await RawAttendanceLog.find().sort({ timestamp: 1 });
    if (rawLogs.length === 0)
      return res.status(404).json({ message: "No Raw Log Found" });

    const grouped: Record<string, Date[]> = {};
    rawLogs.forEach((log) => {
      const dateKey =
        log.timestamp instanceof Date
          ? log.timestamp.toISOString().split("T")[0]
          : log.timestamp.split(" ")[0];

      const key = `${log.employee_id}_${dateKey}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(new Date(log.timestamp));
    });

    for (const key in grouped) {
      const [empId, dateStr] = key.split("_") as [string, string];
      const times = grouped[key];

      const checkIn = new Date(Math.min(...times!.map((t) => t.getTime())));
      const checkOut = new Date(Math.max(...times!.map((t) => t.getTime())));

      const shiftStart = new Date(checkIn);
      shiftStart.setHours(9, 0, 0, 0);
      let lateMinutes = 0;
      if (checkIn > shiftStart) {
        lateMinutes = Math.floor(
          (checkIn.getTime() - shiftStart.getTime()) / (1000 * 60),
        );
      }

      await Attendance.findOneAndUpdate(
        { employee_id: Number(empId), date: new Date(dateStr) },
        {
          check_in: checkIn,
          check_out: checkOut,
          late_minutes: lateMinutes,
          status: lateMinutes > 0 ? "Late" : "Present",
        },
        { upsert: true, new: true },
      );
    }
  } catch (error) {}
};
