import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import { formatBRL } from '../../pages/client/service-status';
import type { ServicePart } from '../../services/service-service';

interface PartsBreakdownTableProps {
  parts: ServicePart[];
  laborDescription?: string | null;
  laborCost?: number | null;
  partsCost?: number | null;
  finalCost?: number | null;
}

/**
 * Read-only part-by-part cost breakdown with the labor entry and the service
 * total. Used inside the maintenance-history drill-down modal.
 */
export default function PartsBreakdownTable({
  parts,
  laborDescription,
  laborCost,
  partsCost,
  finalCost,
}: PartsBreakdownTableProps) {
  if (parts.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        Nenhuma peça registrada neste serviço.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Peça</TableCell>
              <TableCell align="right">Quantidade</TableCell>
              <TableCell align="right">Valor unitário</TableCell>
              <TableCell align="right">Valor total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {parts.map((part) => (
              <TableRow key={part.id}>
                <TableCell>{part.description}</TableCell>
                <TableCell align="right">{part.quantity}</TableCell>
                <TableCell align="right">{formatBRL(part.unit_price)}</TableCell>
                <TableCell align="right">{formatBRL(part.total_price)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack spacing={0.5} sx={{ textAlign: 'right' }}>
        <Typography variant="body2" color="textSecondary">
          Total em peças: {formatBRL(partsCost ?? 0)}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Mão de obra{laborDescription ? ` — ${laborDescription}` : ''}:{' '}
          {formatBRL(laborCost ?? 0)}
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Total do serviço: {formatBRL(finalCost ?? 0)}
        </Typography>
      </Stack>
    </Stack>
  );
}
