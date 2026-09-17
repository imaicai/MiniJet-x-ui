import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch, Tag, type TableColumnType } from 'antd';

import { SizeFormatter } from '@/utils';
import type { NodeRecord } from '@/api/queries/useNodesQuery';
import { InboundSpeedTag, isActiveSpeed } from './InboundSpeedTag';
import { RowActionsCell } from './RowActions';
import type { ClientCountEntry, DBInboundRecord, InboundSpeedEntry, RowAction } from './types';

interface UseInboundColumnsParams {
  hasAnyRemark: boolean;
  hasAnySubSortIndex: boolean;
  hasActiveNode: boolean;
  nodesById: Map<number, NodeRecord>;
  hostRemarksByInboundId: Map<number, string[]>;
  clientCount: Record<number, ClientCountEntry>;
  inboundSpeed: Record<number, InboundSpeedEntry>;
  subEnable: boolean;
  expireDiff: number;
  trafficDiff: number;
  onRowAction: (action: { key: RowAction; dbInbound: DBInboundRecord }) => void;
  onSwitchEnable: (dbInbound: DBInboundRecord, next: boolean) => void;
}

export function useInboundColumns(params: UseInboundColumnsParams): TableColumnType<DBInboundRecord>[] {
  const { t } = useTranslation();
  const { clientCount, inboundSpeed, subEnable, onRowAction, onSwitchEnable } = params;

  return useMemo(
    () => [
      {
        title: t('pages.inbounds.remark'),
        dataIndex: 'remark',
        key: 'remark',
        sorter: (a, b) => (a.remark || '').localeCompare(b.remark || ''),
        render: (value: string) => value || '—',
      },
      {
        title: t('pages.inbounds.port'),
        dataIndex: 'port',
        key: 'port',
        align: 'center',
        width: 100,
        sorter: (a, b) => a.port - b.port,
      },
      {
        title: t('pages.inbounds.speed'),
        key: 'speed',
        align: 'center',
        width: 150,
        render: (_value, record) => {
          const speed = inboundSpeed[record.id];
          return isActiveSpeed(speed) ? <InboundSpeedTag speed={speed} tableCell /> : <Tag>—</Tag>;
        },
      },
      {
        title: t('pages.inbounds.traffic'),
        key: 'traffic',
        align: 'center',
        width: 130,
        sorter: (a, b) => a.up + a.down - (b.up + b.down),
        render: (_value, record) => SizeFormatter.sizeFormat(record.up + record.down),
      },
      {
        title: t('pages.inbounds.enable'),
        key: 'enable',
        align: 'center',
        width: 90,
        render: (_value, record) => (
          <Switch checked={record.enable} onChange={(next) => onSwitchEnable(record, next)} />
        ),
      },
      {
        title: t('pages.inbounds.operate'),
        key: 'action',
        align: 'center',
        width: 90,
        render: (_value, record) => (
          <RowActionsCell
            record={record}
            subEnable={subEnable}
            hasClients={(clientCount[record.id]?.clients || 0) > 0}
            onClick={(key) => onRowAction({ key, dbInbound: record })}
          />
        ),
      },
    ],
    [clientCount, inboundSpeed, onRowAction, onSwitchEnable, subEnable, t],
  );
}
