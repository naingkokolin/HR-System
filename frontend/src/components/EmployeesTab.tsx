import React, { useState } from 'react';
import {
  Box, Button, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Select, MenuItem, FormControl, InputLabel, Typography,
  Paper, IconButton, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import * as XLSX from 'xlsx';
import { Employee } from '../types';

interface Props {
  employees: Employee[];
  onChange: (employees: Employee[]) => void;
}

const EMPTY_FORM = {
  id: '',
  name: '',
  department: '',
  location: 'Mandalay' as Employee['location'],
  monthlySalary: 300000,
  workingDays: 26,
};

function findCol(headers: string[], ...keywords: string[]): number {
  return headers.findIndex(h =>
    keywords.some(kw => h.toLowerCase().includes(kw.toLowerCase()))
  );
}

function parseRows(rows: string[][]): { emps: Employee[]; error: string } {
  if (rows.length < 2) return { emps: [], error: 'File appears to be empty.' };
  const headers = rows[0].map(h => String(h ?? '').trim());

  const nameCol = findCol(headers, 'name');
  const deptCol = findCol(headers, 'department', 'dept', 'division');
  const salaryCol = findCol(headers, 'salary', 'total salary', 'pay', 'wage');
  const idCol = findCol(headers, 'id', 'no', 'emp no', 'emp id', 'number');
  const locationCol = findCol(headers, 'location', 'office', 'branch', 'city');
  const daysCol = findCol(headers, 'working days', 'workdays', 'work day');

  const missing: string[] = [];
  if (nameCol === -1) missing.push('Name');
  if (deptCol === -1) missing.push('Department');
  if (salaryCol === -1) missing.push('Total Salary');
  if (missing.length > 0) {
    return { emps: [], error: `Missing required columns: ${missing.join(', ')}. Found headers: ${headers.join(', ')}` };
  }

  const emps: Employee[] = [];
  let autoId = 1;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = String(row[nameCol] ?? '').trim();
    const dept = String(row[deptCol] ?? '').trim();
    const salaryRaw = String(row[salaryCol] ?? '').replace(/[^0-9.]/g, '');
    const salary = parseInt(salaryRaw) || 0;
    if (!name || !salary) continue;

    const idRaw = idCol >= 0 ? parseInt(String(row[idCol] ?? '')) : NaN;
    const id = isNaN(idRaw) || idRaw <= 0 ? autoId++ : idRaw;
    if (idRaw > 0) autoId = Math.max(autoId, idRaw + 1);

    const locRaw = locationCol >= 0 ? String(row[locationCol] ?? '').toLowerCase() : '';
    const location: Employee['location'] =
      locRaw.includes('yangon') ? 'Yangon' : locRaw.includes('custom') ? 'Custom' : 'Mandalay';

    const days = daysCol >= 0 ? parseInt(String(row[daysCol] ?? '')) || 26 : 26;
    emps.push({ id, name, department: dept, location, monthlySalary: salary, workingDays: days });
  }
  return { emps, error: emps.length === 0 ? 'No valid data rows found.' : '' };
}

export default function EmployeesTab({ employees, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  const openAdd = () => { setForm({ ...EMPTY_FORM }); setEditIndex(null); setFormError(''); setOpen(true); };
  const openEdit = (i: number) => {
    const e = employees[i];
    setForm({ ...e, id: String(e.id) }); setEditIndex(i); setFormError(''); setOpen(true);
  };

  const save = () => {
    const id = parseInt(form.id);
    if (!id || !form.name.trim()) { setFormError('ID and Name are required.'); return; }
    if (employees.some((e, i) => e.id === id && i !== editIndex)) { setFormError('Employee ID already exists.'); return; }
    const emp: Employee = { ...form, id, monthlySalary: Number(form.monthlySalary), workingDays: Number(form.workingDays) };
    if (editIndex !== null) { const next = [...employees]; next[editIndex] = emp; onChange(next); }
    else onChange([...employees, emp]);
    setOpen(false);
  };

  const remove = (i: number) => onChange(employees.filter((_, idx) => idx !== i));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(''); setImportSuccess('');
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        let rows: string[][];
        if (isExcel) {
          const wb = XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];
        } else {
          rows = (ev.target?.result as string).trim().split('\n')
            .map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
        }

        const { emps, error } = parseRows(rows);
        if (error) { setImportError(error); return; }

        const next = [...employees];
        let added = 0, updated = 0;
        for (const emp of emps) {
          const idx = next.findIndex(x => x.id === emp.id);
          if (idx >= 0) { next[idx] = emp; updated++; } else { next.push(emp); added++; }
        }
        onChange(next);
        setImportSuccess(`Imported ${emps.length} employees — ${added} added, ${updated} updated.`);
      } catch {
        setImportError('Failed to read file. Please check the format.');
      }
    };
    if (isExcel) reader.readAsArrayBuffer(file); else reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add Employee</Button>
        <Button variant="outlined" startIcon={<UploadFileIcon />} component="label">
          Import CSV / Excel
          <input type="file" accept=".csv,.xlsx,.xls" hidden onChange={handleFile} />
        </Button>
        <Typography variant="body2" sx={{ color: 'text.secondary', ml: 'auto' }}>
          {employees.length} employee{employees.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 1 }}>
        Required columns in your file: <strong>Name</strong>, <strong>Department</strong>, <strong>Total Salary</strong>.
        Optional: ID, Location (Mandalay / Yangon / Custom), Working Days. All other columns are ignored.
      </Alert>
      {importError && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setImportError('')}>{importError}</Alert>}
      {importSuccess && <Alert severity="success" sx={{ mb: 1 }} onClose={() => setImportSuccess('')}>{importSuccess}</Alert>}

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell>ID</TableCell><TableCell>Name</TableCell><TableCell>Department</TableCell>
              <TableCell>Location</TableCell><TableCell align="right">Monthly Salary</TableCell>
              <TableCell align="right">Working Days</TableCell><TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                No employees yet. Import a file or add manually.
              </TableCell></TableRow>
            )}
            {employees.map((emp, i) => (
              <TableRow key={emp.id} hover>
                <TableCell>{emp.id}</TableCell>
                <TableCell>{emp.name}</TableCell>
                <TableCell>{emp.department}</TableCell>
                <TableCell><Chip label={emp.location} size="small" variant="outlined" /></TableCell>
                <TableCell align="right">{emp.monthlySalary.toLocaleString()} Ks</TableCell>
                <TableCell align="right">{emp.workingDays}</TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => openEdit(i)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(i)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editIndex !== null ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={6}><TextField label="Employee ID" type="number" fullWidth size="small"
              value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} /></Grid>
            <Grid size={6}><TextField label="Name" fullWidth size="small"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Grid>
            <Grid size={6}><TextField label="Department" fullWidth size="small"
              value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></Grid>
            <Grid size={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Location</InputLabel>
                <Select label="Location" value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value as Employee['location'] }))}>
                  <MenuItem value="Mandalay">Mandalay</MenuItem>
                  <MenuItem value="Yangon">Yangon</MenuItem>
                  <MenuItem value="Custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}><TextField label="Monthly Salary (Ks)" type="number" fullWidth size="small"
              value={form.monthlySalary} onChange={e => setForm(f => ({ ...f, monthlySalary: Number(e.target.value) }))} /></Grid>
            <Grid size={6}><TextField label="Working Days / Month" type="number" fullWidth size="small"
              value={form.workingDays} onChange={e => setForm(f => ({ ...f, workingDays: Number(e.target.value) }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}