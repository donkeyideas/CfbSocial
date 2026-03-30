import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { RivalryDetail } from '@/components/rivalry/RivalryDetail';

export const dynamic = 'force-dynamic';

interface RivalryPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: RivalryPageProps) {
  const { id } = await params;
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data } = await supabase
    .from('rivalries')
    .select('name')
    .eq('id', id)
    .single();

  const title = data?.name ? `${data.name} | College Football Rivalry` : 'Rivalry';
  const description = data?.name
    ? `${data.name} — pick a side in this college football rivalry debate. Vote, comment, and see which fan base has the stronger argument.`
    : 'College football rivalry debate on CFB Social.';

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary' as const, title, description },
  };
}

export default async function RivalryDetailPage({ params }: RivalryPageProps) {
  const { id } = await params;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/rivalry"
          style={{
            fontFamily: 'var(--sans)',
            fontSize: '0.8rem',
            color: 'var(--faded-ink)',
            textDecoration: 'none',
          }}
        >
          &larr; Back to Rivalry Ring
        </Link>
      </div>

      <Suspense fallback={<div className="content-card" style={{ opacity: 0.5, padding: 32 }}>Loading...</div>}>
        <RivalryContent rivalryId={id} />
      </Suspense>
    </div>
  );
}

async function RivalryContent({ rivalryId }: { rivalryId: string }) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: rivalry, error } = await supabase
    .from('rivalries')
    .select(`
      *,
      school_1:school_1_id (
        id, name, abbreviation, primary_color, secondary_color, logo_url, mascot
      ),
      school_2:school_2_id (
        id, name, abbreviation, primary_color, secondary_color, logo_url, mascot
      )
    `)
    .eq('id', rivalryId)
    .single();

  if (error || !rivalry) notFound();

  // Fetch takes for this rivalry
  const { data: takes } = await supabase
    .from('rivalry_takes')
    .select(`
      *,
      user:user_id (
        id, username, display_name, avatar_url
      ),
      school:school_id (
        id, abbreviation, primary_color
      )
    `)
    .eq('rivalry_id', rivalryId)
    .order('created_at', { ascending: false })
    .limit(30);

  return <RivalryDetail rivalry={rivalry as never} takes={(takes ?? []) as never[]} />;
}
