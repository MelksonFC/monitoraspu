import React, { useState } from 'react';
import { Box, Typography, Tab, Tabs, Paper } from '@mui/material';
import LocationManagement from '@/components/management/LocationManagement';
import UnidadeGestoraManagement from '@/components/management/UnidadeGestoraManagement';
import RegimeUtilizacaoManagement from '@/components/management/RegimeUtilizacaoManagement';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import GavelIcon from '@mui/icons-material/Gavel';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function CadastrosGerais() {
  const [value, setValue] = useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Paper sx={{ p: 3, mt: 4, width: '100%' }}>
      <Typography variant="h4" gutterBottom>Cadastros Gerais</Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="abas de cadastros gerais">
          <Tab icon={<LocationOnIcon />} iconPosition="start" label="Localização" />
          <Tab icon={<BusinessIcon />} iconPosition="start" label="Unidades Gestoras" />
          <Tab icon={<GavelIcon />} iconPosition="start" label="Regimes de Utilização" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <LocationManagement />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <UnidadeGestoraManagement />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <RegimeUtilizacaoManagement />
      </TabPanel>
    </Paper>
  );
}
