export default function DemoBadge({ source }) {
  if (source === 'DEMO_DATA') {
    return (
      <span className="badge text-bg-warning" title="This is sample data, not a live Zoho response">
        Demo Data
      </span>
    );
  }
  return <span className="badge text-bg-success">Live Zoho Data</span>;
}
