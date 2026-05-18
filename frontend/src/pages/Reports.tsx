import { useState } from 'react';
import { Card, Col, Row, Statistic, Table, Typography, Space, DatePicker, Button, Tag, List, Alert, Tabs } from 'antd';
import {
    RiseOutlined, DollarOutlined, WarningOutlined, ClockCircleOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export function Reports() {
    const [dateRange, setDateRange] = useState<[string, string]>(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
        return [firstDay, lastDay];
    });
    const [upcomingDays, setUpcomingDays] = useState(30);
    const [fetchIncome, setFetchIncome] = useState(false);

    const { data: incomeData, isLoading: incomeLoading, refetch: refetchIncome } = useQuery({
        queryKey: ['report_income', dateRange],
        queryFn: () => apiClient.get('/reports/income', {
            params: { start_date: dateRange[0], end_date: dateRange[1] },
        }).then(r => r.data),
        enabled: fetchIncome,
    });

    const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
        queryKey: ['report_upcoming', upcomingDays],
        queryFn: () => apiClient.get('/reports/upcoming', { params: { days: upcomingDays } }).then(r => r.data),
    });

    const propertyColumns = [
        {
            title: 'Объект',
            dataIndex: 'address',
            render: (v: string) => <Text strong>{v}</Text>,
        },
        {
            title: 'Тип',
            dataIndex: 'type',
            render: (v: string) => {
                const labels: any = { flat: 'Квартира', office: 'Офис', warehouse: 'Склад', other: 'Другое' };
                return <Tag>{labels[v] || v}</Tag>;
            },
        },
        {
            title: 'Статус',
            dataIndex: 'status',
            render: (s: string) => {
                const colors: any = { available: 'green', rented: 'blue', reserved: 'orange', inactive: 'default' };
                const labels: any = { available: 'Свободен', rented: 'Сдан', reserved: 'Резерв', inactive: 'Неактивен' };
                return <Tag color={colors[s] || 'default'}>{labels[s] || s}</Tag>;
            },
        },
        {
            title: 'Доход за период',
            dataIndex: 'income',
            render: (v: number) => (
                <Text strong style={{ color: v > 0 ? '#52c41a' : '#999' }}>
                    {Number(v).toFixed(2)} BYN
                </Text>
            ),
            sorter: (a: any, b: any) => a.income - b.income,
            defaultSortOrder: 'descend' as const,
        },
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={2} style={{ margin: 0 }}>Отчёты и аналитика</Title>
                <Text type="secondary">Доходность объектов и предстоящие события</Text>
            </div>

            <Tabs
                defaultActiveKey="income"
                items={[
                    {
                        key: 'income',
                        label: <span><DollarOutlined /> Доходы по объектам</span>,
                        children: (
                            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                                <Card bordered={false} style={{ borderRadius: 16, background: '#f8fafc' }}>
                                    <Space wrap>
                                        <Text strong>Период:</Text>
                                        <RangePicker
                                            value={[dayjs(dateRange[0]), dayjs(dateRange[1])]}
                                            onChange={(dates) => {
                                                if (dates && dates[0] && dates[1]) {
                                                    setDateRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]);
                                                }
                                            }}
                                        />
                                        <Button
                                            type="primary"
                                            onClick={() => { setFetchIncome(true); refetchIncome(); }}
                                            loading={incomeLoading}
                                        >
                                            Сформировать отчёт
                                        </Button>
                                    </Space>
                                </Card>

                                {incomeData && (
                                    <Row gutter={[16, 16]}>
                                        <Col xs={24} sm={8}>
                                            <Card bordered={false} style={{ borderRadius: 16 }}>
                                                <Statistic
                                                    title="Общий доход за период"
                                                    value={incomeData.total_income}
                                                    precision={2}
                                                    suffix="BYN"
                                                    prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
                                                    valueStyle={{ color: '#52c41a' }}
                                                />
                                            </Card>
                                        </Col>
                                        <Col xs={24} sm={8}>
                                            <Card bordered={false} style={{ borderRadius: 16 }}>
                                                <Statistic
                                                    title="Объектов с доходом"
                                                    value={incomeData.properties?.filter((p: any) => p.income > 0).length || 0}
                                                    suffix={`/ ${incomeData.properties?.length || 0}`}
                                                    prefix={<FileTextOutlined style={{ color: '#2563eb' }} />}
                                                />
                                            </Card>
                                        </Col>
                                        <Col xs={24} sm={8}>
                                            <Card bordered={false} style={{ borderRadius: 16 }}>
                                                <Statistic
                                                    title="Средний доход на объект"
                                                    value={incomeData.properties?.length
                                                        ? (incomeData.total_income / incomeData.properties.length)
                                                        : 0}
                                                    precision={2}
                                                    suffix="BYN"
                                                    prefix={<DollarOutlined style={{ color: '#faad14' }} />}
                                                />
                                            </Card>
                                        </Col>
                                    </Row>
                                )}

                                <Card bordered={false} styles={{ body: { padding: 0 } }} style={{ borderRadius: 16 }}>
                                    <Table
                                        dataSource={incomeData?.properties || []}
                                        rowKey="id"
                                        loading={incomeLoading}
                                        columns={propertyColumns}
                                        pagination={false}
                                        locale={{ emptyText: 'Нажмите «Сформировать отчёт» для загрузки данных' }}
                                    />
                                </Card>
                            </Space>
                        ),
                    },
                    {
                        key: 'upcoming',
                        label: <span><ClockCircleOutlined /> Предстоящие события</span>,
                        children: (
                            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                                <Card bordered={false} style={{ borderRadius: 16, background: '#f8fafc' }}>
                                    <Space wrap>
                                        <Text strong>Горизонт планирования:</Text>
                                        {[7, 14, 30, 60].map(d => (
                                            <Button
                                                key={d}
                                                type={upcomingDays === d ? 'primary' : 'default'}
                                                size="small"
                                                onClick={() => setUpcomingDays(d)}
                                            >
                                                {d} дней
                                            </Button>
                                        ))}
                                    </Space>
                                </Card>

                                <Row gutter={[24, 24]}>
                                    <Col xs={24} lg={12}>
                                        <Card
                                            title={
                                                <span>
                                                    <ClockCircleOutlined style={{ color: '#faad14' }} />{' '}
                                                    Предстоящие платежи ({upcomingData?.upcoming_payments?.length || 0})
                                                </span>
                                            }
                                            bordered={false}
                                            style={{ borderRadius: 16 }}
                                        >
                                            {upcomingData?.upcoming_payments?.length === 0 && (
                                                <Alert type="success" message="Нет предстоящих платежей" showIcon />
                                            )}
                                            <List
                                                loading={upcomingLoading}
                                                dataSource={upcomingData?.upcoming_payments || []}
                                                renderItem={(item: any) => (
                                                    <List.Item>
                                                        <List.Item.Meta
                                                            title={<Text strong>{Number(item.amount).toFixed(2)} BYN</Text>}
                                                            description={item.property}
                                                        />
                                                        <Tag color="orange">
                                                            {new Date(item.due_date).toLocaleDateString('ru-RU')}
                                                        </Tag>
                                                    </List.Item>
                                                )}
                                            />
                                        </Card>
                                    </Col>
                                    <Col xs={24} lg={12}>
                                        <Card
                                            title={
                                                <span>
                                                    <WarningOutlined style={{ color: '#f5222d' }} />{' '}
                                                    Истекающие договоры ({upcomingData?.expiring_contracts?.length || 0})
                                                </span>
                                            }
                                            bordered={false}
                                            style={{ borderRadius: 16 }}
                                        >
                                            {upcomingData?.expiring_contracts?.length === 0 && (
                                                <Alert type="success" message="Нет истекающих договоров" showIcon />
                                            )}
                                            <List
                                                loading={upcomingLoading}
                                                dataSource={upcomingData?.expiring_contracts || []}
                                                renderItem={(item: any) => (
                                                    <List.Item>
                                                        <List.Item.Meta
                                                            title={<Text strong>{item.number}</Text>}
                                                            description={`${item.tenant} — ${item.property}`}
                                                        />
                                                        <Tag color="red">
                                                            {new Date(item.end_date).toLocaleDateString('ru-RU')}
                                                        </Tag>
                                                    </List.Item>
                                                )}
                                            />
                                        </Card>
                                    </Col>
                                </Row>
                            </Space>
                        ),
                    },
                ]}
            />
        </Space>
    );
}
