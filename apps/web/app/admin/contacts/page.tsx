import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/admin/shared/loading-skeleton';
import { ContactsClient } from '@/components/admin/contacts/contacts-client';
import { StatCard } from '@/components/admin/shared/stat-card';
import { MessageSquare, Mail } from 'lucide-react';

export const metadata = { title: 'Contact Submissions' };

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Contact Submissions</h1>
      <Suspense fallback={<LoadingSkeleton type="cards" rows={2} />}>
        <ContactStats />
      </Suspense>
      <Suspense fallback={<LoadingSkeleton rows={8} />}>
        <ContactsData />
      </Suspense>
    </div>
  );
}

async function ContactStats() {
  const { getContactStats } = await import('@/lib/admin/actions/contacts');
  const stats = await getContactStats();
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Total Submissions" value={stats.total} icon={MessageSquare} />
      <StatCard label="Unread" value={stats.unread} icon={Mail} color={stats.unread > 0 ? 'warning' : 'default'} />
    </div>
  );
}

async function ContactsData() {
  const { getContacts } = await import('@/lib/admin/actions/contacts');
  const { contacts } = await getContacts({ limit: 100 });
  return <ContactsClient contacts={contacts} />;
}
