import { AppSettings, DeductionRule, Employee, LateLevel, LogEntry, DayResult, EmployeeReport } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
  startTimes: {
    Mandalay: '08:30',
    Yangon: '09:00',
    Custom: '08:00',
  },
  endTime: '17:00',
  graceMinutes: 0,
  rules: [
    { maxMinutes: 10, amount: 500, label: 'Level 1' },
    { maxMinutes: 15, amount: 1000, label: 'Level 2' },
    { maxMinutes: 30, amount: 1500, label: 'Level 3' },
    { maxMinutes: 45, amount: 3000, label: 'Level 4' },
  ],
  warningThreshold: 3,
  seriousDelayMinutes: 60,
};

// ─── Exemptions (persisted in localStorage) ────────────────────────────────
// Key format: "empId_YYYY-MM-DD"  e.g. "5_2026-04-06"

const LS_KEY = 'attendance_exemptions';

function loadExemptions(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveExemptions(ex: Set<string>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ex]));
  } catch { /* ignore */ }
}

export function getExemptions(): Set<string> {
  return loadExemptions();
}

export function exemptionKey(empId: number, date: string): string {
  return `${empId}_${date}`;
}

export function isExempt(empId: number, date: string): boolean {
  return loadExemptions().has(exemptionKey(empId, date));
}

export function toggleExemption(empId: number, date: string): boolean {
  const ex = loadExemptions();
  const key = exemptionKey(empId, date);
  if (ex.has(key)) { ex.delete(key); } else { ex.add(key); }
  saveExemptions(ex);
  return ex.has(key); // returns new state
}

// ─── Core logic ────────────────────────────────────────────────────────────

export function getStartMinutes(location: Employee['location'], settings: AppSettings): number {
  const t = settings.startTimes[location] ?? '08:30';
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function getLateLevel(
  lateMinutes: number,
  rules: DeductionRule[],
  seriousMin: number
): LateLevel {
  if (lateMinutes <= 0) return 'On Time';
  if (lateMinutes <= rules[0].maxMinutes) return 'Level 1';
  if (lateMinutes <= rules[1].maxMinutes) return 'Level 2';
  if (lateMinutes <= rules[2].maxMinutes) return 'Level 3';
  if (lateMinutes <= rules[3].maxMinutes) return 'Level 4';
  if (lateMinutes >= seriousMin) return 'Serious Delay';
  return 'Warning';
}

export function getDeduction(
  level: LateLevel,
  rules: DeductionRule[],
  employee: Employee
): number {
  switch (level) {
    case 'Level 1': return rules[0].amount;
    case 'Level 2': return rules[1].amount;
    case 'Level 3': return rules[2].amount;
    case 'Level 4': return rules[3].amount;
    case 'Serious Delay': return employee.monthlySalary / (employee.workingDays * 2);
    default: return 0;
  }
}

export function parseLogText(raw: string, employees: Employee[], settings: AppSettings): LogEntry[] {
  const lines = raw.trim().split('\n');
  const byIdDate = new Map<string, { id: number; date: string; times: Date[] }>();

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const id = parseInt(parts[0]);
    const dateStr = parts[1];
    const timeStr = parts[2] ?? '';
    if (!id || !dateStr) continue;
    const dt = new Date(`${dateStr}${timeStr ? ' ' + timeStr : ''}`);
    if (isNaN(dt.getTime())) continue;
    const key = `${id}_${dateStr}`;
    if (!byIdDate.has(key)) byIdDate.set(key, { id, date: dateStr, times: [] });
    byIdDate.get(key)!.times.push(dt);
  }

  const result: LogEntry[] = [];
  for (const entry of byIdDate.values()) {
    entry.times.sort((a, b) => a.getTime() - b.getTime());
    const checkIn = entry.times[0];
    // Keep checkout for display only — NOT used in lateness calculation
    const checkOut = entry.times.length > 1 ? entry.times[entry.times.length - 1] : null;

    const emp = employees.find(e => e.id === entry.id);
    const loc = emp?.location ?? 'Mandalay';
    const startMin = getStartMinutes(loc, settings);

    // Lateness = check-in time only vs work start time
    const cinMin = checkIn.getHours() * 60 + checkIn.getMinutes();
    const lateMinutes = Math.max(0, cinMin - startMin - settings.graceMinutes);

    result.push({ id: entry.id, date: entry.date, checkIn, checkOut, lateMinutes });
  }

  return result;
}

export function generateReport(
  employees: Employee[],
  log: LogEntry[],
  settings: AppSettings,
  startDate?: string,
  endDate?: string
): EmployeeReport[] {
  const exemptions = loadExemptions();
  const byEmp = new Map<number, EmployeeReport>();

  for (const emp of employees) {
    byEmp.set(emp.id, {
      employee: emp,
      daysPresent: 0,
      lateDays: 0,
      warningCount: 0,
      seriousDelayCount: 0,
      totalDeduction: 0,
      netSalary: emp.monthlySalary,
      actionRequired: false,
      days: [],
    });
  }

  for (const entry of log) {
    if (startDate && entry.date < startDate) continue;
    if (endDate && entry.date > endDate) continue;
    const rec = byEmp.get(entry.id);
    if (!rec) continue;

    rec.daysPresent++;

    const exempted = exemptions.has(exemptionKey(entry.id, entry.date));
    const level = getLateLevel(entry.lateMinutes, settings.rules, settings.seriousDelayMinutes);
    // If admin exempted this day, deduction = 0 but level label still shown
    const deduction = exempted ? 0 : getDeduction(level, settings.rules, rec.employee);

    const dayResult: DayResult = {
      date: entry.date,
      lateMinutes: entry.lateMinutes,
      level,
      deduction,
      exempted,
    };
    rec.days.push(dayResult);

    if (!exempted) {
      if (level === 'Serious Delay') {
        rec.seriousDelayCount++;
        rec.totalDeduction += deduction;
      } else if (level === 'Warning') {
        rec.warningCount++;
        rec.lateDays++;
      } else if (deduction > 0) {
        rec.lateDays++;
        rec.totalDeduction += deduction;
      }
    }
  }

  for (const rec of byEmp.values()) {
    if (rec.warningCount >= settings.warningThreshold) rec.actionRequired = true;
    rec.totalDeduction = Math.round(rec.totalDeduction);
    rec.netSalary = rec.employee.monthlySalary - rec.totalDeduction;
  }

  return [...byEmp.values()]
    .filter(r => r.daysPresent > 0)
    .sort((a, b) => b.totalDeduction - a.totalDeduction);
}

export function exportToCSV(reports: EmployeeReport[], periodLabel = ''): void {
  const rows: string[] = [];
  if (periodLabel) rows.push(`"${periodLabel}"`);
  rows.push('ID,Name,Department,Location,Days Present,Late Days,Warnings,Serious Delays,Monthly Salary (Ks),Total Deduction (Ks),Net Salary (Ks),Status');

  for (const r of reports) {
    const status = r.actionRequired ? 'Action Required'
      : r.warningCount > 0 ? 'Warning'
        : r.seriousDelayCount > 0 ? 'Serious Delay'
          : 'Good';
    rows.push([
      r.employee.id, `"${r.employee.name}"`, `"${r.employee.department}"`, r.employee.location,
      r.daysPresent, r.lateDays, r.warningCount, r.seriousDelayCount,
      r.employee.monthlySalary, r.totalDeduction, r.netSalary, status,
    ].join(','));
  }

  rows.push('');
  rows.push('"=== Daily Breakdown ==="');
  for (const r of reports) {
    rows.push('');
    rows.push(`"${r.employee.name} (ID: ${r.employee.id})"`);
    rows.push('Date,Late (min),Level,Deduction (Ks),Exempted');
    for (const d of r.days) {
      rows.push(`${d.date},${d.lateMinutes},${d.level},${Math.round(d.deduction)},${d.exempted ? 'Yes' : 'No'}`);
    }
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `salary_deduction_report_${new Date().toISOString().slice(0, 7)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function fmtKs(n: number): string {
  return n.toLocaleString() + ' Ks';
}