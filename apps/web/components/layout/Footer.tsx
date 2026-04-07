import Link from 'next/link';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-ornament">&diams;</div>
      <p>
        CFB SOCIAL &mdash; College Football&apos;s Social Home &mdash; Est. 2026
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 10 }}>
        {[
          { href: '/privacy', label: 'Privacy' },
          { href: '/terms', label: 'Terms' },
          { href: '/contact', label: 'Contact' },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.65rem',
              color: 'var(--faded-ink)',
              textDecoration: 'none',
              letterSpacing: '0.3px',
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <p style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', lineHeight: 1.5, color: 'var(--faded-ink)', margin: '10px auto 0', padding: '0 16px' }}>
        The college football fan community. Debate rivalries, file predictions, track the transfer portal, and build your dynasty across 653 schools. The best place for CFB fan debates, college football takes, and real-time fan reactions.
      </p>
    </footer>
  );
}
