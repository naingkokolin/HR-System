import React, { useState, useEffect } from 'react';
import {
  Box, Container, Tab, Tabs, Typography, AppBar, Toolbar, CssBaseline,
} from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import { Employee, LogEntry, AppSettings } from './types';
import { DEFAULT_SETTINGS } from './utils';
import { DEFAULT_EMPLOYEES } from './defaultEmployees';
import EmployeesTab from './components/EmployeesTab';
import LogTab from './components/LogTab';
import SettingsTab from './components/SettingsTab';
import ReportTab from './components/ReportTab';

const LS_EMPLOYEES = 'attendance_employees';
const LS_SETTINGS = 'attendance_settings';

function loadEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(LS_EMPLOYEES);
    if (raw) return JSON.parse(raw) as Employee[];
  } catch { /* ignore */ }
  return DEFAULT_EMPLOYEES;
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as AppSettings) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
      {value === index && children}
    </Box>
  );
}

export default function App() {
  const [tab, setTab] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>(loadEmployees);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  // Persist employees whenever they change
  useEffect(() => {
    try { localStorage.setItem(LS_EMPLOYEES, JSON.stringify(employees)); } catch { /* ignore */ }
  }, [employees]);

  // Persist settings whenever they change
  useEffect(() => {
    try { localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings]);

  return (
    <>
      <CssBaseline />
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar>
          <FingerprintIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Attendance Salary Deduction
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', ml: 2 }}>
            Myanmar Kyat (Ks)
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label={`Employees (${employees.length})`} />
            <Tab label={`Log Import${log.length ? ` (${log.length})` : ''}`} />
            <Tab label="Settings" />
            <Tab label="Report" />
          </Tabs>
        </Box>

        <TabPanel value={tab} index={0}>
          <EmployeesTab employees={employees} onChange={setEmployees} />
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <LogTab employees={employees} settings={settings} log={log} onLogParsed={setLog} />
        </TabPanel>
        <TabPanel value={tab} index={2}>
          <SettingsTab settings={settings} onChange={setSettings} />
        </TabPanel>
        <TabPanel value={tab} index={3}>
          <ReportTab employees={employees} log={log} settings={settings} />
        </TabPanel>
      </Container>
    </>
  );
}