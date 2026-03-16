import { Box, Typography } from '@mui/material';
import { Inbox } from '@mui/icons-material';

export function EmptyState({ title, message, icon }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        gap: 2,
        textAlign: 'center',
        p: 4,
      }}
    >
      {icon || <Inbox sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5 }} />}
      <Typography variant="h6" color="text.primary">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

