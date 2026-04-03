export default function RecruitingLoading() {
  return (
    <div>
      <div className="feed-header">
        <div className="skeleton" style={{ width: 180, height: 24 }} />
      </div>
      <div className="recruiting-summary" style={{ opacity: 0.5 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ width: 80, height: 48, borderRadius: 4 }} />
        ))}
      </div>
    </div>
  );
}
