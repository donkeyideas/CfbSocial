export default function SchoolLoading() {
  return (
    <div>
      <div className="content-card" style={{ padding: 24 }}>
        <div className="skeleton" style={{ width: 200, height: 28, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: 140, height: 16 }} />
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ width: 80, height: 48, borderRadius: 4 }} />
        ))}
      </div>
    </div>
  );
}
