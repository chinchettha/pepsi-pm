import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Form, Modal, Select, Switch, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  fetchAdminRoles,
  fetchAdminUsers,
  patchAdminUser,
  type AdminRoleRef,
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

  return (
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
        destroyOnClose
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
  );
}
