export default function EmptyState({ message = 'Nothing here yet.' }) {
  return (
    <div className="text-center text-muted py-5">
      <p className="mb-0">{message}</p>
    </div>
  );
}
