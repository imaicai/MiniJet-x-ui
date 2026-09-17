import { Card, ConfigProvider, Layout, Progress, Result, Spin, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import { SizeFormatter } from '@/utils';
import { useStatusQuery } from '@/api/queries/useStatusQuery';
import { useTheme } from '@/hooks/useTheme';
import AppSidebar from '@/layouts/AppSidebar';

export default function IndexPage() {
  const { t } = useTranslation();
  const { antdThemeConfig } = useTheme();
  const { status, fetched, fetchError } = useStatusQuery();

  return (
    <ConfigProvider theme={antdThemeConfig}>
      <Layout>
        <AppSidebar />
        <Layout className="content-shell">
          <Layout.Content className="content-area">
            <Spin spinning={!fetched} size="large">
              {!fetched ? (
                <div style={{ minHeight: 320 }} />
              ) : fetchError ? (
                <Result status="error" title={t('somethingWentWrong')} subTitle={fetchError} />
              ) : (
                <div className="minijet-dashboard">
                  <Card className="minijet-status-card">
                    <div className="minijet-status-line">
                      <span>Core</span>
                      <Tag color={status.xray.state === 'running' ? 'green' : 'red'}>
                        {status.xray.state}
                      </Tag>
                    </div>
                  </Card>

                  <div className="minijet-status-grid">
                    <Card size="small" title={t('pages.index.cpu')}>
                      <Progress percent={Math.round(status.cpu.percent)} size="small" />
                    </Card>
                    <Card size="small" title={t('pages.index.memory')}>
                      <Progress percent={Math.round(status.mem.percent)} size="small" />
                    </Card>
                    <Card size="small" title={t('pages.index.storage')}>
                      <Progress percent={Math.round(status.disk.percent)} size="small" />
                    </Card>
                    <Card size="small" title="Network">
                      <div className="minijet-network-line">
                        <span>↑ {SizeFormatter.sizeFormat(status.netIO.up)}/s</span>
                        <span>↓ {SizeFormatter.sizeFormat(status.netIO.down)}/s</span>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </Spin>
          </Layout.Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
