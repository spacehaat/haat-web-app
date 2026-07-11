export default function FreshBadge({ fresh }) {
  if (!fresh) return null;
  return (
    <span className={`fresh-badge ${fresh.state}`}>
      <span className="dot" />
      {fresh.label}
    </span>
  );
}
