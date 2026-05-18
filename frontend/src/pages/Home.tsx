import { Typography, Input, Button, Row, Col, Card, Tag, Space, Divider } from 'antd';
import { SearchOutlined, EnvironmentOutlined, HomeOutlined, BuildOutlined, SafetyOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { publicApiClient } from '../api/client';
import { PublicHeader } from '../components/PublicHeader';

const { Title, Text, Paragraph } = Typography;

const TYPE_LABELS: Record<string, string> = {
    flat: 'Квартира', office: 'Офис', warehouse: 'Склад', other: 'Другое',
};

export function Home() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');

    const { data: featured } = useQuery({
        queryKey: ['public-featured'],
        queryFn: () => publicApiClient.get('/public/properties').then(r => r.data),
    });

    const handleSearch = () => navigate(`/catalog${search ? `?city=${encodeURIComponent(search)}` : ''}`);

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
            <PublicHeader />

            {/* Hero */}
            <div
                className="hero-section"
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80')` }}
            >
                <div className="hero-overlay" />
                <div className="hero-content">
                    <h1 className="fade-in">Найдите идеальное место для жизни</h1>
                    <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.15rem', marginBottom: 40 }} className="fade-in">
                        Проверенные объекты от собственников. Без посредников, без регистрации для просмотра.
                    </Paragraph>
                    <div className="search-container fade-in">
                        <Input
                            prefix={<EnvironmentOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="В каком городе ищем?"
                            size="large"
                            variant="borderless"
                            style={{ flex: 1 }}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onPressEnter={handleSearch}
                        />
                        <Divider type="vertical" style={{ height: 32 }} />
                        <Button type="primary" size="large" icon={<SearchOutlined />} onClick={handleSearch}>
                            Найти
                        </Button>
                    </div>
                </div>
            </div>

            {/* Featured */}
            <div style={{ padding: '60px 48px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
                    <div>
                        <Title level={2} style={{ margin: 0 }}>Свободные объекты</Title>
                        <Text type="secondary">Актуальные предложения — просматривайте без регистрации</Text>
                    </div>
                    <Button onClick={() => navigate('/catalog')}>Смотреть все</Button>
                </div>

                <Row gutter={[24, 24]}>
                    {featured?.slice(0, 4).map((p: any) => (
                        <Col xs={24} sm={12} md={8} lg={6} key={p.id}>
                            <Card
                                hoverable
                                className="fade-in"
                                cover={
                                    <div style={{ height: 200, overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
                                        <img
                                            alt="property"
                                            src={p.images?.[0] || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                }
                                onClick={() => navigate(`/properties/${p.id}`)}
                            >
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text strong style={{ fontSize: '1.2rem', color: p.listing_type === 'sale' ? '#7c3aed' : '#2563eb' }}>
                                            {p.listing_type === 'sale' && p.sale_price
                                                ? `${Number(p.sale_price).toLocaleString()} BYN`
                                                : `${Number(p.base_rent).toLocaleString()} BYN/мес`}
                                        </Text>
                                        <Space size={4}>
                                            {p.listing_type === 'sale' && <Tag color="purple" style={{ margin: 0 }}>Продажа</Tag>}
                                            <Tag color="blue" style={{ margin: 0 }}>{TYPE_LABELS[p.type] || p.type}</Tag>
                                        </Space>
                                    </div>
                                    <Title level={5} style={{ margin: 0 }}>{p.city}, {p.street}</Title>
                                    <Space size="middle" style={{ color: '#64748b', fontSize: '0.9rem' }}>
                                        <span><BuildOutlined /> {p.area} м²</span>
                                        {p.rooms && <span><HomeOutlined /> {p.rooms} комн.</span>}
                                    </Space>
                                </Space>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {!featured?.length && (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                        <Title level={4} style={{ color: '#94a3b8' }}>Объекты загружаются...</Title>
                    </div>
                )}
            </div>

            {/* Why us */}
            <div style={{ padding: '60px 48px', background: 'white' }}>
                <Row gutter={48} align="middle">
                    <Col xs={24} md={12}>
                        <img
                            src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                            style={{ width: '100%', borderRadius: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
                            alt="about"
                        />
                    </Col>
                    <Col xs={24} md={12}>
                        <Title level={2}>Почему выбирают RentHouse?</Title>
                        <Space direction="vertical" size="large" style={{ marginTop: 24 }}>
                            <div>
                                <Title level={4}><HomeOutlined style={{ color: '#2563eb' }} /> Прямая аренда</Title>
                                <Text type="secondary">Общайтесь напрямую с собственниками без скрытых комиссий.</Text>
                            </div>
                            <div>
                                <Title level={4}><SafetyOutlined style={{ color: '#2563eb' }} /> Прозрачные договоры</Title>
                                <Text type="secondary">Автоматический график платежей и контроль задолженности.</Text>
                            </div>
                            <div>
                                <Title level={4}><TeamOutlined style={{ color: '#2563eb' }} /> Личный кабинет</Title>
                                <Text type="secondary">Оплата аренды, история платежей и документы — всё в одном месте после регистрации.</Text>
                            </div>
                        </Space>
                        <Space style={{ marginTop: 32 }}>
                            <Button type="primary" size="large" onClick={() => navigate('/catalog')}>Смотреть каталог</Button>
                            <Button size="large" onClick={() => navigate('/register')}>Зарегистрироваться</Button>
                        </Space>
                    </Col>
                </Row>
            </div>

            <div style={{ textAlign: 'center', padding: '40px', background: '#0f172a', color: 'rgba(255,255,255,0.6)' }}>
                <Title level={4} style={{ color: 'white', margin: 0 }}>RentHouse</Title>
                <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>© 2026 Система управления арендой. Все права защищены.</Paragraph>
            </div>
        </div>
    );
}
