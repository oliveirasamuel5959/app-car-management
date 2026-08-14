/** Pure validation rule for the 0–5 rating picker — exported for tests. */
export function validateRating(rating: number | null): string | null {
  if (rating === null) return 'Selecione uma nota de 1 a 5 estrelas';
  if (rating < 0 || rating > 5) return 'A nota deve estar entre 0 e 5';
  return null;
}
