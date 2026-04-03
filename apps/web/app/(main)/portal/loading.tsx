export default function PortalLoading() {
  return (
    <div>
      <div className="feed-header">
        <div className="skeleton" style={{ width: 160, height: 24 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="content-card" style={{ opacity: 0.5, height: 120 }}>
            <div className="skeleton" style={{ width: '60%', height: 16, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '40%', height: 14 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
