import { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Typography, Card, Tag, Avatar, Space, Empty, Input as AntInput } from 'antd';
import { UserOutlined, PhoneOutlined, MailOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

const { Title, Text } = Typography;

function getRole(): string {
    try {
        const t = localStorage.getItem('token');
        if (!t) return '';
        return JSON.parse(atob(t.split('.')[1])).role || '';
    } catch { return ''; }
}

export function Tenants() {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [form] = Form.useForm();
    const role = getRole();

    const { data = [], isLoading } = useQuery({
        queryKey: ['tenants', search],
        queryFn: () => apiClient.get('/tenants', { params: search ? { search } : {} }).then(r => r.data),
    });

    const mutation = useMutation({
        mutationFn: (vals: any) => apiClient.post('/tenants', vals),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tenants'] });
            setOpen(false);
            form.resetFields();
            message.success('Арендатор добавлен');
        },
        onError: () => message.error('Ошибка при добавлении'),
    });

    const tenants = data as any[];

    const columns = [
        {
            title: 'Арендатор',
            key: 'name',
            render: (_: any, r: any) => (
                <Space>
                    <Avatar style={{ background: '#2563eb' }} icon={<UserOutlined />} />
                    <div>
                        <Text strong>{r.name}</Text>
                        <br />
                        <Tag color={r.type === 'individual' ? 'blue' : 'purple'} style={{ fontSize: 11 }}>
                            {r.type === 'individual' ? 'Физ. лицо' : 'Юр. лицо'}
                        </Tag>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Телефон',
            dataIndex: 'phone',
            render: (v: string) => v ? <Space><PhoneOutlined style={{ color: '#64748b' }} /><Text>{v}</Text></Space> : <Text type="secondary">—</Text>,
        },
        {
            title: 'Email',
            dataIndex: 'email',
            render: (v: string) => v ? <Space><MailOutlined style={{ color: '#64748b' }} /><Text>{v}</Text></Space> : <Text type="secondary">—</Text>,
        },
        {
            title: 'ИНН',
            dataIndex: 'tax_id',
            render: (v: string) => v || <Text type="secondary">—</Text>,
        },
    ];

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Арендаторы</Title>
                    <Text type="secondary">
                        {role === 'admin'
                            ? 'Все зарегистрированные арендаторы системы'
                            : 'Арендаторы из ваших договоров и добавленные вручную'}
                    </Text>
                </div>
                <Button type="primary" icon={<TeamOutlined />} onClick={() => setOpen(true)}>
                    Добавить арендатора
                </Button>
            </div>

            <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 0 } }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                    <AntInput
                        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                        placeholder="Поиск по имени или телефону..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ maxWidth: 360 }}
                        allowClear
                    />
                </div>
                <Table
                    dataSource={tenants}
                    rowKey="id"
                    loading={isLoading}
                    columns={columns}
                    locale={{
                        emptyText: (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={
                                    role === 'landlord'
                                        ? 'Нет арендаторов. Добавьте вручную или создайте договор через переписку.'
                                        : 'Нет арендаторов'
                                }
                            />
                        )
                    }}
                    style={{ padding: '0 4px' }}
                />
            </Card>

            <Modal
                title={<Space><TeamOutlined /> Добавить арендатора вручную</Space>}
                open={open}
                onCancel={() => setOpen(false)}
                onOk={() => form.submit()}
                okText="Добавить"
            >
                <Form form={form} layout="vertical" onFinish={vals => mutation.mutate(vals)}>
                    <Form.Item name="type" label="Тип" rules={[{ required: true }]} initialValue="individual">
                        <Select options={[
                            { value: 'individual', label: 'Физическое лицо' },
                            { value: 'company', label: 'Юридическое лицо' },
                        ]} />
                    </Form.Item>
                    <Form.Item name="name" label="ФИО / Название компании" rules={[{ required: true }]}>
                        <Input placeholder="Иванов Иван Иванович" />
                    </Form.Item>
                    <Form.Item name="phone" label="Телефон" rules={[{ required: true }]}>
                        <Input placeholder="+375 (29) 123-45-67" />
                    </Form.Item>
                    <Form.Item name="email" label="Email">
                        <Input placeholder="email@example.com" />
                    </Form.Item>
                    <Form.Item name="tax_id" label="УНП / ИНН">
                        <Input placeholder="Только для юр. лиц" />
                    </Form.Item>
                    <Form.Item name="notes" label="Заметки">
                        <Input.TextArea rows={3} placeholder="Дополнительная информация..." />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
