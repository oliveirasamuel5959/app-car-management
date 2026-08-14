import { describe, expect, it } from 'vitest';

import { validateRating } from './rating-validation';

describe('validateRating', () => {
  it('rejects when no rating is selected', () => {
    expect(validateRating(null)).toBe('Selecione uma nota de 1 a 5 estrelas');
  });

  it('rejects out-of-range ratings', () => {
    expect(validateRating(-1)).toBe('A nota deve estar entre 0 e 5');
    expect(validateRating(6)).toBe('A nota deve estar entre 0 e 5');
  });

  it('accepts ratings in the 0–5 range', () => {
    expect(validateRating(0)).toBeNull();
    expect(validateRating(3)).toBeNull();
    expect(validateRating(5)).toBeNull();
  });
});
