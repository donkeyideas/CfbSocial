'use client';

import { useState } from 'react';
import { Masthead } from '@/components/layout/Masthead';
import { CorkboardNav } from '@/components/layout/CorkboardNav';
import { Footer } from '@/components/layout/Footer';
import { AuthProvider } from '@/components/auth/AuthProvider';

/**
 * BlogShell — a slim, content-focused wrapper for The Wire (blog) pages.
 *
 * Unlike MainShell, this renders NO left/right sidebars, scores ribbon,
 * floating composer, or CTA banners, so article pages read cleanly for SEO.
 * The Masthead (with auth state) and Footer are kept for navigation and
 * brand chrome; the mobile menu overlay is retained so phone users can still
 * navigate the rest of the site.
 */
export function BlogShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <AuthProvider>
      <div className="min-h-screen">
        <Masthead
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          menuOpen={mobileMenuOpen}
        />

        <main className="blog-shell">{children}</main>

        <Footer />

        {/* Mobile sidebar overlay */}
        {mobileMenuOpen && (
          <div className="mobile-sidebar-overlay lg:hidden">
            <div
              className="mobile-sidebar-backdrop"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="mobile-sidebar-panel">
              <CorkboardNav onNavigate={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}
      </div>
    </AuthProvider>
  );
}
