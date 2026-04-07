'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Masthead } from '@/components/layout/Masthead';
import { CorkboardNav } from '@/components/layout/CorkboardNav';
import { FeaturesBreakdown } from '@/components/layout/FeaturesBreakdown';
import { Footer } from '@/components/layout/Footer';
import { SchoolThemeProvider } from '@/components/layout/SchoolThemeProvider';
import { AuthProvider } from '@/components/auth/AuthProvider';

// Lazy-load client-only components that need browser APIs or fetch data on mount.
// Masthead, CorkboardNav, FeaturesBreakdown, Footer are eagerly loaded (SSR'd).
function ScoresRibbonSkeleton() {
  return <div className="scores-ribbon" style={{ minHeight: 42 }} />;
}
const ScoresRibbon = dynamic(
  () => import('@/components/layout/ScoresRibbon').then((m) => m.ScoresRibbon),
  { ssr: false, loading: () => <ScoresRibbonSkeleton /> },
);
function SidebarSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[120, 80, 140, 60, 100].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h, borderRadius: 4 }} />
      ))}
    </div>
  );
}
const PressBoxSidebar = dynamic(
  () => import('@/components/layout/PressBoxSidebar').then((m) => m.PressBoxSidebar),
  { ssr: false, loading: () => <SidebarSkeleton /> },
);
const DynastyTicket = dynamic(
  () => import('@/components/layout/DynastyTicket').then((m) => m.DynastyTicket),
  { ssr: false },
);
const AuthCtaBanner = dynamic(
  () => import('@/components/layout/AuthCtaBanner').then((m) => m.AuthCtaBanner),
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
