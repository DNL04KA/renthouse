import { useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Tag, Space, Typography, Card, Row, Col, Popconfirm, Tooltip } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { BuildOutlined, PlusOutlined, HomeOutlined, ShopOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
    available: 'green', rented: 'blue', reserved: 'orange', inactive: 'default', sold: 'purple',
};
const STATUS_LABELS: Record<string, string> = {
    available: 'Свободен', rented: 'Сдан', reserved: 'Резерв', inactive: 'Неактивен', sold: 'Продан',
};

function getRole(): string {
    try {
        const t = localStorage.getItem('token');
        if (!t) return '';
        return JSON.parse(atob(t.split('.')[1])).role || '';
    } catch { return ''; }
}

export function Properties() {
    const qc = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [editProp, setEditProp] = useState<any>(null);
    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const listingType = Form.useWatch('listing_type', createForm);
    const editListingType = Form.useWatch('listing_type', editForm);
    const role = getRole();

    const { data = [], isLoading } = useQuery({
        queryKey: ['props'],
        queryFn: () => apiClient.get('/properties').then(r => r.data),
    });

    // For admin: load landlord users for owner selection
    const { data: landlordUsers = [] } = useQuery({
        queryKey: ['landlord_users'],
        queryFn: () => apiClient.get('/admin/users', { params: { search: '' } }).then(r =>
            (r.data as any[]).filter(u => u.role === 'landlord')
        ),
        enabled: role === 'admin',
    });

    const props = data as any[];

    const createMutation = useMutation({
        mutationFn: (vals: any) => apiClient.post('/properties', vals),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['props'] });
            setCreateOpen(false);
            createForm.resetFields();
            message.success('Объект успешно добавлен');
        },
        onError: () => message.error('Ошибка при добавлении объекта'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.patch(`/properties/${id}`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['props'] });
            setEditProp(null);
            message.success('Объект обновлён');
        },
        onError: () => message.error('Ошибка при обновлении'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/properties/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['props'] });
            message.success('Объект удалён');
        },
        onError: (e: any) => message.error(e.response?.data?.detail || 'Ошибка при удалении'),
    });

    const handleEditOpen = (p: any) => {
        setEditProp(p);
        editForm.setFieldsValue({
            listing_type: p.listing_type,
            type: p.type,
            city: p.city,
            street: p.street,
            house: p.house,
            unit: p.unit,
            rooms: p.rooms,
            area: p.area,
            floor: p.floor,
            total_floors: p.total_floors,
            base_rent: p.base_rent,
            sale_price: p.sale_price,
            status: p.status,
            description: p.description,
            images: p.images?.join(', ') || '',
            amenities: p.amenities?.join(', ') || '',
            owner_id: p.owner?.id,
            latitude: p.latitude,
            longitude: p.longitude,
        });
    };

    const columns = [
        {
            title: 'Объект',
            key: 'info',
            render: (_: any, r: any) => (
                <Space size="middle">
                    <div style={{ width: 60, height: 60, borderRadius: 10, overflow: 'hidden', background: '#f1f5f9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {r.images?.[0] ? (
                            <img
                                src={r.images[0]}
                                alt="thumb"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <BuildOutlined style={{ fontSize: 28, color: '#94a3b8' }} />
                        )}
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 14 }}>{r.city}, {r.street}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>д. {r.house}{r.unit ? `, кв. ${r.unit}` : ''}</Text>
                        <br />
                        <Tag
                            color={r.listing_type === 'sale' ? 'purple' : 'blue'}
                            style={{ marginTop: 4, fontSize: 11 }}
                        >
                            {r.listing_type === 'sale' ? <><ShopOutlined /> Продажа</> : <><HomeOutlined /> Аренда</>}
                        </Tag>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Характеристики',
            key: 'specs',
            render: (_: any, r: any) => (
                <Space direction="vertical" size={0}>
                    <Text style={{ fontSize: 13 }}>{r.rooms} комн. · {r.area} м²</Text>
                    {r.floor && <Text type="secondary" style={{ fontSize: 11 }}>Этаж {r.floor} из {r.total_floors}</Text>}
                </Space>
            ),
        },
        {
            title: 'Цена',
            key: 'price',
            render: (_: any, r: any) => (
                <Space direction="vertical" size={0}>
                    {r.listing_type === 'sale' && r.sale_price ? (
                        <Text strong style={{ color: '#7c3aed' }}>{Number(r.sale_price).toLocaleString()} BYN</Text>
                    ) : null}
                    {(r.listing_type === 'rent' || !r.sale_price) ? (
                        <Text strong style={{ color: '#2563eb' }}>{Number(r.base_rent).toLocaleString()} BYN/мес</Text>
                    ) : (
                        <Text type="secondary" style={{ fontSize: 11 }}>Аренда: {Number(r.base_rent).toLocaleString()} BYN/мес</Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'Статус',
            dataIndex: 'status',
            render: (s: string) => <Tag color={STATUS_COLORS[s] || 'default'}>{STATUS_LABELS[s] || s}</Tag>,
        },
        ...(role === 'admin' ? [{
            title: 'Владелец',
            key: 'owner',
            render: (_: any, r: any) => r.owner ? (
                <Space size={4}>
                    <UserOutlined style={{ color: '#2563eb' }} />
                    <Text style={{ fontSize: 12 }}>{r.owner.name || r.owner.id}</Text>
                </Space>
            ) : <Text type="secondary">—</Text>,
        }] : []),
        {
            title: 'Действия',
            key: 'actions',
            render: (_: any, r: any) => (
                <Space>
                    <Tooltip title="Редактировать">
                        <Button size="small" icon={<EditOutlined />} onClick={() => handleEditOpen(r)} />
                    </Tooltip>
                    <Popconfirm
                        title="Удалить объект?"
                        description="Объекты с активными договорами удалить нельзя."
                        onConfirm={() => deleteMutation.mutate(r.id)}
                        okText="Удалить"
                        cancelText="Отмена"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Удалить">
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const PropertyForm = ({ form, onFinish, isEdit = false }: any) => (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={isEdit ? undefined : { listing_type: 'rent', rooms: 1 }}
            style={{ marginTop: 16 }}
        >
            <Form.Item name="listing_type" label="Тип объявления">
                <Select options={[
                    { value: 'rent', label: <Space><HomeOutlined />Аренда</Space> },
                    { value: 'sale', label: <Space><ShopOutlined />Продажа</Space> },
                ]} />
            </Form.Item>

            {isEdit && (
                <Form.Item name="status" label="Статус объекта">
                    <Select options={[
                        { value: 'available', label: 'Свободен' },
                        { value: 'rented', label: 'Сдан' },
                        { value: 'reserved', label: 'Зарезервирован' },
                        { value: 'inactive', label: 'Неактивен' },
                        { value: 'sold', label: 'Продан' },
                    ]} />
                </Form.Item>
            )}

            {role === 'admin' && (
                <Form.Item name="owner_id" label="Владелец (арендодатель)">
                    <Select
                        placeholder="Оставить без изменений"
                        allowClear
                        options={(landlordUsers as any[]).map((u: any) => ({
                            value: u.id,
                            label: `${u.name || u.username} (@${u.username})`,
                        }))}
                    />
                </Form.Item>
            )}

            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name="type" label="Тип недвижимости" rules={[{ required: !isEdit }]}>
                        <Select options={[
                            { value: 'flat', label: 'Квартира' },
                            { value: 'office', label: 'Офис' },
                            { value: 'warehouse', label: 'Склад' },
                            { value: 'other', label: 'Другое' },
                        ]} />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item name="city" label="Город" rules={[{ required: !isEdit }]}>
                        <Input placeholder="Минск" />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={16}>
                    <Form.Item name="street" label="Улица" rules={[{ required: !isEdit }]}>
                        <Input placeholder="пр. Независимости" />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item name="house" label="Дом" rules={[{ required: !isEdit }]}>
                        <Input placeholder="12А" />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={8}>
                    <Form.Item name="rooms" label="Комнат">
                        <InputNumber style={{ width: '100%' }} min={1} />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item name="area" label="Площадь" rules={[{ required: !isEdit }]}>
                        <InputNumber style={{ width: '100%' }} addonAfter="м²" min={1} />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item name="floor" label="Этаж">
                        <InputNumber style={{ width: '100%' }} min={1} />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name="base_rent" label="Ставка аренды (BYN/мес)" rules={[{ required: !isEdit }]}>
                        <InputNumber style={{ width: '100%' }} addonAfter="BYN/мес" min={0} />
                    </Form.Item>
                </Col>
                {(isEdit ? editListingType === 'sale' : listingType === 'sale') && (
                    <Col span={12}>
                        <Form.Item name="sale_price" label="Цена продажи (BYN)">
                            <InputNumber style={{ width: '100%' }} addonAfter="BYN" min={0} />
                        </Form.Item>
                    </Col>
                )}
            </Row>

            <Form.Item name="description" label="Описание">
                <Input.TextArea rows={3} placeholder="Расскажите об особенностях объекта..." />
            </Form.Item>

            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name="latitude" label="Широта (авто, если пусто)">
                        <InputNumber style={{ width: '100%' }} placeholder="53.9045" step={0.0001} />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item name="longitude" label="Долгота (авто, если пусто)">
                        <InputNumber style={{ width: '100%' }} placeholder="27.5615" step={0.0001} />
                    </Form.Item>
                </Col>
            </Row>

            <Form.Item
                label="Фотографии (URL через запятую)"
                name="images"
                getValueFromEvent={e => typeof e === 'string' ? e.split(',').map((s: string) => s.trim()).filter(Boolean) : e}
                getValueProps={v => ({ value: Array.isArray(v) ? v.join(', ') : v })}
            >
                <Input placeholder="https://image1.jpg, https://image2.jpg" />
            </Form.Item>

            <Form.Item
                label="Удобства (через запятую)"
                name="amenities"
                getValueFromEvent={e => typeof e === 'string' ? e.split(',').map((s: string) => s.trim()).filter(Boolean) : e}
                getValueProps={v => ({ value: Array.isArray(v) ? v.join(', ') : v })}
            >
                <Input placeholder="Wi-Fi, Парковка, Кондиционер" />
            </Form.Item>
        </Form>
    );

    return (
        <Card bordered={false} styles={{ body: { padding: 24 } }} style={{ borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>
                        <BuildOutlined /> {role === 'admin' ? 'Все объекты' : 'Управление объектами'}
                    </Title>
                    <Text type="secondary">{props.length} объект{props.length === 1 ? '' : props.length < 5 ? 'а' : 'ов'} в базе</Text>
                </div>
                <Button onClick={() => setCreateOpen(true)} type="primary" icon={<PlusOutlined />}>
                    Добавить объект
                </Button>
            </div>

            <Table
                dataSource={props}
                rowKey="id"
                loading={isLoading}
                columns={columns}
                pagination={{ pageSize: 10 }}
            />

            {/* Create modal */}
            <Modal
                title={<Title level={4} style={{ margin: 0 }}>Новый объект недвижимости</Title>}
                open={createOpen}
                onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
                onOk={() => createForm.submit()}
                width={700}
                okText="Создать"
                cancelText="Отмена"
                confirmLoading={createMutation.isPending}
            >
                <PropertyForm form={createForm} onFinish={(vals: any) => createMutation.mutate(vals)} loading={createMutation.isPending} />
            </Modal>

            {/* Edit modal */}
            <Modal
                title={<Space><EditOutlined /> Редактировать объект</Space>}
                open={!!editProp}
                onCancel={() => setEditProp(null)}
                onOk={() => editForm.submit()}
                width={700}
                okText="Сохранить"
                cancelText="Отмена"
                confirmLoading={updateMutation.isPending}
            >
                <PropertyForm
                    form={editForm}
                    onFinish={(vals: any) => updateMutation.mutate({ id: editProp.id, data: vals })}
                    loading={updateMutation.isPending}
                    isEdit
                />
            </Modal>
        </Card>
    );
}
