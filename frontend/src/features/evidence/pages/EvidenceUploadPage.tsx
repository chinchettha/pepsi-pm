import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { App, Alert, Button, Card, Form, Input, Select, Space, Typography, Upload } from 'antd';
import { useSearchParams } from 'react-router-dom';
import type { UploadFile } from 'antd/es/upload/interface';
import { CameraOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { ApiError } from '../../../api/client';
import {
  WebpEncodeUnsupportedError,
  convertFileToWebp,
  webpBlobToFile,
} from '../../../lib/images/convertToWebp';
import { createTaskLog } from '../../work-orders/api';
import { postTaskLogAttachment } from '../api';

const LOG_TYPES = [
  { value: 'photo', label: 'photo (หลักฐานรูป)' },
  { value: 'note', label: 'note' },
  { value: 'parameter', label: 'parameter' },
];

export function EvidenceUploadPage() {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm<{ workOrderId: string; logType: string }>();

  useEffect(() => {
    const w = searchParams.get('workOrderId');
    if (w) form.setFieldsValue({ workOrderId: w });
  }, [searchParams, form]);
  const [taskLogId, setTaskLogId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const createMut = useMutation({
    mutationFn: async () => {
      const v = await form.validateFields();
      const woId = Number(v.workOrderId);
      if (!Number.isFinite(woId) || woId <= 0) {
        throw new Error('ใส่ Work order ID เป็นตัวเลข');
      }
      return createTaskLog(woId, v.logType);
    },
    onSuccess: (data) => {
      setTaskLogId(data.id);
      message.success(`สร้าง task log #${data.id} แล้ว — เลือกรูปแล้วอัปโหลด`);
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) message.error(e.message);
      else if (e instanceof Error) message.error(e.message);
    },
  });

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!taskLogId || !file) {
        throw new Error('ยังไม่มี task log หรือยังไม่เลือกไฟล์');
      }
      const id = Number(taskLogId);
      let toSend: File = file;
      try {
        const blob = await convertFileToWebp(file);
        toSend = webpBlobToFile(blob, file.name);
      } catch (e) {
        if (e instanceof WebpEncodeUnsupportedError) {
          message.warning('เบราว์เซอร์แปลง WebP ไม่ได้ — ส่งต้นฉบับให้ backend แปลง');
          toSend = file;
        } else {
          throw e;
        }
      }
      return postTaskLogAttachment(id, toSend);
    },
    onSuccess: (data) => {
      message.success(`อัปโหลดแล้ว — attachment #${data.id} · ${data.byteSize} bytes`);
      setFile(null);
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) message.error(e.message);
      else if (e instanceof Error) message.error(e.message);
    },
  });

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        หลักฐานรูป (before / after)
      </Typography.Title>
      <Alert
        type="info"
        showIcon
        message="ลำดับ: (1) สร้าง task log จาก Work order ID (2) เลือกรูป — แปลง WebP ในเบราว์เซอร์ก่อนส่งเมื่อรองรับ"
      />

      <Card title="1. สร้าง task log">
        <Form form={form} layout="vertical" initialValues={{ logType: 'photo' }}>
          <Form.Item
            label="Work order ID"
            name="workOrderId"
            rules={[{ required: true, message: 'ใส่ id จากตารางใบงาน' }]}
          >
            <Input placeholder="เช่น 1" inputMode="numeric" />
          </Form.Item>
          <Form.Item label="ประเภท log" name="logType">
            <Select options={LOG_TYPES} />
          </Form.Item>
          <Button type="primary" onClick={() => createMut.mutate()} loading={createMut.isPending}>
            สร้าง task log
          </Button>
          {taskLogId ? (
            <Typography.Paragraph style={{ marginTop: 12 }}>
              <Typography.Text strong>task_logs.id = {taskLogId}</Typography.Text>
            </Typography.Paragraph>
          ) : null}
        </Form>
      </Card>

      <Card title="2. อัปโหลดรูป">
        <Upload.Dragger
          maxCount={1}
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={!taskLogId || uploadMut.isPending}
          beforeUpload={(f) => {
            setFile(f);
            return false;
          }}
          onRemove={() => setFile(null)}
          fileList={file ? ([{ uid: '-1', name: file.name, status: 'done' }] as UploadFile[]) : []}
        >
          <p className="ant-upload-drag-icon">
            <CameraOutlined />
          </p>
          <p className="ant-upload-text">เลือกรูปหลักฐาน</p>
        </Upload.Dragger>
        <Button
          type="primary"
          icon={<CloudUploadOutlined />}
          style={{ marginTop: 16 }}
          disabled={!taskLogId || !file || uploadMut.isPending}
          loading={uploadMut.isPending}
          onClick={() => uploadMut.mutate()}
        >
          อัปโหลด (WebP + API)
        </Button>
      </Card>
    </Space>
  );
}
