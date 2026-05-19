import { Card, Col, Row, Statistic, Typography, Space, List, Tag, Progress, Button, Divider as AntDivider, Alert } from 'antd';
import {
    BuildOutlined, FileTextOutlined,
    DollarOutlined, RiseOutlined,
    ProjectOutlined, ClockCircleOutlined,
    UserOutlined, WarningOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

const { Title, Text, Paragraph } = Typography;

export function Dashboard() {
    const navigate = useNavigate();

    let role = 'tenant';
    const token = localStorage.getItem('token');
    if (token) {
        try { role = JSON.parse(atob(token.split('.')[1])).role; } catch {}
    }
    const isLandlord = role === 'landlord' || role === 'admin';
    const isTenant = role === 'tenant';
    const { data: props } = useQuery({ queryKey: ['dash_props'], queryFn: () => apiClient.get('/properties').then(res => res.data) });
    const { data: contracts } = useQuery({ queryKey: ['dash_contracts'], queryFn: () => apiClient.get('/contracts').then(res => res.data) });
    const { data: payments, isLoading: paymentsLoading } = useQuery({ queryKey: ['dash_payments'], queryFn: () => apiClient.get('/payments').then(res => res.data) });

    const today = new Date().toISOString().slice(0, 10);
    const in7days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    const totalIncome = payments?.filter((p: any) => p.status === 'paid').reduce((a: number, c: any) => a + Number(c.amount), 0) || 0;
    const overdue = payments?.filter((p: any) => p.status === 'overdue').reduce((a: number, c: any) => a + Number(c.amount), 0) || 0;
    const pending = payments?.filter((p: any) => p.status === 'pending').reduce((a: number, c: any) => a + Number(c.amount), 0) || 0;
    const activeContracts = contracts?.filter((c: any) => c.status === 'active').length || 0;
    const overdueTenantsCount = payments?.filter((p: any) => p.status === 'overdue').length || 0;

    const upcomingPayments = payments?.filter((p: any) =>
        p.status === 'pending' && p.due_date >= today && p.due_date <= in7days
    ) || [];
    const expiringContracts = contracts?.filter((c: any) =>
        c.status === 'active' && c.end_date >= today && c.end_date <= in7days
    ) || [];

    const occupancyRate = props?.length ? Math.round((activeContracts / props.length) * 100) : 0;
    const recentPayments = payments?.slice(0, 5) || [];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={2} style={{ margin: 0 }}>Обзор Системы</Title>
                <Text type="secondary">Статистика и важные показатели на сегодня.</Text>
            </div>

            {(upcomingPayments.length > 0 || expiringContracts.length > 0) && (
                <Space direction="vertical" style={{ width: '100%' }}>
                    {upcomingPayments.length > 0 && (
                        <Alert
                            icon={<ClockCircleOutlined />}
                            showIcon
                            type="warning"
                            message={`${upcomingPayments.length} платеж(ей) ожидаются в ближайшие 7 дней`}
                            action={<Button size="small" type="link" onClick={() => navigate('/app/payments')}>Перейти</Button>}
                        />
                    )}
                    {expiringContracts.length > 0 && (
                        <Alert
                            icon={<WarningOutlined />}
                            showIcon
                            type="error"
                            message={`${expiringContracts.length} договор(ов) истекает в ближайшие 7 дней`}
                            action={<Button size="small" type="link" onClick={() => navigate('/app/contracts')}>Перейти</Button>}
                        />
                    )}
                </Space>
            )}

            <Row gutter={[24, 24]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} styles={{ body: { padding: 24 } }} style={{ borderRadius: 16 }}>
                        <Statistic
                            title="Общий доход (оплачено)"
                            value={totalIncome}
                            precision={2}
                            suffix="BYN"
                            prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
                            valueStyle={{ color: '#1e293b' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} styles={{ body: { padding: 24 } }} style={{ borderRadius: 16 }}>
                        <Statistic
                            title="Ожидается оплат"
                            value={pending}
                            precision={2}
                            suffix="BYN"
                            prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                        />
                        <div style={{ marginTop: 12 }}>
                            <Progress percent={pending > 0 ? Math.min(100, Math.round(pending / (pending + totalIncome) * 100)) : 0} size="small" status="active" strokeColor="#faad14" showInfo={false} />
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} styles={{ body: { padding: 24 } }} style={{ borderRadius: 16 }}>
                        <Statistic
                            title="Задолженность"
                            value={overdue}
                            precision={2}
                            suffix="BYN"
                            prefix={<DollarOutlined style={{ color: '#f5222d' }} />}
                            valueStyle={{ color: overdue > 0 ? '#f5222d' : '#1e293b' }}
                        />
                        {overdueTenantsCount > 0 && (
                            <div style={{ marginTop: 8 }}><Text type="danger">{overdueTenantsCount} просроченных платежей</Text></div>
                        )}
                    </Card>
                </Col>
                {isLandlord && (
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false} styles={{ body: { padding: 24 } }} style={{ borderRadius: 16 }}>
                            <Statistic
                                title="Загрузка объектов"
                                value={occupancyRate}
                                suffix="%"
                                prefix={<ProjectOutlined style={{ color: '#2563eb' }} />}
                            />
                            <div style={{ marginTop: 12 }}>
                                <Progress percent={occupancyRate} size="small" strokeColor="#2563eb" />
                            </div>
                        </Card>
                    </Col>
                )}
            </Row>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                    <Card title="Последние платежи" extra={<Button type="link" onClick={() => navigate('/app/payments')}>Все платежи</Button>} styles={{ body: { padding: 0 } }} style={{ borderRadius: 16 }}>
                        <List
                            loading={paymentsLoading}
                            dataSource={recentPayments}
                            renderItem={(item: any) => (
                                <List.Item style={{ padding: '12px 24px' }}>
                                    <List.Item.Meta
                                        avatar={<div style={{ padding: 10, background: '#f8fafc', borderRadius: 12 }}><DollarOutlined style={{ color: '#2563eb' }} /></div>}
                                        title={<Text strong>{Number(item.amount).toFixed(2)} BYN</Text>}
                                        description={`Срок: ${new Date(item.due_date).toLocaleDateString()} • ${item.contract?.property ? `${item.contract.property.city}, ${item.contract.property.street}` : ''}`}
                                    />
                                    <div>
                                        <Tag color={item.status === 'paid' ? 'green' : item.status === 'overdue' ? 'red' : 'gold'}>
                                            {item.status === 'paid' ? 'Оплачено' : item.status === 'overdue' ? 'Просрок' : 'Ожидает'}
                                        </Tag>
                                    </div>
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title="Быстрые действия" style={{ borderRadius: 16 }}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {isLandlord && <>
                                <Button block type="primary" icon={<BuildOutlined />} onClick={() => navigate('/app/properties')}>Добавить объект</Button>
                                <Button block icon={<UserOutlined />} onClick={() => navigate('/app/tenants')}>Новый арендатор</Button>
                                <Button block icon={<FileTextOutlined />} onClick={() => navigate('/app/contracts')}>Создать договор</Button>
                            </>}
                            {isTenant && <>
                                <Button block type="primary" icon={<BuildOutlined />} onClick={() => navigate('/catalog')}>Найти жильё</Button>
                                <Button block icon={<FileTextOutlined />} onClick={() => navigate('/app/contracts')}>Мои договоры</Button>
                                <Button block icon={<DollarOutlined />} onClick={() => navigate('/app/payments')}>Мои платежи</Button>
                            </>}
                            <AntDivider style={{ margin: '12px 0' }} />
                            <Card size="small" style={{ background: '#f0f9ff', border: 'none' }}>
                                <Space align="start">
                                    <ProjectOutlined style={{ color: '#2563eb', marginTop: 4 }} />
                                    <div>
                                        <Text strong>Сводка</Text>
                                        <Paragraph style={{ margin: 0, fontSize: 12 }}>
                                            {isLandlord
                                                ? `Активных договоров: ${activeContracts}. Объектов всего: ${props?.length || 0}.`
                                                : `Активных договоров: ${activeContracts}. Ожидает оплат: ${pending.toFixed(2)} BYN.`
                                            }
                                        </Paragraph>
                                    </div>
                                </Space>
                            </Card>
                        </Space>
                    </Card>
                </Col>
            </Row>
        </Space>
    );
}
