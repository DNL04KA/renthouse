import { useState } from 'react';
import { Card, Typography, Tag, Spin, Button, Row, Col, Space, Avatar, Modal, Form, Input, message as antMsg, Select, Result, Divider } from 'antd';
import {
    BuildOutlined, EnvironmentOutlined, PhoneOutlined, UserOutlined,
    CheckCircleOutlined, LoginOutlined, HomeOutlined, LockOutlined, MessageOutlined, LeftOutlined,
    FormOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { publicApiClient, apiClient } from '../api/client';
import { useParams, useNavigate } from 'react-router-dom';
import { PublicHeader } from '../components/PublicHeader';
import { PropertyMap } from '../components/PropertyMap';

const { Title, Text, Paragraph } = Typography;

const TYPE_LABELS: Record<string, string> = {
    flat: 'Квартира', office: 'Офис', warehouse: 'Склад', other: 'Другое',
};

const EXCHANGE_RATES: Record<string, number> = {
    BYN: 1, USD: 0.32, EUR: 0.29, RUB: 30,
};

function convertPrice(price: number, from: string, to: string): number {
    const fromRate = EXCHANGE_RATES[from] ?? 1;
    const toRate = EXCHANGE_RATES[to] ?? 1;
    return Math.round((price / fromRate) * toRate);
}

export function PublicPropertyDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [inquiryOpen, setInquiryOpen] = useState(false);
    const [messageOpen, setMessageOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [inquiryForm] = Form.useForm();
    const [messageForm] = Form.useForm();
    const [displayCurrency, setDisplayCurrency] = useState('BYN');
    const [activeImage, setActiveImage] = useState(0);
    const isAuth = !!localStorage.getItem('token');

    const { data: prop, isLoading, isError } = useQuery({
        queryKey: ['public-property', id],
        queryFn: () => publicApiClient.get(`/public/properties/${id}`).then(r => r.data),
        enabled: !!id,
    });

    const inquiryMutation = useMutation({
        mutationFn: (vals: any) => {
            const text = `Имя: ${vals.name}\nТелефон: ${vals.phone}\n\nКомментарий: ${vals.comment}`;
            return apiClient.post('/conversations', { property_id: id, initial_message: text });
        },
        onSuccess: () => {
            setInquiryOpen(false);
            inquiryForm.resetFields();
            setSubmitted(true);
        },
        onError: (e: any) => {
            const detail = e.response?.data?.detail || '';
            if (detail.includes('already exists')) {
                antMsg.warning('У вас уже есть заявка по этому объекту');
                setInquiryOpen(false);
            } else {
                antMsg.error(detail || 'Ошибка отправки');
            }
        },
    });

    const messageMutation = useMutation({
        mutationFn: (vals: any) =>
            apiClient.post('/conversations', { property_id: id, initial_message: vals.message }),
        onSuccess: () => {
            setMessageOpen(false);
            messageForm.resetFields();
            antMsg.success('Сообщение отправлено! Перейдите в раздел «Сообщения».');
        },
        onError: (e: any) => {
            const detail = e.response?.data?.detail || '';
            if (detail.includes('already exists')) {
                antMsg.warning('У вас уже есть переписка по этому объекту');
                setMessageOpen(false);
            } else {
                antMsg.error(detail || 'Ошибка отправки');
            }
        },
    });

    if (isLoading) {
        return (
            <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
                <PublicHeader />
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                    <Spin size="large" />
                </div>
            </div>
        );
    }

    if (isError || !prop) {
        return (
            <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
                <PublicHeader />
                <div style={{ padding: 48, textAlign: 'center' }}>
                    <Title level={4}>Объект не найден или уже занят</Title>
                    <Button type="primary" onClick={() => navigate('/catalog')}>Вернуться в каталог</Button>
                </div>
            </div>
        );
    }

    const images: string[] = Array.isArray(prop.images) && prop.images.length > 0
        ? prop.images
        : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80'];

    const isSale = prop.listing_type === 'sale';
    const displayPrice = isSale && prop.sale_price
        ? `${convertPrice(Number(prop.sale_price), String(prop.currency || 'BYN'), displayCurrency).toLocaleString()} ${displayCurrency}`
        : `${convertPrice(Number(prop.base_rent), String(prop.currency || 'BYN'), displayCurrency).toLocaleString()} ${displayCurrency}/мес`;

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
            <PublicHeader />

            <div style={{ padding: '24px 48px 48px' }}>
                <Button icon={<LeftOutlined />} onClick={() => navigate('/catalog')} style={{ marginBottom: 20 }}>
                    Назад в каталог
                </Button>

                <Row gutter={[32, 32]}>
                    {/* Left column */}
                    <Col xs={24} lg={16}>
                        {/* Image gallery */}
                        <Card
                            bordered={false}
                            style={{ borderRadius: 20, overflow: 'hidden', padding: 0 }}
                            styles={{ body: { padding: 0 } }}
                        >
                            <div style={{ position: 'relative', height: 420, overflow: 'hidden', background: '#e2e8f0' }}>
                                <img
                                    src={images[activeImage]}
                                    alt="property"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80'; }}
                                />
                                <div style={{ position: 'absolute', top: 12, left: 12 }}>
                                    <Tag color={isSale ? 'purple' : 'blue'} style={{ fontSize: 13, padding: '4px 12px' }}>
                                        {isSale ? 'Продажа' : 'Аренда'}
                                    </Tag>
                                </div>
                                {images.length > 1 && (
                                    <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>
                                        {activeImage + 1} / {images.length}
                                    </div>
                                )}
                            </div>
                            {images.length > 1 && (
                                <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto' }}>
                                    {images.map((img, i) => (
                                        <div
                                            key={i}
                                            onClick={() => setActiveImage(i)}
                                            style={{
                                                width: 80, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                                                cursor: 'pointer', border: i === activeImage ? '2px solid #2563eb' : '2px solid transparent',
                                            }}
                                        >
                                            <img
                                                src={img} alt=""
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=120&q=60'; }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>

                        {/* Title and address */}
                        <div style={{ marginTop: 24, marginBottom: 16 }}>
                            <Title level={2} style={{ margin: 0 }}>
                                {prop.rooms ? `${prop.rooms}-комнатная ` : ''}{TYPE_LABELS[prop.type] || prop.type}
                            </Title>
                            <Space size="large" style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 8, flexWrap: 'wrap' }}>
                                <span><EnvironmentOutlined /> {prop.city}, {prop.street}, {prop.house}</span>
                                <span><BuildOutlined /> {prop.area} м²</span>
                                {prop.floor && <span><HomeOutlined /> {prop.floor}/{prop.total_floors} эт.</span>}
                            </Space>
                        </div>

                        <div style={{ height: 1, background: '#e2e8f0', marginBottom: 20 }} />

                        {/* Description */}
                        {prop.description && (
                            <div style={{ marginBottom: 24 }}>
                                <Title level={4} style={{ marginBottom: 8 }}>Описание</Title>
                                <Paragraph style={{ fontSize: '1rem', lineHeight: '1.8', color: '#475569' }}>
                                    {prop.description}
                                </Paragraph>
                            </div>
                        )}

                        {/* Amenities */}
                        {Array.isArray(prop.amenities) && prop.amenities.length > 0 && (
                            <div style={{ marginBottom: 24 }}>
                                <Title level={4} style={{ marginBottom: 12 }}>Удобства</Title>
                                <Row gutter={[12, 12]}>
                                    {prop.amenities.map((a: string, i: number) => (
                                        <Col key={i} xs={12} sm={8}>
                                            <Space>
                                                <CheckCircleOutlined style={{ color: '#2563eb' }} />
                                                <Text>{a}</Text>
                                            </Space>
                                        </Col>
                                    ))}
                                </Row>
                            </div>
                        )}

                        {/* Map */}
                        {prop.latitude && prop.longitude && (
                            <div style={{ marginTop: 24 }}>
                                <PropertyMap
                                    latitude={Number(prop.latitude)}
                                    longitude={Number(prop.longitude)}
                                    address={`${prop.city}, ${prop.street}, ${prop.house}`}
                                    title="📍 Местоположение"
                                    height={300}
                                />
                            </div>
                        )}
                    </Col>

                    {/* Right sidebar */}
                    <Col xs={24} lg={8}>
                        <div style={{ position: 'sticky', top: 88 }}>
                            <Card bordered={false} style={{ borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                                {/* Price */}
                                <div style={{ marginBottom: 20 }}>
                                    <Text type="secondary" style={{ fontSize: 13 }}>
                                        {isSale ? 'Цена продажи' : 'Аренда в месяц'}
                                    </Text>
                                    <div style={{ marginTop: 8, marginBottom: 12 }}>
                                        <Select
                                            value={displayCurrency}
                                            onChange={setDisplayCurrency}
                                            options={[
                                                { label: '🇧🇾 BYN', value: 'BYN' },
                                                { label: '🇺🇸 USD', value: 'USD' },
                                                { label: '🇪🇺 EUR', value: 'EUR' },
                                                { label: '🇷🇺 RUB', value: 'RUB' },
                                            ]}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <Title level={2} style={{ margin: 0, color: isSale ? '#7c3aed' : '#2563eb' }}>
                                        {displayPrice}
                                    </Title>
                                    <Space style={{ marginTop: 8 }}>
                                        <Tag color={isSale ? 'purple' : 'blue'}>{isSale ? 'Продажа' : 'Аренда'}</Tag>
                                        <Tag color="green">Свободно</Tag>
                                    </Space>
                                </div>

                                {/* Owner */}
                                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 14, marginBottom: 20 }}>
                                    <Space size="middle" align="center">
                                        <Avatar size={48} icon={<UserOutlined />} style={{ backgroundColor: '#2563eb' }} />
                                        <div>
                                            <Text strong>{prop.owner?.name || 'Собственник'}</Text>
                                            <br />
                                            <Tag color="blue" style={{ marginTop: 4, fontSize: 11 }}>Владелец</Tag>
                                        </div>
                                    </Space>
                                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <PhoneOutlined style={{ color: '#64748b' }} />
                                        {isAuth ? (
                                            <Text>{prop.owner?.phone || 'Нет данных'}</Text>
                                        ) : (
                                            <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 12 }}>
                                                Войдите чтобы увидеть номер
                                            </Text>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                {isAuth ? (
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Button
                                            type="primary"
                                            size="large"
                                            block
                                            icon={<MessageOutlined />}
                                            style={{ height: 46, fontSize: '1rem', background: isSale ? '#7c3aed' : undefined, borderColor: isSale ? '#7c3aed' : undefined }}
                                            onClick={() => setMessageOpen(true)}
                                        >
                                            Написать владельцу
                                        </Button>
                                        <Button block icon={<PhoneOutlined />} onClick={() => setAuthModalOpen(true)}>
                                            Показать телефон
                                        </Button>
                                    </Space>
                                ) : (
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Button
                                            type="primary"
                                            size="large"
                                            block
                                            icon={<LockOutlined />}
                                            style={{ height: 46, fontSize: '1rem' }}
                                            onClick={() => setAuthModalOpen(true)}
                                        >
                                            Войти для связи
                                        </Button>
                                        <Button block onClick={() => navigate('/register')}>
                                            Нет аккаунта? Зарегистрироваться
                                        </Button>
                                    </Space>
                                )}
                            </Card>

                            <Card bordered={false} style={{ marginTop: 16, borderRadius: 20, background: '#eff6ff', border: 'none' }}>
                                <Title level={5} style={{ marginBottom: 8 }}>Советы по безопасности</Title>
                                <Paragraph type="secondary" style={{ fontSize: '0.85rem', margin: 0 }}>
                                    • Не переводите предоплату до просмотра.<br />
                                    • Требуйте договор аренды.<br />
                                    • Проверяйте документы собственника.
                                </Paragraph>
                            </Card>
                        </div>
                    </Col>
                </Row>
            </div>

            {/* Inquiry modal */}
            <Modal
                open={inquiryOpen}
                onCancel={() => { setInquiryOpen(false); inquiryForm.resetFields(); }}
                onOk={() => inquiryForm.submit()}
                okText="Отправить заявку"
                title={<Space><FormOutlined /> Заявка на аренду</Space>}
                confirmLoading={inquiryMutation.isPending}
                width={480}
            >
                <div style={{ background: '#f0f9ff', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                    <Text strong><HomeOutlined /> {prop.city}, {prop.street} {prop.house}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {displayPrice} · {prop.area} м²
                    </Text>
                </div>
                <Form form={inquiryForm} layout="vertical" onFinish={vals => inquiryMutation.mutate(vals)}>
                    <Form.Item
                        name="name"
                        label="Ваше имя"
                        rules={[{ required: true, message: 'Введите ваше имя' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Иван Иванов" />
                    </Form.Item>
                    <Form.Item
                        name="phone"
                        label="Контактный телефон"
                        rules={[
                            { required: true, message: 'Введите номер телефона' },
                            { pattern: /^\+?[\d\s\-()]{7,}$/, message: 'Неверный формат' },
                        ]}
                    >
                        <Input prefix={<PhoneOutlined />} placeholder="+375 (29) 123-45-67" />
                    </Form.Item>
                    <Form.Item
                        name="comment"
                        label="Комментарий / требования"
                        rules={[{ required: true, message: 'Опишите ваши требования' }]}
                        initialValue="Здравствуйте! Меня интересует данный объект. Прошу сообщить об актуальности и условиях аренды."
                    >
                        <Input.TextArea rows={4} maxLength={500} showCount placeholder="Опишите ваши пожелания..." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Success confirmation modal */}
            <Modal
                open={submitted}
                onCancel={() => setSubmitted(false)}
                footer={
                    <Space>
                        <Button onClick={() => { setSubmitted(false); navigate('/app/messages'); }} type="primary">
                            Перейти в сообщения
                        </Button>
                        <Button onClick={() => setSubmitted(false)}>Закрыть</Button>
                    </Space>
                }
                centered
                width={420}
                closable={false}
            >
                <Result
                    status="success"
                    title="Заявка отправлена!"
                    subTitle="Арендодатель получил вашу заявку и свяжется с вами в ближайшее время. Вы также можете следить за перепиской в разделе «Сообщения»."
                />
            </Modal>

            {/* Auth / contact modal */}
            <Modal
                open={authModalOpen}
                onCancel={() => setAuthModalOpen(false)}
                footer={null}
                centered
                width={400}
            >
                {isAuth ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <PhoneOutlined style={{ fontSize: 40, color: '#2563eb', marginBottom: 16 }} />
                        <Title level={4}>Контакт владельца</Title>
                        <Text style={{ fontSize: 18 }}>{prop.owner?.phone || 'Не указан'}</Text>
                        <br />
                        <Text type="secondary">{prop.owner?.name || 'Собственник'}</Text>
                        <div style={{ marginTop: 24 }}>
                            <Button type="primary" block onClick={() => navigate('/app/contracts')}>
                                Перейти к договорам
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <LockOutlined style={{ fontSize: 40, color: '#2563eb', marginBottom: 16 }} />
                        <Title level={4}>Войдите чтобы продолжить</Title>
                        <Paragraph type="secondary">
                            Для связи с владельцем нужен аккаунт. Просматривать объекты можно без регистрации.
                        </Paragraph>
                        <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
                            <Button type="primary" block size="large" icon={<LoginOutlined />} onClick={() => navigate('/login')}>
                                Войти в аккаунт
                            </Button>
                            <Button block size="large" onClick={() => navigate('/register')}>
                                Создать аккаунт
                            </Button>
                        </Space>
                    </div>
                )}
            </Modal>

            {/* Simple message modal */}
            <Modal
                open={messageOpen}
                onCancel={() => { setMessageOpen(false); messageForm.resetFields(); }}
                onOk={() => messageForm.submit()}
                okText="Отправить"
                title={<Space><MessageOutlined /> Написать владельцу</Space>}
                confirmLoading={messageMutation.isPending}
            >
                <div style={{ background: '#f0f9ff', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                    <Text strong><HomeOutlined /> {prop.city}, {prop.street} {prop.house}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Владелец: {prop.owner?.name || 'Собственник'} · {displayPrice}
                    </Text>
                </div>
                <Form
                    form={messageForm}
                    layout="vertical"
                    onFinish={vals => messageMutation.mutate(vals)}
                >
                    <Form.Item
                        name="message"
                        label="Сообщение"
                        rules={[{ required: true, message: 'Напишите сообщение' }]}
                        initialValue="Здравствуйте! Меня интересует данный объект. Подскажите, пожалуйста, актуальна ли аренда?"
                    >
                        <Input.TextArea rows={4} maxLength={500} showCount />
                    </Form.Item>
                </Form>
                <Divider plain style={{ color: '#94a3b8', fontSize: 12 }}>или</Divider>
                <Button
                    block
                    icon={<FormOutlined />}
                    onClick={() => { setMessageOpen(false); messageForm.resetFields(); setInquiryOpen(true); }}
                >
                    Оставить заявку на аренду
                </Button>
            </Modal>
        </div>
    );
}
