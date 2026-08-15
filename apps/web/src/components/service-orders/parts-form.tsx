import {
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon, DeleteOutline as DeleteIcon } from '@mui/icons-material';

import { formatBRL } from '../../pages/client/service-status';
import type { ServicePartInput } from '../../services/service-service';

export interface PartsRow {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

export interface PartsFormValue {
  parts: PartsRow[];
  laborDescription: string;
  laborCost: string;
}

export interface NormalizedPartsValue {
  parts: ServicePartInput[];
  laborDescription: string | null;
  laborCost: number | null;
}

export function createEmptyPartsRow(): PartsRow {
  return { id: crypto.randomUUID(), description: '', quantity: '', unitPrice: '' };
}

export function createEmptyPartsValue(): PartsFormValue {
  return {
    parts: [createEmptyPartsRow()],
    laborDescription: '',
    laborCost: '',
  };
}

function parsePositiveInt(raw: string): number | null {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

function parseNonNegativeNumber(raw: string): number | null {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

/**
 * Drops empty rows and converts the raw string inputs into the completion
 * payload shape. Rows without a description are ignored; rows with invalid
 * numbers are ignored as well (the caller decides how to surface that).
 */
export function normalizePartsValue(value: PartsFormValue): NormalizedPartsValue {
  const parts: ServicePartInput[] = [];
  for (const row of value.parts) {
    const description = row.description.trim();
    if (!description) {
      continue;
    }
    const quantity = parsePositiveInt(row.quantity);
    const unitPrice = parseNonNegativeNumber(row.unitPrice);
    if (quantity === null || unitPrice === null) {
      continue;
    }
    parts.push({ description, quantity, unit_price: unitPrice });
  }

  const laborDescription = value.laborDescription.trim();
  const laborCost = parseNonNegativeNumber(value.laborCost);

  return {
    parts,
    laborDescription: laborDescription || null,
    laborCost,
  };
}

interface PartsFormProps {
  value: PartsFormValue;
  onChange: (value: PartsFormValue) => void;
}

/**
 * Editable parts checklist used by the workshop close dialogs: one row per
 * replaced part (description, quantity, unit price, auto-computed total) plus
 * a single labor entry. PT-BR labels.
 */
export default function PartsForm({ value, onChange }: PartsFormProps) {
  const updateRow = (id: string, patch: Partial<PartsRow>) => {
    onChange({
      ...value,
      parts: value.parts.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    });
  };

  const removeRow = (id: string) => {
    onChange({ ...value, parts: value.parts.filter((row) => row.id !== id) });
  };

  const addRow = () => {
    onChange({ ...value, parts: [...value.parts, createEmptyPartsRow()] });
  };

  const partsTotal = value.parts.reduce((sum, row) => {
    const quantity = parsePositiveInt(row.quantity);
    const unitPrice = parseNonNegativeNumber(row.unitPrice);
    if (quantity === null || unitPrice === null) {
      return sum;
    }
    return sum + quantity * unitPrice;
  }, 0);

  const laborTotal = parseNonNegativeNumber(value.laborCost) ?? 0;

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
          Peças substituídas
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Peça</TableCell>
                <TableCell align="right">Quantidade</TableCell>
                <TableCell align="right">Valor unitário (R$)</TableCell>
                <TableCell align="right">Valor total</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {value.parts.map((row) => {
                const quantity = parsePositiveInt(row.quantity);
                const unitPrice = parseNonNegativeNumber(row.unitPrice);
                const rowTotal =
                  quantity !== null && unitPrice !== null ? quantity * unitPrice : null;
                return (
                  <TableRow key={row.id}>
                    <TableCell sx={{ minWidth: 160, p: 1 }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Descrição da peça"
                        value={row.description}
                        onChange={(event) =>
                          updateRow(row.id, { description: event.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ width: 110, p: 1 }}>
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ min: 1, step: 1 }}
                        value={row.quantity}
                        onChange={(event) =>
                          updateRow(row.id, { quantity: event.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ width: 140, p: 1 }}>
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ min: 0, step: '0.01' }}
                        value={row.unitPrice}
                        onChange={(event) =>
                          updateRow(row.id, { unitPrice: event.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ width: 130, p: 1 }}>
                      {rowTotal !== null ? formatBRL(rowTotal) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ width: 48, p: 1 }}>
                      <IconButton
                        size="small"
                        aria-label="Remover peça"
                        onClick={() => removeRow(row.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Button startIcon={<AddIcon />} size="small" onClick={addRow} sx={{ mt: 1 }}>
          Adicionar peça
        </Button>
      </Box>

      <Divider />

      <Box>
        <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
          Mão de obra
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            size="small"
            label="Descrição da mão de obra"
            placeholder="Ex.: Troca das pastilhas"
            value={value.laborDescription}
            onChange={(event) =>
              onChange({ ...value, laborDescription: event.target.value })
            }
          />
          <TextField
            size="small"
            type="number"
            label="Valor (R$)"
            inputProps={{ min: 0, step: '0.01' }}
            value={value.laborCost}
            onChange={(event) => onChange({ ...value, laborCost: event.target.value })}
            sx={{ width: { xs: '100%', sm: 180 } }}
          />
        </Stack>
      </Box>

      <Stack spacing={0.5} sx={{ textAlign: 'right' }}>
        <Typography variant="body2" color="textSecondary">
          Total em peças: {formatBRL(partsTotal)}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Total do serviço: {formatBRL(partsTotal + laborTotal)}
        </Typography>
      </Stack>
    </Stack>
  );
}
