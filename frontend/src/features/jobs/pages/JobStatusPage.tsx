import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Descriptions, Space, Typography } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { ROUTES } from '../../../config/routes';
import { fetchJobStatus } from '../api';

export function JobStatusPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const id = jobId?.trim() ?? '';

  const q = useQuery({
    queryKey: ['job-status', id],
    queryFn: () => fetchJobStatus(id),
    enabled: id.length > 0,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === 'pending' || s === 'running' ? 2000 : false;
    },
  });

  if (!id) {
    return <Alert type="error" message="ไม่มี job id ใน URL (ตัวอย่าง: /jobs/42)" />;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space wrap>
        <Link to={ROUTES.jobs.hub}>
          <Button icon={<ArrowLeftOutlined />}>กลับรายการงานคิว</Button>
        </Link>
        <Link to={ROUTES.import}>
          <Button>นำเข้า SAP</Button>
        </Link>
        <Button icon={<ReloadOutlined />} onClick={() => void q.refetch()}>
          รีเฟรช
        </Button>
      </Space>
      <Typography.Title level={4} style={{ margin: 0 }}>
        สถานะ job #{id}
      </Typography.Title>
      {q.isError ? (
        <Alert type="error" message={(q.error as Error).message} />
      ) : (
        <Card loading={q.isLoading}>
          {q.data ? (
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="jobType">{q.data.jobType}</Descriptions.Item>
              <Descriptions.Item label="status">{q.data.status}</Descriptions.Item>
              <Descriptions.Item label="attempts">
                {q.data.attempts} / {q.data.maxAttempts}
              </Descriptions.Item>
              <Descriptions.Item label="payload">
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
                  {JSON.stringify(q.data.payload, null, 2)}
                </pre>
              </Descriptions.Item>
              <Descriptions.Item label="lastError">
                {q.data.lastError ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="createdAt">{q.data.createdAt}</Descriptions.Item>
              <Descriptions.Item label="startedAt">{q.data.startedAt ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="finishedAt">{q.data.finishedAt ?? '—'}</Descriptions.Item>
            </Descriptions>
          ) : null}
        </Card>
      )}
    </Space>
  );
}
