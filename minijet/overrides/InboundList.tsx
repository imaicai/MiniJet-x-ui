import { useCallback, useMemo, useState, type Key } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Checkbox, Dropdown, Input, Space, Switch, Table, Tag } from 'antd';
import { DeleteOutlined, MoreOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';

import { HttpUtil } from '@/utils';
import { buildRowActionsMenu } from './RowActions';
import { useInboundColumns } from './useInboundColumns';
import type { DBInboundRecord, InboundListProps, RowAction } from './types';
import './InboundList.css';

export default function InboundList(props: InboundListProps) {
  const {
    dbInbounds,
    clientCount,
    inboundSpeed,
    expireDiff,
    trafficDiff,
    pageSize,
    isMobile,
    subEnable,
    nodesById,
    hasActiveNode,
    onAddInbound,
    onRowAction,
    onBulkDelete,
  } = props;
  const { t } = useTranslation();
  const [searchKey, setSearchKey] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  const visibleInbounds = useMemo(() => {
    const q = searchKey.trim().toLowerCase();
    if (!q) return dbInbounds;
    return dbInbounds.filter(
      (item) =>
        (item.remark || '').toLowerCase().includes(q) || String(item.port).includes(q),
    );
  }, [dbInbounds, searchKey]);

  const onSwitchEnable = useCallback(async (dbInbound: DBInboundRecord, next: boolean) => {
    const previous = dbInbound.enable;
    dbInbound.enable = next;
    try {
      const formData = new FormData();
      formData.append('enable', String(next));
      const msg = await HttpUtil.post(`/panel/api/inbounds/setEnable/${dbInbound.id}`, formData);
      if (!msg?.success) dbInbound.enable = previous;
    } catch {
      dbInbound.enable = previous;
    }
  }, []);

  const handleBulkDelete = useCallback(async () => {
    const ok = await onBulkDelete(selectedRowKeys);
    if (ok) setSelectedRowKeys([]);
  }, [onBulkDelete, selectedRowKeys]);

  const columns = useInboundColumns({
    hasAnyRemark: true,
    hasAnySubSortIndex: false,
    hasActiveNode,
    nodesById,
    hostRemarksByInboundId: new Map(),
    clientCount,
    inboundSpeed,
    subEnable,
    expireDiff,
    trafficDiff,
    onRowAction,
    onSwitchEnable,
  });

  const page = {
    pageSize: pageSize > 0 ? pageSize : visibleInbounds.length || 1,
    showSizeChanger: false,
    hideOnSinglePage: true,
  };

  const toggleSelect = (id: number, checked: boolean) => {
    setSelectedRowKeys((current) =>
      checked ? Array.from(new Set([...current, id])) : current.filter((value) => value !== id),
    );
  };

  return (
    <Card
      title={
        <Space wrap size={8}>
          <Button type="primary" onClick={onAddInbound} icon={<PlusOutlined />}>
            {t('pages.inbounds.addInbound')}
          </Button>
          <Input
            value={searchKey}
            onChange={(event) => setSearchKey(event.target.value)}
            placeholder={t('search')}
            allowClear
            prefix={<SearchOutlined />}
            style={{ width: isMobile ? 150 : 220 }}
          />
          {selectedRowKeys.length > 0 && (
            <Button danger icon={<DeleteOutlined />} onClick={handleBulkDelete}>
              {t('delete')} ({selectedRowKeys.length})
            </Button>
          )}
        </Space>
      }
    >
      {isMobile ? (
        <div className="inbound-cards">
          {visibleInbounds.length === 0 ? (
            <div className="card-empty">{t('noData')}</div>
          ) : (
            visibleInbounds.map((record) => {
              const speed = inboundSpeed[record.id];
              const speedText = speed ? `${Math.round(speed.up + speed.down)} B/s` : '—';
              return (
                <div key={record.id} className="inbound-card">
                  <div className="card-head">
                    <Checkbox
                      checked={selectedRowKeys.includes(record.id)}
                      onChange={(event) => toggleSelect(record.id, event.target.checked)}
                    />
                    <span className="tag-name">{record.remark || '—'}</span>
                    <Tag>{record.port}</Tag>
                    <Tag>{speedText}</Tag>
                    <Switch
                      checked={record.enable}
                      size="small"
                      onChange={(next) => onSwitchEnable(record, next)}
                    />
                    <Dropdown
                      trigger={['click']}
                      placement="bottomRight"
                      menu={{
                        items: buildRowActionsMenu({ record, subEnable, t, isMobile: true }),
                        onClick: ({ key }) =>
                          onRowAction({ key: key as RowAction, dbInbound: record }),
                      }}
                    >
                      <Button type="text" size="small" icon={<MoreOutlined />} />
                    </Dropdown>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={visibleInbounds}
          rowKey={(record) => record.id}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys: Key[]) => setSelectedRowKeys(keys as number[]),
          }}
          pagination={page}
          size="small"
          locale={{ emptyText: t('noData') }}
        />
      )}
    </Card>
  );
}
