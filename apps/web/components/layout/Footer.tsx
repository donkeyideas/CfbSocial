import Link from 'next/link';
import { GAME } from '@/lib/constants/game';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-ornament">&diams;</div>
      <p className="footer-tagline">
        CFB SOCIAL &mdash; College Football&apos;s Social Home &mdash; Est. 2026
      </p>
      <div className="footer-links">
        {[
          { href: '/schools', label: 'All Schools' },
          { href: '/game-room', label: 'Game Room' },
          { href: '/game-room/leagues', label: `${GAME.abbr} Leagues` },
          { href: '/game-room/guide', label: `${GAME.abbr} Guide` },
          { href: '/privacy', label: 'Privacy' },
          { href: '/terms', label: 'Terms' },
          { href: '/contact', label: 'Contact' },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="footer-link">
            {link.label}
          </Link>
        ))}
      </div>
      <p className="footer-description">
        The college football fan community. Debate rivalries, file predictions, track the transfer portal, and build your dynasty across 653 schools. The best place for CFB fan debates, college football takes, and real-time fan reactions.
      </p>

      {/* SEO FAQ section — provides question headings + lists for AEO */}
      <div className="footer-faq">
        <div className="footer-faq-grid">
          <div className="footer-faq-col">
            <h2 className="footer-faq-heading">What is CFB Social?</h2>
            <p className="footer-faq-text">
              CFB Social is the college football fan community where you debate rivalries, file predictions, track the transfer portal, and build your dynasty across all 653 schools.
            </p>
          </div>
          <div className="footer-faq-col">
            <h3 className="footer-faq-heading">What can you do on CFB Social?</h3>
            <ul className="footer-faq-list">
              <li>Post takes and debate college football in the Feed</li>
              <li>Challenge rival fan bases in the Rivalry Ring</li>
              <li>Track every transfer portal move on Portal Wire</li>
              <li>File predictions and collect receipts or busts</li>
              <li>Vote in Mascot Wars bracket tournaments</li>
              <li>Build your fan dynasty and climb the leaderboard</li>
            </ul>
          </div>
          <div className="footer-faq-col">
            <h3 className="footer-faq-heading">How do you join the conversation?</h3>
            <ul className="footer-faq-list">
              <li>Create a free account and pick your school</li>
              <li>Start posting takes and voting on debates</li>
              <li>Earn XP, unlock achievements, and rise through dynasty tiers</li>
            </ul>
          </div>
          <div className="footer-faq-col">
            <h3 className="footer-faq-heading">Where can you share {GAME.name} dynasty moments?</h3>
            <p className="footer-faq-text">
              The <Link href="/game-room" className="footer-link">Game Room</Link> is the home for {GAME.full} players &mdash; share dynasty screenshots, build a magazine of your season, and find{' '}
              <Link href="/game-room/leagues" className="footer-link">online dynasty leagues to join</Link> on PS5, Xbox, and PC. New here? Read the{' '}
              <Link href="/game-room/guide" className="footer-link">{GAME.abbr} Game Room guide</Link>.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
