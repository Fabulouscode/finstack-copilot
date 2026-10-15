'use client';

import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useRouter } from 'next/navigation';
import { StatusPill } from './status-pill';

ModuleRegistry.registerModules([AllCommunityModule]);

export interface ProposalRow {
  id: string;
  status: string;
  summary: string;
  recipient: string;
  amount: string;
  amountMinor: number;
  proposedBy: string;
  created: string;
  createdAt: string;
}

const theme = themeQuartz.withParams({
  fontFamily: 'inherit',
  fontSize: 14,
  headerBackgroundColor: '#fafafa',
  headerFontWeight: 600,
  accentColor: '#047857',
  borderColor: '#e4e4e7',
  wrapperBorderRadius: 8,
  rowHoverColor: '#f4f4f5',
});

const columns: ColDef<ProposalRow>[] = [
  {
    field: 'status',
    headerName: 'Status',
    width: 120,
    filter: true,
    cellRenderer: ({ value }: ICellRendererParams<ProposalRow, string>) => <StatusPill status={value ?? ''} />,
  },
  { field: 'summary', headerName: 'Proposal', flex: 2, minWidth: 260, filter: true },
  { field: 'recipient', headerName: 'To', flex: 1, minWidth: 160, filter: true },
  {
    field: 'amount',
    headerName: 'Amount',
    width: 130,
    type: 'rightAligned',
    comparator: (_a, _b, nodeA, nodeB) => (nodeA.data?.amountMinor ?? 0) - (nodeB.data?.amountMinor ?? 0),
  },
  { field: 'proposedBy', headerName: 'Proposed by', width: 140, filter: true },
  {
    field: 'created',
    headerName: 'Proposed',
    width: 170,
    sort: 'desc',
    comparator: (_a, _b, nodeA, nodeB) => (nodeA.data?.createdAt ?? '').localeCompare(nodeB.data?.createdAt ?? ''),
  },
];

/** The agent's proposals; a row opens the proposal to approve or reject it. */
export function ProposalsGrid({ organizationId, rows }: { organizationId: string; rows: ProposalRow[] }) {
  const router = useRouter();
  return (
    <AgGridReact<ProposalRow>
      theme={theme}
      rowData={rows}
      columnDefs={columns}
      domLayout="autoHeight"
      getRowId={({ data }) => data.id}
      rowStyle={{ cursor: 'pointer' }}
      onRowClicked={({ data }) => data && router.push(`/o/${organizationId}/proposals/${data.id}`)}
      overlayNoRowsTemplate="<span style='color:#71717a'>Nothing here. When your agent proposes a payout, it shows up for you to review.</span>"
    />
  );
}
