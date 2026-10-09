/**
 * Narrow an unknown thrown value to a message safe to render.
 * The API layer throws `Error` instances, but a non-Error can reach a catch
 * block, so never assume the shape.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  if (typeof err === 'string' && err.trim()) {
    return err;
  }
  return fallback;
}
