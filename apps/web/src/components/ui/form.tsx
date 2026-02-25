export function Form({ children, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {children}
    </form>
  );
}