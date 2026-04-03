export default function FeedLoading() {
  return (
    <div>
      <div className="feed-header">
        <div className="skeleton" style={{ width: 120, height: 24 }} />
      </div>
      <div className="space-y-4" style={{ marginTop: 16 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="content-card" style={{ opacity: 0.5 }}>
            <div className="post-user-row">
              <div className="skeleton" style={{ width: 38, height: 38, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: 120, height: 14, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: 80, height: 10 }} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="skeleton" style={{ width: '100%', height: 14, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: '75%', height: 14 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
