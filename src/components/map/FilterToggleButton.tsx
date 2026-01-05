import { IconButton, Tooltip, Badge, Box } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';

interface FilterToggleButtonProps {
  onClick: () => void;
  filterCount: number; // Prop para receber a contagem
}

const PROPERTY_SIDEBAR_WIDTH = 35;

export default function FilterToggleButton({ onClick, filterCount }: FilterToggleButtonProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        pointerEvents: 'none',
        zIndex: 999,
      }}
    >
      <Tooltip title="Mostrar Filtros">
        <IconButton
          onClick={onClick}
          sx={{
            position: 'absolute',
            left: PROPERTY_SIDEBAR_WIDTH,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'auto',
            bgcolor: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            border: '1px solid',
            borderColor: 'hsl(var(--border))',
            boxShadow: 3,
            outline: 'none !important',
            '&:hover': {
              bgcolor: 'hsl(var(--accent))',
              transform: 'translate(-50%, -50%) scale(1.1)',
              outline: 'none !important',
            },
            '&:focus': {
              outline: 'none !important',
            },
            '&:focus-visible': {
              outline: 'none !important',
            },
            '&:active': {
              outline: 'none !important',
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
    </Box>
  );
}
