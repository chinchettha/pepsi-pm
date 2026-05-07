import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  deleteAdminStatusColorMapping,
  fetchAdminStatusColorMappings,
  fetchAdminRoles,
  fetchAdminUsers,
  patchAdminUser,
  upsertAdminStatusColorMapping,
  type AdminRoleRef,
  type AdminStatusColorMapping,
  type AdminStatusTone,
  type AdminUserRow,
} from '../api';

type EditFormValues = {
  isActive: boolean;
  roleIds: number[];
};

export function AdminUsersPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [form] = Form.useForm<EditFormValues>();

  const usersQ = useQuery({
    queryKey: ['admin-users', page, pageSize],
    queryFn: () => fetchAdminUsers(page, pageSize),
  });

  const rolesQ = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => fetchAdminRoles(),
  });
  const statusMapQ = useQuery({
    queryKey: ['admin-status-color-mappings'],
    queryFn: () => fetchAdminStatusColorMappings(),
  });

  const saveMutation = useMutation({
    mutationFn: ({ userId, body }: { userId: number; body: { isActive: boolean; roleIds: number[] } }) =>
      patchAdminUser(userId, body),
    onSuccess: () => {
      message.success('บันทึกแล้ว');
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: Error) => {
      message.error(err.message ?? 'บันทึกไม่สำเร็จ');
    },
  });
  const saveStatusMapMutation = useMutation({
    mutationFn: (vars: { code: string; tone: AdminStatusTone; label?: string; priority?: number; isActive?: boolean }) =>
      upsertAdminStatusColorMapping(vars.code, {
        tone: vars.tone,
        label: vars.label ?? null,
        priority: vars.priority,
        isActive: vars.isActive,
      }),
    onSuccess: () => {
      message.success('บันทึก status mapping แล้ว');
      void queryClient.invalidateQueries({ queryKey: ['admin-status-color-mappings'] });
      void queryClient.invalidateQueries({ queryKey: ['status-color-mappings'] });
    },
    onError: (err: Error) => {
      message.error(err.message ?? 'บันทึก mapping ไม่สำเร็จ');
    },
  });
  const deleteStatusMapMutation = useMutation({
    mutationFn: (code: string) => deleteAdminStatusColorMapping(code),
    onSuccess: () => {
      message.success('ลบ mapping แล้ว');
      void queryClient.invalidateQueries({ queryKey: ['admin-status-color-mappings'] });
      void queryClient.invalidateQueries({ queryKey: ['status-color-mappings'] });
    },
    onError: (err: Error) => {
      message.error(err.message ?? 'ลบ mapping ไม่สำเร็จ');
    },
  });
  const [mappingForm] = Form.useForm<{
    code: string;
    tone: AdminStatusTone;
    label?: string;
    priority?: number;
    isActive: boolean;
  }>();

  const roleOptions =
    rolesQ.data?.items.map((r: AdminRoleRef) => ({
      value: r.id,
      label: `${r.code} — ${r.label}`,
    })) ?? [];

  const openEdit = (row: AdminUserRow) => {
    setEditing(row);
    form.setFieldsValue({
      isActive: row.isActive,
      roleIds: row.roles.map((r) => r.id),
    });
  };

  const columns: ColumnsType<AdminUserRow> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: 'GPID', dataIndex: 'gpid', width: 140, ellipsis: true },
    { title: 'ชื่อ', dataIndex: 'displayName', ellipsis: true },
    { title: 'อีเมล', dataIndex: 'email', ellipsis: true, render: (v: string | null) => v ?? '—' },
    {
      title: 'สถานะ',
      dataIndex: 'isActive',
      width: 100,
      render: (active: boolean) =>
        active ? <Tag color="green">ใช้งาน</Tag> : <Tag color="default">ปิด</Tag>,
    },
    {
      title: 'บทบาท',
      dataIndex: 'roles',
      render: (roles: AdminRoleRef[]) =>
        roles.length ? (
          <>
            {roles.map((r) => (
              <Tag key={r.id}>
                {r.code}
              </Tag>
            ))}
          </>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      align: 'right',
      render: (_, row) => (
        <Button type="link" disabled={row.gpid === '__system__'} onClick={() => openEdit(row)}>
          แก้ไข
        </Button>
      ),
    },
  ];
  const statusToneOptions: Array<{ value: AdminStatusTone; label: string; color: string }> = [
    { value: 'green', label: 'Green (เสร็จ/ปิด)', color: 'green' },
    { value: 'blue', label: 'Blue (กำลังทำ)', color: 'blue' },
    { value: 'red', label: 'Red (ต้องติดตาม)', color: 'red' },
    { value: 'default', label: 'Default', color: 'default' },
  ];
  const mappingColumns: ColumnsType<AdminStatusColorMapping> = [
    {
      title: 'Code',
      dataIndex: 'code',
      width: 180,
      render: (code: string, row) => (
        <Space size={6}>
          <Typography.Text code>{code}</Typography.Text>
          {row.isProtected ? (
            <Tag color="purple" style={{ marginInlineEnd: 0, fontWeight: 700 }}>
              SYSTEM
            </Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: 'Tone',
      dataIndex: 'tone',
      width: 170,
      render: (v: AdminStatusTone) => {
        const meta = statusToneOptions.find((x) => x.value === v);
        return <Tag color={meta?.color ?? 'default'}>{v}</Tag>;
      },
    },
    {
      title: 'Label',
      dataIndex: 'label',
      render: (v: string | null) => v ?? <Typography.Text type="secondary">—</Typography.Text>,
    },
    { title: 'Priority', dataIndex: 'priority', width: 100 },
    {
      title: 'Active',
      dataIndex: 'isActive',
      width: 90,
      render: (v: boolean) => (v ? <Tag color="green">on</Tag> : <Tag>off</Tag>),
    },
    {
      title: '',
      key: 'actions',
      width: 170,
      align: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Button
            type="link"
            disabled={row.isProtected}
            onClick={() => {
              mappingForm.setFieldsValue({
                code: row.code,
                tone: row.tone,
                label: row.label ?? '',
                priority: row.priority,
                isActive: row.isActive,
              });
            }}
          >
            แก้ไข
          </Button>
          <Popconfirm
            title={`ลบ mapping ${row.code}?`}
            description="การลบจะทำให้ระบบ fallback ไปค่า default"
            okText="ลบ"
            cancelText="ยกเลิก"
            disabled={row.isProtected}
            onConfirm={() => deleteStatusMapMutation.mutate(row.code)}
          >
            <Button type="link" danger disabled={row.isProtected} loading={deleteStatusMapMutation.isPending}>
              ลบ
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <Card title="จัดการผู้ใช้และบทบาท">
      <Typography.Paragraph type="secondary">
        ข้อมูลจาก <Typography.Text code>GET /api/v1/admin/users</Typography.Text> · แก้ไขผ่าน{' '}
        <Typography.Text code>PATCH /api/v1/admin/users/:id</Typography.Text> (ต้องมีสิทธิ์{' '}
        <Typography.Text code>admin.users</Typography.Text>)
      </Typography.Paragraph>
      <Table<AdminUserRow>
        rowKey={(r) => String(r.id)}
        loading={usersQ.isLoading}
        columns={columns}
        dataSource={usersQ.data?.items ?? []}
        pagination={{
          total: usersQ.data?.total ?? 0,
          pageSize,
          current: page,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
      {usersQ.isError ? (
        <Typography.Text type="danger">
          {(usersQ.error as Error)?.message ?? 'โหลดไม่สำเร็จ'}
        </Typography.Text>
      ) : null}

      <Modal
        title={`แก้ไขผู้ใช้ — ${editing?.displayName ?? ''}`}
        open={!!editing}
        onCancel={() => setEditing(null)}
        confirmLoading={saveMutation.isPending}
        okText="บันทึก"
        cancelText="ยกเลิก"
        destroyOnHidden
        onOk={() => form.submit()}
      >
        <Form<EditFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (!editing) return;
            saveMutation.mutate({
              userId: editing.id,
              body: { isActive: values.isActive, roleIds: values.roleIds ?? [] },
            });
          }}
        >
          <Form.Item label="เปิดใช้งาน" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="บทบาท" name="roleIds">
            <Select
              mode="multiple"
              allowClear
              placeholder="เลือกบทบาท"
              options={roleOptions}
              loading={rolesQ.isLoading}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
    <Card title="Admin Config — Status Color Mapping (SAP)">
      <Typography.Paragraph type="secondary">
        กำหนดสีของบล็อคงานจาก status code (เช่น <Typography.Text code>TECO</Typography.Text>,{' '}
        <Typography.Text code>REL</Typography.Text>, <Typography.Text code>CRTD</Typography.Text>) เพื่อใช้หน้า Calendar
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        โค้ดระบบที่ล็อกแก้/ลบไม่ได้: <Typography.Text code>TECO</Typography.Text>,{' '}
        <Typography.Text code>REL</Typography.Text>
      </Typography.Paragraph>
      <Form
        form={mappingForm}
        layout="inline"
        onFinish={(v) =>
          saveStatusMapMutation.mutate({
            code: String(v.code || '').toUpperCase().trim(),
            tone: v.tone,
            label: v.label?.trim(),
            priority: v.priority,
            isActive: v.isActive,
          })
        }
        initialValues={{ tone: 'blue', priority: 100, isActive: true }}
        style={{ marginBottom: 14 }}
      >
        <Form.Item
          label="Code"
          name="code"
          rules={[
            { required: true, message: 'ระบุ code' },
            { pattern: /^[A-Za-z0-9_]{2,32}$/, message: 'A-Z0-9_ 2-32 ตัวอักษร' },
          ]}
        >
          <Input placeholder="เช่น TECO" style={{ width: 120 }} />
        </Form.Item>
        <Form.Item label="Tone" name="tone" rules={[{ required: true }]}>
          <Select
            style={{ width: 180 }}
            options={statusToneOptions.map((x) => ({ value: x.value, label: x.label }))}
          />
        </Form.Item>
        <Form.Item label="Label" name="label">
          <Input placeholder="ชื่อแสดงผล (optional)" style={{ width: 220 }} />
        </Form.Item>
        <Form.Item label="Priority" name="priority">
          <InputNumber min={0} max={10000} style={{ width: 110 }} />
        </Form.Item>
        <Form.Item label="Active" name="isActive" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={saveStatusMapMutation.isPending}>
              บันทึก Mapping
            </Button>
            <Button
              onClick={() => mappingForm.setFieldsValue({ code: '', tone: 'blue', label: '', priority: 100, isActive: true })}
            >
              เคลียร์
            </Button>
          </Space>
        </Form.Item>
      </Form>
      <Table<AdminStatusColorMapping>
        rowKey={(r) => r.code}
        loading={statusMapQ.isLoading}
        columns={mappingColumns}
        dataSource={statusMapQ.data?.items ?? []}
        pagination={false}
        size="small"
      />
      {statusMapQ.isError ? (
        <Typography.Text type="danger">
          {(statusMapQ.error as Error)?.message ?? 'โหลด status mapping ไม่สำเร็จ'}
        </Typography.Text>
      ) : null}
    </Card>
    </Space>
  );
}
