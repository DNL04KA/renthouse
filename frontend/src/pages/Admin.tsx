import { useState } from 'react';
import {
    Table, Button, Modal, Form, Select, Switch, message, Tag, Space,
    Typography, Card, Row, Col, Statistic, Avatar, Input, Badge, Tooltip,
} from 'antd';
import {
    UserOutlined, CrownOutlined, TeamOutlined, BuildOutlined,
    DollarOutlined, FileTextOutlined, SearchOutlined, EditOutlined,
    CheckCircleOutlined, StopOutlined, EnvironmentOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

const { Title, Text } = Typography;

const ROLE_COLORS: Record<string, string> = {
    admin: 'red', landlord: 'blue', tenant: 'green',
};
const ROLE_LABELS: Record<string, string> = {
    admin: 'Администратор', landlord: 'Арендодатель', tenant: 'Арендатор',
};
const ROLE_ICONS: Record<string, React.ReactNode> = {
    admin: <CrownOutlined />, landlord: <BuildOutlined />, tenant: <TeamOutlined />,
};

export function Admin() {
    const qc = useQueryClient();
    const [editUser, setEditUser] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [form] = Form.useForm();

    const geocodeMutation = useMutation({
        mutationFn: () => apiClient.post('/admin/geocode-all'),
        onSuccess: (res: any) => {
            const d = res.data;
            message.success(`Геокодирование завершено: ${d.geocoded} из ${d.total_checked} объектов обновлено`);
            qc.invalidateQueries({ queryKey: ['admin_stats'] });
        },
        onError: () => message.error('Ошибка геокодирования'),
    });

    const { data: stats } = useQuery({
        queryKey: ['admin_stats'],
        queryFn: () => apiClient.get('/admin/stats').then(r => r.data),
    });

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['admin_users', search],
        queryFn: () => apiClient.get('/admin/users', { params: search ? { search } : {} }).then(r => r.data),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            apiClient.patch(`/admin/users/${id}`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin_users'] });
            qc.invalidateQueries({ queryKey: ['admin_stats'] });
            setEditUser(null);
            message.success('Пользователь обновлён');
        },
        onError: () => message.error('Ошибка обновления'),
    });

    const handleEdit = (user: any) => {
        setEditUser(user);
        form.setFieldsValue({ role: user.role, is_active: user.is_active });
    };

    const columns = [
        {
            title: 'Пользователь',
            key: 'user',
            render: (_: any, r: any) => (
                <Space>
                    <Badge dot color={r.is_active ? '#52c41a' : '#ff4d4f'}>
                        <Avatar
                            style={{ background: ROLE_COLORS[r.role] === 'red' ? '#ef4444' : ROLE_COLORS[r.role] === 'blue' ? '#2563eb' : '#16a34a' }}
                            icon={<UserOutlined />}
                        />
                    </Badge>
                    <div>
                        <Text strong>{r.name || r.username}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>@{r.username}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Роль',
            dataIndex: 'role',
            render: (v: string) => (
                <Tag color={ROLE_COLORS[v]} icon={ROLE_ICONS[v]}>
                    {ROLE_LABELS[v] || v}
                </Tag>
            ),
            filters: [
                { text: 'Администратор', value: 'admin' },
                { text: 'Арендодатель', value: 'landlord' },
                { text: 'Арендатор', value: 'tenant' },
            ],
            onFilter: (value: any, record: any) => record.role === value,
        },
        {
            title: 'Контакт',
            key: 'contact',
            render: (_: any, r: any) => (
                <div>
                    <Text style={{ fontSize: 12 }}>{r.phone || <Text type="secondary">—</Text>}</Text>
                </div>
            ),
        },
        {
            title: 'Статус',
            dataIndex: 'is_active',
            render: (v: boolean) => v
                ? <Tag color="success" icon={<CheckCircleOutlined />}>Активен</Tag>
                : <Tag color="error" icon={<StopOutlined />}>Заблокирован</Tag>,
        },
        {
            title: 'Дата регистрации',
            dataIndex: 'created_at',
            render: (v: string) => new Date(v).toLocaleDateString('ru-RU'),
            sorter: (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        },
        {
            title: 'Действия',
            key: 'actions',
            render: (_: any, r: any) => (
                <Space>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(r)}
                    >
                        Изменить
                    </Button>
                    <Button
                        size="small"
                        danger={r.is_active}
                        icon={r.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                        onClick={() => updateMutation.mutate({ id: r.id, data: { is_active: !r.is_active } })}
                    >
                        {r.is_active ? 'Блокировать' : 'Активировать'}
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={2} style={{ margin: 0 }}>
                    <CrownOutlined style={{ color: '#ef4444', marginRight: 8 }} />
                    Администрирование
                </Title>
                <Text type="secondary">Управление пользователями и мониторинг системы</Text>
                <div style={{ marginTop: 12 }}>
                    <Tooltip title="Автоматически проставить координаты для объектов без геолокации через OpenStreetMap">
                        <Button
                            icon={<EnvironmentOutlined />}
                            loading={geocodeMutation.isPending}
                            onClick={() => geocodeMutation.mutate()}
                        >
                            Геокодировать все объекты
                        </Button>
                    </Tooltip>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <Row gutter={[16, 16]}>
                    <Col xs={12} sm={6}>
                        <Card bordered={false} style={{ borderRadius: 16, background: '#eff6ff' }}>
                            <Statistic
                                title="Всего пользователей"
                                value={stats.users.total}
                                prefix={<UserOutlined style={{ color: '#2563eb' }} />}
                            />
                            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                                {stats.users.landlords} владельцев · {stats.users.tenants} арендаторов
                            </div>
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card bordered={false} style={{ borderRadius: 16, background: '#f0fdf4' }}>
                            <Statistic
                                title="Объекты"
                                value={stats.properties.total}
                                prefix={<BuildOutlined style={{ color: '#16a34a' }} />}
                            />
                            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                                {stats.properties.available} свободных · {stats.properties.rented} сданных
                            </div>
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card bordered={false} style={{ borderRadius: 16, background: '#fefce8' }}>
                            <Statistic
                                title="Активных договоров"
                                value={stats.contracts.active}
                                prefix={<FileTextOutlined style={{ color: '#ca8a04' }} />}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card bordered={false} style={{ borderRadius: 16, background: '#fdf4ff' }}>
                            <Statistic
                                title="Оплачено всего"
                                value={stats.payments.total_paid}
                                precision={0}
                                suffix="BYN"
                                prefix={<DollarOutlined style={{ color: '#9333ea' }} />}
                            />
                            {stats.payments.total_overdue > 0 && (
                                <div style={{ marginTop: 8, fontSize: 12, color: '#ef4444' }}>
                                    Просрочено: {Number(stats.payments.total_overdue).toLocaleString()} BYN
                                </div>
                            )}
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Users table */}
            <Card
                title={<Space><TeamOutlined /> Пользователи системы</Space>}
                bordered={false}
                styles={{ body: { padding: 0 } }}
                style={{ borderRadius: 16 }}
                extra={
                    <Input
                        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                        placeholder="Поиск по логину или имени..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        allowClear
                        style={{ width: 260 }}
                    />
                }
            >
                <Table
                    dataSource={users as any[]}
                    rowKey="id"
                    loading={isLoading}
                    columns={columns}
                    pagination={{ pageSize: 15, showSizeChanger: false }}
                    style={{ padding: '0 4px' }}
                />
            </Card>

            {/* Edit modal */}
            <Modal
                title={<Space><EditOutlined /> Изменить пользователя</Space>}
                open={!!editUser}
                onCancel={() => setEditUser(null)}
                onOk={() => form.submit()}
                okText="Сохранить"
                confirmLoading={updateMutation.isPending}
            >
                {editUser && (
                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                        <Space>
                            <Avatar icon={<UserOutlined />} style={{ background: '#2563eb' }} />
                            <div>
                                <Text strong>{editUser.name || editUser.username}</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>@{editUser.username}</Text>
                            </div>
                        </Space>
                    </div>
                )}
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={vals => updateMutation.mutate({ id: editUser.id, data: vals })}
                >
                    <Form.Item name="role" label="Роль" rules={[{ required: true }]}>
                        <Select
                            options={[
                                { value: 'admin', label: <Space><CrownOutlined />Администратор</Space> },
                                { value: 'landlord', label: <Space><BuildOutlined />Арендодатель</Space> },
                                { value: 'tenant', label: <Space><TeamOutlined />Арендатор</Space> },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item name="is_active" label="Статус аккаунта" valuePropName="checked">
                        <Switch
                            checkedChildren="Активен"
                            unCheckedChildren="Заблокирован"
                        />
                    </Form.Item>
                    <Form.Item name="name" label="Отображаемое имя">
                        <Input placeholder="Иванов Иван Иванович" />
                    </Form.Item>
                    <Form.Item name="phone" label="Телефон">
                        <Input placeholder="+375 (29) 123-45-67" />
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
}
