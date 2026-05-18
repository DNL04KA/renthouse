import { Table, Button, Tag, message, Typography, Card, Space } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { DollarOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export function Payments() {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery({ queryKey: ['payments'], queryFn: () => apiClient.get('/payments').then(r => r.data) });

    const payMutation = useMutation({
        mutationFn: (id: string) => apiClient.patch(`/payments/${id}/pay`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); qc.invalidateQueries({ queryKey: ['dash_payments'] }); message.success('Оплачено!'); }
    });

    const totalPaid = data?.filter((p: any) => p.status === 'paid').reduce((a: number, c: any) => a + Number(c.amount), 0) || 0;
    const totalOverdue = data?.filter((p: any) => p.status === 'overdue').reduce((a: number, c: any) => a + Number(c.amount), 0) || 0;
    const totalPending = data?.filter((p: any) => p.status === 'pending').reduce((a: number, c: any) => a + Number(c.amount), 0) || 0;

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}><DollarOutlined /> Финансы</Title>
                    <Text type="secondary">График платежей и задолженности</Text>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
                <Card size="small" style={{ flex: 1, borderRadius: 12, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                    <Text type="secondary">Оплачено</Text>
                    <div><Text strong style={{ fontSize: 18, color: '#52c41a' }}>{totalPaid.toFixed(2)} BYN</Text></div>
                </Card>
                <Card size="small" style={{ flex: 1, borderRadius: 12, background: '#fffbe6', border: '1px solid #ffe58f' }}>
                    <Text type="secondary">Ожидается</Text>
                    <div><Text strong style={{ fontSize: 18, color: '#faad14' }}>{totalPending.toFixed(2)} BYN</Text></div>
                </Card>
                <Card size="small" style={{ flex: 1, borderRadius: 12, background: '#fff2f0', border: '1px solid #ffccc7' }}>
                    <Text type="secondary">Задолженность</Text>
                    <div><Text strong style={{ fontSize: 18, color: '#f5222d' }}>{totalOverdue.toFixed(2)} BYN</Text></div>
                </Card>
            </div>

            <Card bordered={false} styles={{ body: { padding: 0 } }} style={{ borderRadius: 16 }}>
                <Table dataSource={data} rowKey="id" loading={isLoading} columns={[
                    {
                        title: 'Объект / Договор',
                        key: 'context',
                        render: (_: any, r: any) => (
                            <div>
                                <Text strong style={{ fontSize: 13 }}>
                                    {r.contract?.property ? `${r.contract.property.city}, ${r.contract.property.street} ${r.contract.property.house}` : '—'}
                                </Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 11 }}>{r.contract?.number || '—'}</Text>
                            </div>
                        )
                    },
                    { title: 'Срок оплаты', dataIndex: 'due_date', render: (d: string) => new Date(d).toLocaleDateString('ru-RU') },
                    { title: 'Сумма', dataIndex: 'amount', render: (v: any) => <Text strong>{Number(v).toFixed(2)} BYN</Text> },
                    { title: 'Оплачено', dataIndex: 'paid_date', render: (d: string) => d ? new Date(d).toLocaleDateString('ru-RU') : '—' },
                    {
                        title: 'Статус', dataIndex: 'status', render: (s: string) => {
                            const colors: Record<string, string> = { paid: 'green', overdue: 'red', pending: 'gold' };
                            const labels: Record<string, string> = { paid: 'Оплачено', overdue: 'Просрочен', pending: 'Ожидает' };
                            return <Tag color={colors[s] || 'default'}>{labels[s] || s}</Tag>;
                        }
                    },
                    {
                        title: 'Действие', render: (_: any, r: any) =>
                            (r.status === 'pending' || r.status === 'overdue') &&
                            <Button size="small" type="primary" onClick={() => payMutation.mutate(r.id)}>Оплатить</Button>
                    }
                ]} />
            </Card>
        </Space>
    );
}
