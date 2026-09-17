import { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Modal, message } from 'antd';

import { HttpUtil } from '@/utils';
import { formValuesToWirePayload, rawInboundToFormValues } from '@/lib/xray/inbound-form-adapter';
import type { DBInbound } from '@/models/dbinbound';

interface MiniJetQuickInboundModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  mode: 'add' | 'edit';
  dbInbound: DBInbound | null;
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
  if (configured) return configured.replace(/^https?:\/\//, '').replace(/\/$/, '').split(':')[0];
  return window.location.hostname.replace(/^\[/, '').replace(/\]$/, '');
}

export default function MiniJetQuickInboundModal({
  open,
  onClose,
  onSaved,
  mode,
  dbInbound,
}: MiniJetQuickInboundModalProps) {
  const [form] = Form.useForm<QuickFormValues>();
  const [saving, setSaving] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && dbInbound) {
      form.setFieldsValue({ remark: dbInbound.remark || '', port: dbInbound.port });
    } else {
      form.setFieldsValue({ remark: '', port: randomPort() });
    }
  }, [dbInbound, form, mode, open]);

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (mode === 'edit' && dbInbound) {
        const current = rawInboundToFormValues(dbInbound);
        current.remark = values.remark.trim();
        current.port = values.port;
        const payload = formValuesToWirePayload(current);
        const result = await HttpUtil.post(`/panel/api/inbounds/update/${dbInbound.id}`, payload, {
          silent: true,
        });
        if (!result?.success) {
          messageApi.error(result?.msg || '保存失败');
          return;
        }
        messageApi.success('已保存');
      } else {
        const settingsMsg = await HttpUtil.post('/panel/api/setting/all', undefined, { silent: true });
        if (!settingsMsg?.success) {
          messageApi.error(settingsMsg?.msg || '无法读取证书配置');
          return;
        }

        const panel = (settingsMsg.obj || {}) as PanelSettings;
        const certFile = (panel.webCertFile || '').trim();
        const keyFile = (panel.webKeyFile || '').trim();
        if (!certFile || !keyFile) {
          messageApi.error('证书尚未就绪，请稍后重试。');
          return;
        }

        const serverName = normalizedHost(panel);
        const uuid = randomUuid();
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
                email: `mj-${randomAlphaNum(10)}`,
                limitIp: 0,
                totalGB: 0,
                expiryTime: 0,
                enable: true,
                tgId: 0,
                subId: randomAlphaNum(16),
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
          messageApi.error(result?.msg || '创建失败');
          return;
        }
        messageApi.success('已创建');
      }

      await Promise.resolve(onSaved());
      onClose();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return;
      messageApi.error(error instanceof Error ? error.message : '操作失败');
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
        title={mode === 'edit' ? '修改节点' : '添加节点'}
        okText={mode === 'edit' ? '保存' : '创建'}
        cancelText="取消"
        confirmLoading={saving}
        maskClosable={!saving}
        onOk={save}
        onCancel={onClose}
        destroyOnHidden
      >
        <Form<QuickFormValues> form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            label="节点名称"
            name="remark"
            rules={[
              { required: true, message: '请输入节点名称' },
              { min: 1, max: 64, message: '节点名称长度为 1–64 个字符' },
            ]}
          >
            <Input autoFocus allowClear maxLength={64} />
          </Form.Item>
          <Form.Item label="端口" name="port" rules={[{ required: true, message: '请输入端口' }]}>
            <InputNumber min={1} max={65535} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
