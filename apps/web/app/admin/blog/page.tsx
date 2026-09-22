import { BlogManagerClient } from '@/components/admin/blog/blog-manager-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'The Wire — Blog' };

export default function AdminBlogPage() {
  return <BlogManagerClient />;
}
