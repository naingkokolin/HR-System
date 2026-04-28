import React, { useState, useMemo, useCallback } from 'react';
import {
  Box, Button, TextField, Typography, Paper, Table, TableBody,
  TableCell, TableHead, TableRow, Chip, Alert, ToggleButton,
  ToggleButtonGroup, Checkbox, Tooltip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ClearIcon from '@mui/icons-material/Clear';
import { Employee, LogEntry, AppSettings } from '../types';
import { getLateLevel, parseLogText, toggleExemption, getExemptions, exemptionKey } from '../utils';

interface Props {
  employees: Employee[];
  settings: AppSettings;
  log: LogEntry[];
  onLogParsed: (log: LogEntry[]) => void;
}

const levelColor: Record<string, 'default' | 'success' | 'info' | 'warning' | 'error'> = {
  'On Time': 'success', 'Level 1': 'info', 'Level 2': 'info',
  'Level 3': 'warning', 'Level 4': 'warning', 'Warning': 'warning', 'Serious Delay': 'error',
};

export default function LogTab({ employees, settings, log, onLogParsed }: Props) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState<'detail' | 'summary'>('detail');
  // Track exemptions in state so checkboxes re-render on toggle
  const [exemptions, setExemptions] = useState<Set<string>>(() => getExemptions());

  const parse = () => {
    if (!raw.trim()) { setError('Please paste log data first.'); return; }
    setError('');
    onLogParsed(parseLogText(raw, employees, settings));
  };

  const clear = () => { setRaw(''); onLogParsed([]); setError(''); };

  const handleToggleExemption = useCallback((empId: number, date: string) => {
    toggleExemption(empId, date);
    setExemptions(getExemptions()); // refresh from localStorage
  }, []);

  // Summary: group by employee ID
  const summary = useMemo(() => {
    const map = new Map<number, { id: number; days: number; lateDays: number; totalLate: number; exemptedDays: number }>();
    for (const entry of log) {
      if (!map.has(entry.id)) map.set(entry.id, { id: entry.id, days: 0, lateDays: 0, totalLate: 0, exemptedDays: 0 });
      const rec = map.get(entry.id)!;
      rec.days++;
      if (entry.lateMinutes > 0) {
        rec.lateDays++;
        rec.totalLate += entry.lateMinutes;
        if (exemptions.has(exemptionKey(entry.id, entry.date))) rec.exemptedDays++;
      }
    }
    return [...map.values()].sort((a, b) => a.id - b.id);
  }, [log, exemptions]);

  const empName = (id: number) => employees.find(e => e.id === id)?.name ?? `ID ${id}`;
  const empDept = (id: number) => employees.find(e => e.id === id)?.department ?? '—';

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Expected format: <code>ID&nbsp;&nbsp;YYYY-MM-DD HH:MM:SS&nbsp;&nbsp;c3 c4 c5 c6</code> (space or tab-separated).
        Multiple punches per day supported — first punch = check-in (used for lateness), last = check-out (display only).
      </Alert>

      <TextField
        multiline rows={10} fullWidth
        placeholder={"25\t2026-04-04 08:43:57\t1\t0\t1\t0\n 3\t2026-04-04 08:44:02\t1\t0\t1\t0\n..."}
        value={raw}
        onChange={e => setRaw(e.target.value)}
        slotProps={{ input: { style: { fontFamily: 'monospace', fontSize: 12 } } }}
        sx={{ mb: 1 }}
      />

      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 1, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={parse}>Parse Log</Button>
        <Button variant="outlined" color="error" startIcon={<ClearIcon />} onClick={clear}>Clear</Button>
        {log.length > 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary', alignSelf: 'center' }}>
            {log.length} day-entries parsed
          </Typography>
        )}
        {log.length > 0 && (
          <ToggleButtonGroup
            value={view} exclusive size="small"
            onChange={(_, v) => { if (v) setView(v); }}
            sx={{ ml: 'auto' }}
          >
            <ToggleButton value="detail">Detail</ToggleButton>
            <ToggleButton value="summary">Summary</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      {/* ── DETAIL VIEW ─────────────────────────────────────────────── */}
      {log.length > 0 && view === 'detail' && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle2">
              Detail view — all punches (first 200 entries)
            </Typography>
            <Tooltip title="Check a row to exempt that employee's deduction for that day. Exemptions are saved automatically.">
              <Chip label="ℹ Exemption: check a row to waive deduction" size="small" variant="outlined" />
            </Tooltip>
          </Box>
          <Paper variant="outlined" sx={{ maxHeight: 500, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Check-in</TableCell>
                  <TableCell>Check-out</TableCell>
                  <TableCell>Late (min)</TableCell>
                  <TableCell>Level</TableCell>
                  <Tooltip title="Check to exempt this day — deduction will not be applied in the report">
                    <TableCell align="center">Exempt</TableCell>
                  </Tooltip>
                </TableRow>
              </TableHead>
              <TableBody>
                {log.slice(0, 200).map((entry, i) => {
                  const level = getLateLevel(entry.lateMinutes, settings.rules, settings.seriousDelayMinutes);
                  const exempted = exemptions.has(exemptionKey(entry.id, entry.date));
                  const hasDeduction = entry.lateMinutes > 0 && level !== 'On Time';
                  return (
                    <TableRow
                      key={i}
                      hover
                      sx={{ opacity: exempted ? 0.55 : 1, bgcolor: exempted ? 'action.hover' : 'inherit' }}
                    >
                      <TableCell>{entry.id}</TableCell>
                      <TableCell>{empName(entry.id)}</TableCell>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell>{entry.checkIn.toTimeString().slice(0, 5)}</TableCell>
                      <TableCell>{entry.checkOut ? entry.checkOut.toTimeString().slice(0, 5) : '—'}</TableCell>
                      <TableCell>{entry.lateMinutes > 0 ? entry.lateMinutes : '—'}</TableCell>
                      <TableCell>
                        <Chip label={level} size="small" color={levelColor[level] ?? 'default'} />
                      </TableCell>
                      <TableCell align="center">
                        {hasDeduction ? (
                          <Tooltip title={exempted ? 'Click to restore deduction' : 'Click to waive deduction for this day'}>
                            <Checkbox
                              size="small"
                              checked={exempted}
                              onChange={() => handleToggleExemption(entry.id, entry.date)}
                              color="warning"
                            />
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" sx={{ color: 'text.disabled' }}>—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {log.length > 200 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ color: 'text.secondary', fontSize: 12 }}>
                      ... and {log.length - 200} more entries
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
          {exemptions.size > 0 && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {exemptions.size} exemption{exemptions.size > 1 ? 's' : ''} active — these days will have no deduction in the report.
            </Alert>
          )}
        </>
      )}

      {/* ── SUMMARY VIEW ────────────────────────────────────────────── */}
      {log.length > 0 && view === 'summary' && (
        <>
          <Typography variant="subtitle2" gutterBottom>
            Summary view — per employee
          </Typography>
          <Paper variant="outlined" sx={{ maxHeight: 500, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell align="center">Days Recorded</TableCell>
                  <TableCell align="center">Late Days</TableCell>
                  <TableCell align="center">Exempted Days</TableCell>
                  <TableCell align="center">Total Late (min)</TableCell>
                  <TableCell align="center">Avg Late (min)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.map(s => (
                  <TableRow key={s.id} hover>
                    <TableCell>{s.id}</TableCell>
                    <TableCell>{empName(s.id)}</TableCell>
                    <TableCell>{empDept(s.id)}</TableCell>
                    <TableCell align="center">{s.days}</TableCell>
                    <TableCell align="center">
                      <Chip label={s.lateDays} size="small"
                        color={s.lateDays === 0 ? 'success' : s.lateDays >= 3 ? 'error' : 'warning'} />
                    </TableCell>
                    <TableCell align="center">
                      {s.exemptedDays > 0
                        ? <Chip label={s.exemptedDays} size="small" color="warning" variant="outlined" />
                        : '—'}
                    </TableCell>
                    <TableCell align="center">{s.totalLate || '—'}</TableCell>
                    <TableCell align="center">
                      {s.lateDays > 0 ? Math.round(s.totalLate / s.lateDays) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
}