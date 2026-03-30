import './admin.css';
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar';
import { AdminHeader } from '@/components/admin/layout/AdminHeader';
import { FloatingNotepad } from '@/components/admin/widgets/floating-notepad';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: {
    default: 'CFB Social Admin',
    template: '%s | CFB Social Admin',
  },
  description: 'Administration dashboard for CFB Social',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-root">
      <div style={{ display: 'flex', minHeight: '100vh', maxWidth: '100vw', overflow: 'hidden' }}>
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main area */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <AdminHeader />
          <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            <Suspense>{children}</Suspense>
          </main>
        </div>
        <FloatingNotepad />
      </div>
    </div>
  );
}
