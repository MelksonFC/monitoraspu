import { IconButton, Tooltip, Badge } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';

interface FilterToggleButtonProps {
  onClick: () => void;
  filterCount: number; // Prop para receber a contagem
}

const PROPERTY_SIDEBAR_WIDTH = 35;

export default function FilterToggleButton({ onClick, filterCount }: FilterToggleButtonProps) {
  return (
    <Tooltip title="Mostrar Filtros">
      <IconButton
        onClick={onClick}
        sx={{
          position: 'absolute',
          left: PROPERTY_SIDEBAR_WIDTH, 
          top: '5%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000, 
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 3,
          '&:hover': {
            bgcolor: 'action.hover',
            transform: 'translate(-50%, -50%) scale(1.1)',
          },
          transition: 'transform 0.2s ease-in-out',
        }}
      >
        {/* MUDANÇA: O ícone agora está dentro do Badge */}
        <Badge badgeContent={filterCount} color="secondary">
          <TuneIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}