import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/admin/shared/loading-skeleton';
import { EmailTemplatesClient } from '@/components/admin/email-templates/email-templates-client';

export const metadata = { title: 'Email Templates' };

export default function EmailTemplatesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Email Templates</h1>
      <Suspense fallback={<LoadingSkeleton rows={8} />}>
        <EmailTemplatesData />
      </Suspense>
    </div>
  );
}

async function EmailTemplatesData() {
  const { getEmailTemplates } = await import('@/lib/admin/actions/email-templates');
  const templates = await getEmailTemplates();
  return <EmailTemplatesClient templates={templates} />;
}
