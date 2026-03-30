'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Masthead } from '@/components/layout/Masthead';
import { Footer } from '@/components/layout/Footer';
import { CorkboardNav } from '@/components/layout/CorkboardNav';
import { DynastyTicket } from '@/components/layout/DynastyTicket';
import { FeaturesBreakdown } from '@/components/layout/FeaturesBreakdown';
import { SchoolThemeProvider } from '@/components/layout/SchoolThemeProvider';
import { AuthCtaBanner } from '@/components/layout/AuthCtaBanner';
import { AuthProvider } from '@/components/auth/AuthProvider';

// Lazy-load heavy sidebar + scores ribbon to improve LCP
const ScoresRibbon = dynamic(
  () => import('@/components/layout/ScoresRibbon').then((m) => m.ScoresRibbon),
  { ssr: false },
);
const PressBoxSidebar = dynamic(
  () => import('@/components/layout/PressBoxSidebar').then((m) => m.PressBoxSidebar),
  { ssr: false },
);

export function MainShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <AuthProvider>
      <SchoolThemeProvider>
        <div className="min-h-screen">
          <Masthead
            onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            menuOpen={mobileMenuOpen}
          />
          <ScoresRibbon />

          <main className="main-layout">
            {/* Left Column — Bulletin Board */}
            <aside className="col-left">
              <CorkboardNav />
              <DynastyTicket />
              <FeaturesBreakdown />
            </aside>

            {/* Center Column — Feed / Content */}
            <div className="col-center">
              {children}
            </div>

            {/* Right Column — Press Box */}
            <aside className="col-right">
              <PressBoxSidebar />
            </aside>
          </main>

          <Footer />
          <AuthCtaBanner />

          {/* Mobile sidebar overlay */}
          {mobileMenuOpen && (
            <div className="mobile-sidebar-overlay lg:hidden">
              <div
                className="mobile-sidebar-backdrop"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="mobile-sidebar-panel">
                <CorkboardNav onNavigate={() => setMobileMenuOpen(false)} />
                <DynastyTicket />
              </div>
            </div>
          )}
        </div>
      </SchoolThemeProvider>
    </AuthProvider>
  );
}
