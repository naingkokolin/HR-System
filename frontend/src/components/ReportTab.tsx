import React, { useState, useMemo } from 'react';
import {
  Box, Button, Table, TableBody, TableCell, TableHead, TableRow,
  Typography, Paper, Chip, TextField, Collapse, IconButton,
  Alert, Grid, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import AssessmentIcon from '@mui/icons-material/Assessment';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Employee, LogEntry, EmployeeReport, AppSettings } from '../types';
import { generateReport, exportToCSV, fmtKs } from '../utils';

interface Props {
  employees: Employee[];
  log: LogEntry[];
  settings: AppSettings;
}

function getSalaryPeriodLabel(startDate: string, endDate: string): { label: string; totalDays: number } {
  if (!startDate || !endDate) return { label: '', totalDays: 0 };
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { label: '', totalDays: 0 };
  const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const monthName = end.toLocaleString('default', { month: 'long', year: 'numeric' });
  return { label: `Salary for ${monthName} (${totalDays} days)`, totalDays };
}

function defaultDates(): { start: string; end: string } {
  const now = new Date();
  const startD = new Date(now.getFullYear(), now.getMonth() - 1, 26);
  const endD = new Date(now.getFullYear(), now.getMonth(), 25);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(startD), end: fmt(endD) };
}

const statusChip = (r: EmployeeReport) => {
  if (r.actionRequired) return <Chip label="Action Required" size="small" color="error" />;
  if (r.warningCount > 0) return <Chip label={`${r.warningCount} Warning${r.warningCount > 1 ? 's' : ''}`} size="small" color="warning" />;
  if (r.seriousDelayCount > 0) return <Chip label="Serious Delay" size="small" color="error" variant="outlined" />;
  return <Chip label="Good" size="small" color="success" />;
};

const levelColor: Record<string, 'default' | 'success' | 'info' | 'warning' | 'error'> = {
  'On Time': 'success', 'Level 1': 'info', 'Level 2': 'info',
  'Level 3': 'warning', 'Level 4': 'warning', 'Warning': 'warning', 'Serious Delay': 'error',
};

function ExpandableRow({ report }: { report: EmployeeReport }) {
  const [open, setOpen] = useState(false);
  const lateDays = report.days.filter(d => d.level !== 'On Time');
  return (
    <>
      <TableRow hover sx={{ '& > td': { borderBottom: open ? 'none' : undefined } }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{report.employee.id}</TableCell>
        <TableCell>{report.employee.name}</TableCell>
        <TableCell>{report.employee.department}</TableCell>
        <TableCell>{report.employee.location}</TableCell>
        <TableCell align="center">{report.daysPresent}</TableCell>
        <TableCell align="center">{report.lateDays}</TableCell>
        <TableCell align="center">{report.warningCount}</TableCell>
        <TableCell align="center">{report.seriousDelayCount}</TableCell>
        <TableCell align="right">{report.employee.monthlySalary.toLocaleString()}</TableCell>
        <TableCell align="right" sx={{ color: report.totalDeduction > 0 ? 'error.main' : 'inherit', fontWeight: 500 }}>
          {report.totalDeduction > 0 ? report.totalDeduction.toLocaleString() : '—'}
        </TableCell>
        <TableCell align="right" sx={{ fontWeight: 500 }}>{report.netSalary.toLocaleString()}</TableCell>
        <TableCell>{statusChip(report)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={13} sx={{ p: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary', display: 'block', mb: 1 }}>
                Daily breakdown — {report.employee.name}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell>Date</TableCell>
                    <TableCell>Late (min)</TableCell>
                    <TableCell>Level</TableCell>
                    <TableCell align="right">Deduction (Ks)</TableCell>
                    <TableCell align="center">Exempted</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lateDays.map((d, i) => (
                    <TableRow key={i} sx={{ opacity: d.exempted ? 0.6 : 1, bgcolor: d.exempted ? 'action.hover' : 'inherit' }}>
                      <TableCell>{d.date}</TableCell>
                      <TableCell>{d.lateMinutes > 0 ? d.lateMinutes : '—'}</TableCell>
                      <TableCell><Chip label={d.level} size="small" color={levelColor[d.level] ?? 'default'} /></TableCell>
                      <TableCell align="right">
                        {d.exempted
                          ? <Typography variant="caption" sx={{ color: 'text.disabled', textDecoration: 'line-through' }}>waived</Typography>
                          : Math.round(d.deduction) > 0 ? Math.round(d.deduction).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell align="center">
                        {d.exempted ? <Chip label="Exempted" size="small" color="warning" variant="outlined" /> : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {lateDays.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>
                        No late arrivals in this period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function DetailTable({ report }: { report: EmployeeReport[] }) {
  return (
    <Paper variant="outlined" sx={{ overflow: 'auto' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell>ID</TableCell><TableCell>Name</TableCell><TableCell>Department</TableCell>
            <TableCell>Date</TableCell><TableCell>Late (min)</TableCell>
            <TableCell>Level</TableCell><TableCell align="right">Deduction (Ks)</TableCell>
            <TableCell align="center">Exempted</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {report.flatMap(r =>
            r.days.filter(d => d.level !== 'On Time').map((d, i) => (
              <TableRow key={`${r.employee.id}-${i}`} hover
                sx={{ opacity: d.exempted ? 0.6 : 1, bgcolor: d.exempted ? 'action.hover' : 'inherit' }}>
                <TableCell>{r.employee.id}</TableCell>
                <TableCell>{r.employee.name}</TableCell>
                <TableCell>{r.employee.department}</TableCell>
                <TableCell>{d.date}</TableCell>
                <TableCell>{d.lateMinutes > 0 ? d.lateMinutes : '—'}</TableCell>
                <TableCell><Chip label={d.level} size="small" color={levelColor[d.level] ?? 'default'} /></TableCell>
                <TableCell align="right">
                  {d.exempted
                    ? <Typography variant="caption" sx={{ color: 'text.disabled', textDecoration: 'line-through' }}>waived</Typography>
                    : Math.round(d.deduction) > 0 ? Math.round(d.deduction).toLocaleString() : '—'}
                </TableCell>
                <TableCell align="center">
                  {d.exempted ? <Chip label="Exempted" size="small" color="warning" variant="outlined" /> : '—'}
                </TableCell>
              </TableRow>
            ))
          )}
          {report.every(r => r.days.filter(d => d.level !== 'On Time').length === 0) && (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                No late arrivals in this period.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}

export default function ReportTab({ employees, log, settings }: Props) {
  const defaults = defaultDates();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [generated, setGenerated] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'detail'>('summary');

  const { label: periodLabel } = useMemo(
    () => getSalaryPeriodLabel(startDate, endDate),
    [startDate, endDate]
  );

  const report = useMemo(() => {
    if (!generated) return [];
    return generateReport(employees, log, settings, startDate, endDate);
  }, [generated, employees, log, settings, startDate, endDate]);

  const totals = useMemo(() => ({
    deduction: report.reduce((s, r) => s + r.totalDeduction, 0),
    warnings: report.filter(r => r.warningCount > 0).length,
    serious: report.reduce((s, r) => s + r.seriousDelayCount, 0),
    exempted: report.reduce((s, r) => s + r.days.filter(d => d.exempted).length, 0),
  }), [report]);

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
          Salary Period
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="Start Date" type="date" size="small" sx={{ width: 180 }}
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setGenerated(false); }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>to</Typography>
          <TextField
            label="End Date" type="date" size="small" sx={{ width: 180 }}
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setGenerated(false); }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {periodLabel && (
            <Chip label={periodLabel} color="primary" variant="outlined" sx={{ fontWeight: 500 }} />
          )}
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', gap: 1, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="contained" startIcon={<AssessmentIcon />} onClick={() => setGenerated(true)}>
          Generate Report
        </Button>
        <Button variant="outlined" startIcon={<DownloadIcon />}
          onClick={() => exportToCSV(report, periodLabel)} disabled={report.length === 0}>
          Export CSV
        </Button>
        <Button variant="outlined" startIcon={<PrintIcon />}
          onClick={() => window.print()} disabled={report.length === 0}>
          Print
        </Button>
        {report.length > 0 && (
          <ToggleButtonGroup
            value={viewMode} exclusive size="small"
            onChange={(_, v) => { if (v) setViewMode(v); }}
            sx={{ ml: 'auto' }}
          >
            <ToggleButton value="summary">Summary</ToggleButton>
            <ToggleButton value="detail">Detail</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      {generated && report.length === 0 && (
        <Alert severity="warning">No data found for the selected period. Check that employees and log are loaded.</Alert>
      )}

      {report.length > 0 && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'Employees', value: report.length },
              { label: 'Total Deductions', value: fmtKs(totals.deduction) },
              { label: 'With Warnings', value: totals.warnings },
              { label: 'Exempted Days', value: totals.exempted },
            ].map(m => (
              <Grid size={3} key={m.label}>
                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{m.label}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>{m.value}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {totals.exempted > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {totals.exempted} day{totals.exempted > 1 ? 's' : ''} exempted — deductions for these days are not included in the totals.
              To change exemptions, go to the Log Import tab.
            </Alert>
          )}

          {viewMode === 'summary' && (
            <Paper variant="outlined" sx={{ overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell /><TableCell>ID</TableCell><TableCell>Name</TableCell>
                    <TableCell>Department</TableCell><TableCell>Location</TableCell>
                    <TableCell align="center">Days Present</TableCell>
                    <TableCell align="center">Late Days</TableCell>
                    <TableCell align="center">Warnings</TableCell>
                    <TableCell align="center">Serious Delays</TableCell>
                    <TableCell align="right">Monthly Salary</TableCell>
                    <TableCell align="right">Deduction (Ks)</TableCell>
                    <TableCell align="right">Net Salary (Ks)</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.map(r => <ExpandableRow key={r.employee.id} report={r} />)}
                </TableBody>
              </Table>
            </Paper>
          )}

          {viewMode === 'detail' && <DetailTable report={report} />}
        </>
      )}
    </Box>
  );
}