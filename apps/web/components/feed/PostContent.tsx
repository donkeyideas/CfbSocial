'use client';

import { useRouter } from 'next/navigation';

const MENTION_REGEX = /@([a-zA-Z0-9_]{1,30})/g;

export function PostContent({ content, className }: { content: string; className?: string }) {
  const router = useRouter();
  const parts = content.split(MENTION_REGEX);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          return (
            <span
              key={i}
              role="link"
              className="mention-link"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                router.push(`/profile/${part}`);
              }}
            >
              @{part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
