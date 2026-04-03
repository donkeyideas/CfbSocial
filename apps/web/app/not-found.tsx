import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      padding: '40px',
      textAlign: 'center',
    }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 900, color: '#8b1a1a', margin: 0 }}>404</h1>
      <p style={{ fontSize: '1.2rem', color: '#6b5d4d', marginTop: '8px' }}>
        Page not found
      </p>
      <p style={{ color: '#9a8c7a', marginTop: '16px' }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/feed"
        style={{
          marginTop: '24px',
          padding: '10px 24px',
          background: '#8b1a1a',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '4px',
          fontSize: '0.9rem',
        }}
      >
        Back to The Feed
      </Link>
    </div>
  );
}
