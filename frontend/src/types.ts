export interface Employee {
  id: number;
  name: string;
  department: string;
  location: 'Mandalay' | 'Yangon' | 'Custom';
  monthlySalary: number;
  workingDays: number;
}

export interface LogEntry {
  id: number;
  date: string; // YYYY-MM-DD
  checkIn: Date;
  checkOut: Date | null;
  lateMinutes: number;
}

export interface DeductionRule {
  maxMinutes: number;
  amount: number;
  label: string;
}

export interface AppSettings {
  startTimes: {
    Mandalay: string;
    Yangon: string;
    Custom: string;
  };
  endTime: string;
  graceMinutes: number;
  rules: DeductionRule[];
  warningThreshold: number;
  seriousDelayMinutes: number;
}

export interface AppSettings {
  startTimes: {
    Mandalay: string; // HH:MM
    Yangon: string;
    Custom: string;
  };
  endTime: string;
  graceMinutes: number;
  rules: DeductionRule[];
  warningThreshold: number; // max warnings before action
  seriousDelayMinutes: number;
}

export type LateLevel =
  | 'On Time'
  | 'Level 1'
  | 'Level 2'
  | 'Level 3'
  | 'Level 4'
  | 'Warning'
  | 'Serious Delay';

export interface DayResult {
  date: string;
  lateMinutes: number;
  level: LateLevel;
  deduction: number;
  exempted: boolean;
}

export interface EmployeeReport {
  employee: Employee;
  daysPresent: number;
  lateDays: number;
  warningCount: number;
  seriousDelayCount: number;
  totalDeduction: number;
  netSalary: number;
  actionRequired: boolean;
  days: DayResult[];
}