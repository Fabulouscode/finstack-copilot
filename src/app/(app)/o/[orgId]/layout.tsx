import { OrgTabs } from '@/components/org-tabs';

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  return (
    <>
      <OrgTabs organizationId={orgId} />
      {children}
    </>
  );
}
