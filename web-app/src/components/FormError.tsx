export function FormError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return <span className="field-error" id={id}>{message}</span>;
}
