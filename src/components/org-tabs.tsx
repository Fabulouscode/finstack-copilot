'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function OrgTabs({ organizationId }: { organizationId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/o/${organizationId}`, label: 'Proposals', active: !pathname.endsWith('/ask') },
    { href: `/o/${organizationId}/ask`, label: 'Ask the agent', active: pathname.endsWith('/ask') },
  ];
  return (
    <nav className="mb-8 flex gap-2 text-sm">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-full px-3 py-1 ring-1 ${tab.active ? 'bg-zinc-900 text-white ring-zinc-900' : 'text-zinc-700 ring-zinc-300 hover:bg-zinc-100'}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
