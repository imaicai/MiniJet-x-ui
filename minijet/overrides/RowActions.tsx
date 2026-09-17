import { useTranslation } from 'react-i18next';
import { Button, Dropdown, type MenuProps } from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  QrcodeOutlined,
} from '@ant-design/icons';

import { showQrCodeMenu } from './helpers';
import type { DBInboundRecord, RowAction } from './types';

interface RowActionsMenuProps {
  record: DBInboundRecord;
  subEnable: boolean;
  hasClients: boolean;
  onClick: (key: RowAction) => void;
}

interface BuildMenuArgs {
  record: DBInboundRecord;
  subEnable?: boolean;
  hasClients?: boolean;
  t: (k: string) => string;
  isMobile?: boolean;
}

export function buildRowActionsMenu(args: BuildMenuArgs): MenuProps['items'] {
  const { record, t, isMobile } = args;
  const items: MenuProps['items'] = [];
  if (isMobile) items.push({ key: 'edit', icon: <EditOutlined />, label: t('edit') });
  if (showQrCodeMenu(record)) {
    items.push({ key: 'qrcode', icon: <QrcodeOutlined />, label: t('qrCode') });
  }
  items.push({ key: 'clipboard', icon: <CopyOutlined />, label: t('copy') });
  items.push({ type: 'divider' });
  items.push({ key: 'delete', icon: <DeleteOutlined />, danger: true, label: t('delete') });
  return items;
}

export function RowActionsCell(props: RowActionsMenuProps) {
  const { record, onClick } = props;
  const { t } = useTranslation();
  return (
    <div className="action-buttons">
      <Button
        type="text"
        size="small"
        icon={<EditOutlined />}
        aria-label={t('edit')}
        onClick={() => onClick('edit')}
      />
      <Dropdown
        trigger={['click']}
        menu={{
          items: buildRowActionsMenu({ record, t }),
          onClick: ({ key }) => onClick(key as RowAction),
        }}
      >
        <Button type="text" size="small" icon={<MoreOutlined />} aria-label={t('more')} />
      </Dropdown>
    </div>
  );
}
