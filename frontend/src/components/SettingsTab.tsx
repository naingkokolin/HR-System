import React from 'react';
import {
  Box, Button, TextField, Typography, Paper, Table, TableBody,
  TableCell, TableHead, TableRow, Grid, Alert, Divider,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { AppSettings } from '../types';

interface Props {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
}

export default function SettingsTab({ settings, onChange }: Props) {
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    onChange({ ...settings, [key]: value });

  const updateStartTime = (loc: keyof AppSettings['startTimes'], val: string) =>
    onChange({ ...settings, startTimes: { ...settings.startTimes, [loc]: val } });

  const updateRule = (idx: number, field: 'maxMinutes' | 'amount', val: number) => {
    const next = settings.rules.map((r, i) => i === idx ? { ...r, [field]: val } : r);
    onChange({ ...settings, rules: next });
  };

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }} gutterBottom>
          Work Schedule &amp; Locations
        </Typography>
        <Grid container spacing={2}>
          <Grid size={4}>
            <TextField label="Mandalay start time" type="time" fullWidth size="small"
              value={settings.startTimes.Mandalay}
              onChange={e => updateStartTime('Mandalay', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={4}>
            <TextField label="Yangon start time" type="time" fullWidth size="small"
              value={settings.startTimes.Yangon}
              onChange={e => updateStartTime('Yangon', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={4}>
            <TextField label="Custom start time" type="time" fullWidth size="small"
              value={settings.startTimes.Custom}
              onChange={e => updateStartTime('Custom', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={4}>
            <TextField label="Work end time" type="time" fullWidth size="small"
              value={settings.endTime}
              onChange={e => update('endTime', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={4}>
            <TextField label="Grace period (minutes)" type="number" fullWidth size="small"
              value={settings.graceMinutes}
              onChange={e => update('graceMinutes', parseInt(e.target.value) || 0)}
              helperText="No deduction within grace period" />
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }} gutterBottom>
          Deduction Rules
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Lateness is calculated as: <strong>check-in time − work start time − grace period</strong>.
          Rules are applied by the highest matching threshold.
        </Alert>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell>Level</TableCell>
              <TableCell>Late up to (minutes)</TableCell>
              <TableCell>Deduction (Ks)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {settings.rules.map((rule, i) => (
              <TableRow key={i}>
                <TableCell sx={{ fontWeight: 500 }}>{rule.label}</TableCell>
                <TableCell>
                  <TextField type="number" size="small" sx={{ width: 100 }}
                    value={rule.maxMinutes}
                    onChange={e => updateRule(i, 'maxMinutes', parseInt(e.target.value) || 0)} />
                </TableCell>
                <TableCell>
                  <TextField type="number" size="small" sx={{ width: 120 }}
                    value={rule.amount}
                    onChange={e => updateRule(i, 'amount', parseInt(e.target.value) || 0)} />
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell sx={{ fontWeight: 500 }}>Warning / Action</TableCell>
              <TableCell colSpan={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">More than {settings.rules[3]?.maxMinutes ?? 45} min late. Action required after</Typography>
                  <TextField type="number" size="small" sx={{ width: 70 }}
                    value={settings.warningThreshold}
                    onChange={e => update('warningThreshold', parseInt(e.target.value) || 1)} />
                  <Typography variant="body2">times/month</Typography>
                </Box>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 500 }}>Serious Delay</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField type="number" size="small" sx={{ width: 100 }}
                    value={settings.seriousDelayMinutes}
                    onChange={e => update('seriousDelayMinutes', parseInt(e.target.value) || 60)} />
                  <Typography variant="body2">min or more</Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  Half-day salary deduction (Monthly ÷ Working Days ÷ 2)
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      <Alert severity="success" icon={<SaveIcon />}>
        Settings are saved automatically as you type and applied immediately on the Report tab.
      </Alert>
    </Box>
  );
}