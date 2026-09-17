import { useEffect, useState } from 'react';
import { Alert, Form, Input, InputNumber, Modal, Space, Tag, Typography, message } from 'antd';
import { SafetyCertificateOutlined, ThunderboltOutlined } from '@ant-design/icons';

import { HttpUtil } from '@/utils';

interface MiniJetQuickInboundModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

interface QuickFormValues {
  remark: string;
  port: number;
}

interface PanelSettings {
  webCertFile?: string;
  webKeyFile?: string;
  webDomain?: string;
}

function randomHex(bytes: number): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data, (n) => n.toString(16).padStart(2, '0')).join('');
}

function randomAlphaNum(length: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const data = new Uint8Array(length);
  crypto.getRandomValues(data);
  return Array.from(data, (n) => alphabet[n % alphabet.length]).join('');
}

function randomUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (n) => n.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function randomPort(): number {
  const data = new Uint16Array(1);
  crypto.getRandomValues(data);
  return 20000 + (data[0] % 40000);
}

function normalizedHost(settings: PanelSettings): string {
  const configured = (settings.webDomain || '').trim();
  if (configured)
    return configured
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .split(':')[0];
  return window.location.hostname.replace(/^\[/, '').replace(/\]$/, '');
}

export default function MiniJetQuickInboundModal({
  open,
  onClose,
  onSaved,
}: MiniJetQuickInboundModalProps) {
  const [form] = Form.useForm<QuickFormValues>();
  const [saving, setSaving] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({ remark: '', port: randomPort() });
  }, [form, open]);

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const settingsMsg = await HttpUtil.post('/panel/api/setting/all', undefined, {
        silent: true,
      });
      if (!settingsMsg?.success) {
        messageApi.error(settingsMsg?.msg || '无法读取面板证书配置');
        return;
      }

      const panel = (settingsMsg.obj || {}) as PanelSettings;
      const certFile = (panel.webCertFile || '').trim();
      const keyFile = (panel.webKeyFile || '').trim();
      if (!certFile || !keyFile) {
        messageApi.error('面板尚未配置 TLS 证书。请先运行 MiniJet 证书修复后再添加节点。');
        return;
      }

      const serverName = normalizedHost(panel);
      const uuid = randomUuid();
      const email = `mj-${randomAlphaNum(10)}`;
      const subId = randomAlphaNum(16);

      const payload = {
        up: 0,
        down: 0,
        total: 0,
        remark: values.remark.trim(),
        enable: true,
        expiryTime: 0,
        trafficReset: 'never',
        trafficResetDay: 1,
        lastTrafficResetTime: 0,
        listen: '',
        port: values.port,
        protocol: 'vless',
        settings: JSON.stringify({
          clients: [
            {
              id: uuid,
              flow: 'xtls-rprx-vision',
              email,
              limitIp: 0,
              totalGB: 0,
              expiryTime: 0,
              enable: true,
              tgId: 0,
              subId,
              comment: '',
              reset: 0,
            },
          ],
          decryption: 'none',
          encryption: 'none',
          fallbacks: [],
        }),
        streamSettings: JSON.stringify({
          network: 'tcp',
          security: 'tls',
          tcpSettings: { header: { type: 'none' }, acceptProxyProtocol: false },
          tlsSettings: {
            serverName,
            minVersion: '1.2',
            maxVersion: '1.3',
            cipherSuites: '',
            rejectUnknownSni: false,
            disableSystemRoot: false,
            enableSessionResumption: true,
            certificates: [
              {
                certificateFile: certFile,
                keyFile,
                ocspStapling: 0,
                oneTimeLoading: false,
                usage: 'encipherment',
                buildChain: false,
              },
            ],
            alpn: ['h2', 'http/1.1'],
            echServerKeys: '',
            settings: {
              fingerprint: 'chrome',
              echConfigList: '',
              pinnedPeerCertSha256: [],
              verifyPeerCertByName: serverName,
            },
          },
        }),
        sniffing: JSON.stringify({
          enabled: true,
          destOverride: ['http', 'tls', 'quic'],
          metadataOnly: false,
          routeOnly: false,
          ipsExcluded: [],
          domainsExcluded: [],
        }),
        tag: `minijet-vless-${values.port}-${randomHex(3)}`,
        shareAddrStrategy: 'node',
        shareAddr: '',
        subSortIndex: 1,
        disableFlow: false,
      };

      const result = await HttpUtil.post('/panel/api/inbounds/add', payload, { silent: true });
      if (!result?.success) {
        messageApi.error(result?.msg || '节点创建失败');
        return;
      }

      messageApi.success('节点已按 MiniJet 最优模板自动创建');
      await Promise.resolve(onSaved());
      onClose();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return;
      messageApi.error(error instanceof Error ? error.message : '节点创建失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        className="minijet-quick-modal"
        open={open}
        title="添加节点"
        okText="创建节点"
        cancelText="取消"
        confirmLoading={saving}
        maskClosable={!saving}
        onOk={save}
        onCancel={onClose}
        destroyOnHidden
      >
        <Space orientation="vertical" size={14} style={{ width: '100%' }}>
          <Alert
            type="success"
            showIcon
            icon={<SafetyCertificateOutlined />}
            message="Mihomo 稳定兼容模板"
            description="自动使用 VLESS + TCP + TLS + XTLS Vision；UUID、TLS、流量、到期时间、sniffing 等参数全部自动生成。"
          />

          <Form<QuickFormValues> form={form} layout="vertical" requiredMark={false}>
            <Form.Item
              label="节点名称"
              name="remark"
              rules={[
                { required: true, message: '请输入节点名称' },
                { min: 1, max: 64, message: '节点名称长度为 1–64 个字符' },
              ]}
            >
              <Input autoFocus allowClear placeholder="例如：US01" maxLength={64} />
            </Form.Item>

            <Form.Item label="端口" name="port" rules={[{ required: true, message: '请输入端口' }]}>
              <InputNumber min={1} max={65535} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Form>

          <div className="minijet-auto-profile">
            <Space wrap size={[6, 6]}>
              <Tag icon={<ThunderboltOutlined />} color="blue">
                VLESS
              </Tag>
              <Tag>TCP</Tag>
              <Tag color="green">TLS</Tag>
              <Tag color="geekblue">Vision</Tag>
              <Tag>Mihomo</Tag>
            </Space>
            <Typography.Text type="secondary" className="minijet-profile-note">
              高级参数已按安全、稳定和低额外开销原则锁定；编辑已有节点时仍保留高级维护入口。
            </Typography.Text>
          </div>
        </Space>
      </Modal>
    </>
  );
}
