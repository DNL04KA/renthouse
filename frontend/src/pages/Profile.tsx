import { useState } from 'react';
import { Card, Form, Input, Button, Typography, Row, Col, Avatar, Tag, Divider, message, Descriptions, Space, Modal, Statistic } from 'antd';
import { UserOutlined, EditOutlined, SaveOutlined, CloseOutlined, PhoneOutlined, HomeOutlined, LockOutlined, KeyOutlined, BuildOutlined, FileTextOutlined, DollarOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
dayjs.locale('ru');

const { Title, Text } = Typography;

const roleLabel: Record<string, { label: string; color: string }> = {
    admin: { label: 'Администратор', color: 'red' },
    landlord: { label: 'Арендодатель', color: 'blue' },
    tenant: { label: 'Арендатор', color: 'green' },
};

export function Profile() {
    const qc = useQueryClient();
    const [editing, setEditing] = useState(false);
    const [pwModal, setPwModal] = useState(false);
    const [form] = Form.useForm();
    const [pwForm] = Form.useForm();

    const { data: user, isLoading } = useQuery({
        queryKey: ['me'],
        queryFn: () => apiClient.get('/auth/me').then(r => r.data),
    });

    const pwMutation = useMutation({
        mutationFn: (vals: any) => apiClient.patch('/auth/me/password', {
            current_password: vals.current_password,
            new_password: vals.new_password,
        }),
        onSuccess: () => {
            message.success('Пароль успешно изменён');
            pwForm.resetFields();
            setPwModal(false);
        },
        onError: (e: any) => {
            const detail = e.response?.data?.detail;
            if (detail === 'Неверный текущий пароль') {
                pwForm.setFields([{ name: 'current_password', errors: ['Неверный текущий пароль'] }]);
            } else {
                message.error(detail || 'Ошибка смены пароля');
            }
        },
    });

    const mutation = useMutation({
        mutationFn: (vals: any) => apiClient.patch('/auth/me', vals).then(r => r.data),
        onSuccess: (updated) => {
            qc.setQueryData(['me'], updated);
            message.success('Профиль обновлён');
            setEditing(false);
        },
        onError: (e: any) => {
            message.error(e.response?.data?.detail || 'Ошибка обновления');
        },
    });

    const startEdit = () => {
        form.setFieldsValue({
            first_name: user?.first_name,
            last_name: user?.last_name,
            patronymic: user?.patronymic,
            phone: user?.phone,
            address: user?.address,
        });
        setEditing(true);
    };

    const fullName = [user?.last_name, user?.first_name, user?.patronymic].filter(Boolean).join(' ') || user?.username;
    const roleInfo = roleLabel[user?.role] ?? { label: user?.role, color: 'default' };
    const isLandlord = user?.role === 'landlord';

    const { data: properties = [] } = useQuery({
        queryKey: ['properties'],
        queryFn: () => apiClient.get('/properties').then(r => r.data),
        enabled: isLandlord,
    });

    const { data: contracts = [] } = useQuery({
        queryKey: ['contracts'],
        queryFn: () => apiClient.get('/contracts').then(r => r.data),
        enabled: isLandlord,
    });

    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
    const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');
    const { data: incomeReport } = useQuery({
        queryKey: ['income-report', monthStart, monthEnd],
        queryFn: () => apiClient.get(`/reports/income?start_date=${monthStart}&end_date=${monthEnd}`).then(r => r.data),
        enabled: isLandlord,
    });

    const activeContracts = (contracts as any[]).filter(c => c.status === 'active').length;
    const monthIncome = incomeReport?.total_income ?? 0;

    if (isLoading) return <div style={{ padding: 32 }}>Загрузка...</div>;

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <Title level={3} style={{ marginBottom: 24 }}>Мой профиль</Title>

            <Card style={{ borderRadius: 16, marginBottom: 24 }}>
                <Row gutter={24} align="middle">
                    <Col>
                        <Avatar size={80} style={{ backgroundColor: '#2563eb', fontSize: 32 }} icon={<UserOutlined />} />
                    </Col>
                    <Col flex={1}>
                        <Title level={4} style={{ margin: 0 }}>{fullName}</Title>
                        <Space style={{ marginTop: 8 }}>
                            <Tag color={roleInfo.color}>{roleInfo.label}</Tag>
                            <Text type="secondary">@{user?.username}</Text>
                        </Space>
                        <div style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Зарегистрирован: {user?.created_at ? dayjs(user.created_at).format('DD.MM.YYYY') : '—'}
                            </Text>
                        </div>
                    </Col>
                    <Col>
                        <Space direction="vertical" size={8} style={{ alignItems: 'flex-end' }}>
                            {!editing && (
                                <Button icon={<EditOutlined />} onClick={startEdit} type="primary" ghost>
                                    Редактировать
                                </Button>
                            )}
                            <Button icon={<KeyOutlined />} onClick={() => setPwModal(true)}>
                                Сменить пароль
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {isLandlord && (
                <Card style={{ borderRadius: 16, marginBottom: 24 }} title="Сводная статистика">
                    <Row gutter={24}>
                        <Col span={8}>
                            <Card style={{ borderRadius: 12, background: '#eff6ff', border: 'none' }} bodyStyle={{ padding: '20px 24px' }}>
                                <Statistic
                                    title={<span style={{ color: '#64748b', fontSize: 13 }}>Объектов в управлении</span>}
                                    value={(properties as any[]).length}
                                    prefix={<BuildOutlined style={{ color: '#2563eb' }} />}
                                    valueStyle={{ color: '#2563eb', fontWeight: 700 }}
                                />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card style={{ borderRadius: 12, background: '#f0fdf4', border: 'none' }} bodyStyle={{ padding: '20px 24px' }}>
                                <Statistic
                                    title={<span style={{ color: '#64748b', fontSize: 13 }}>Действующих договоров</span>}
                                    value={activeContracts}
                                    prefix={<FileTextOutlined style={{ color: '#16a34a' }} />}
                                    valueStyle={{ color: '#16a34a', fontWeight: 700 }}
                                />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card style={{ borderRadius: 12, background: '#fffbeb', border: 'none' }} bodyStyle={{ padding: '20px 24px' }}>
                                <Statistic
                                    title={<span style={{ color: '#64748b', fontSize: 13 }}>Поступило за {dayjs().format('MMMM')}</span>}
                                    value={monthIncome}
                                    prefix={<DollarOutlined style={{ color: '#d97706' }} />}
                                    suffix="BYN"
                                    precision={2}
                                    valueStyle={{ color: '#d97706', fontWeight: 700 }}
                                />
                            </Card>
                        </Col>
                    </Row>
                </Card>
            )}

            {!editing ? (
                <Card style={{ borderRadius: 16 }} title="Личные данные">
                    <Descriptions column={2} bordered size="small">
                        <Descriptions.Item label="Фамилия">{user?.last_name || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Имя">{user?.first_name || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Отчество">{user?.patronymic || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Дата рождения">
                            {user?.birth_date ? dayjs(user.birth_date).format('DD.MM.YYYY') : '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Телефон">{user?.phone || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Адрес">{user?.address || '—'}</Descriptions.Item>
                    </Descriptions>
                </Card>
            ) : (
                <Card
                    style={{ borderRadius: 16 }}
                    title="Редактирование профиля"
                    extra={
                        <Button icon={<CloseOutlined />} onClick={() => setEditing(false)} size="small">
                            Отмена
                        </Button>
                    }
                >
                    <Form form={form} layout="vertical" onFinish={vals => mutation.mutate(vals)}>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="last_name" label="Фамилия">
                                    <Input prefix={<UserOutlined />} placeholder="Иванов" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="first_name" label="Имя">
                                    <Input placeholder="Иван" />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item name="patronymic" label="Отчество">
                            <Input placeholder="Иванович" />
                        </Form.Item>
                        <Form.Item name="phone" label="Телефон">
                            <Input prefix={<PhoneOutlined />} placeholder="+375 (29) 123-45-67" />
                        </Form.Item>
                        <Form.Item name="address" label="Адрес">
                            <Input prefix={<HomeOutlined />} placeholder="г. Минск, ул. Ленина, д. 1" />
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 0 }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<SaveOutlined />}
                                loading={mutation.isPending}
                            >
                                Сохранить
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            )}
            <Modal
                title={<Space><LockOutlined /> Смена пароля</Space>}
                open={pwModal}
                onCancel={() => { setPwModal(false); pwForm.resetFields(); }}
                footer={null}
                destroyOnClose
            >
                <Form form={pwForm} layout="vertical" onFinish={vals => pwMutation.mutate(vals)} style={{ marginTop: 16 }}>
                    <Form.Item
                        name="current_password"
                        label="Текущий пароль"
                        rules={[{ required: true, message: 'Введите текущий пароль' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Текущий пароль" />
                    </Form.Item>
                    <Form.Item
                        name="new_password"
                        label="Новый пароль"
                        rules={[
                            { required: true, message: 'Введите новый пароль' },
                            { min: 6, message: 'Минимум 6 символов' },
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Минимум 6 символов" />
                    </Form.Item>
                    <Form.Item
                        name="confirm_password"
                        label="Повторите новый пароль"
                        dependencies={['new_password']}
                        rules={[
                            { required: true, message: 'Повторите пароль' },
                            ({ getFieldValue }) => ({
                                validator(_, v) {
                                    if (!v || getFieldValue('new_password') === v) return Promise.resolve();
                                    return Promise.reject('Пароли не совпадают');
                                },
                            }),
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Повторите новый пароль" />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Space>
                            <Button type="primary" htmlType="submit" loading={pwMutation.isPending}>
                                Сохранить
                            </Button>
                            <Button onClick={() => { setPwModal(false); pwForm.resetFields(); }}>
                                Отмена
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
