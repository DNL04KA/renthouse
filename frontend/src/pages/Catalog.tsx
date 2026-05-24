import { useState, useEffect } from 'react';
import { Typography, Row, Col, Card, Input, Slider, Select, Tag, Space, Button, Layout, Spin, Empty, Segmented } from 'antd';
import { FilterOutlined, BuildOutlined, HomeOutlined, ShopOutlined, BarsOutlined, GlobalOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { publicApiClient } from '../api/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PublicHeader } from '../components/PublicHeader';
import { PropertyMap } from '../components/PropertyMap';

const { Title, Text } = Typography;
const { Sider, Content } = Layout;

const TYPE_LABELS: Record<string, string> = {
    flat: 'Квартира', office: 'Офис', warehouse: 'Склад', other: 'Другое',
};

function SidebarDivider() {
    return <div style={{ background: '#e2e8f0', height: 1, width: '100%', margin: '16px 0' }} />;
}

export function Catalog() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [listingType, setListingType] = useState<'rent' | 'sale'>(
        (searchParams.get('listing_type') as 'rent' | 'sale') || 'rent'
    );
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [city, setCity] = useState(searchParams.get('city') || '');
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
    const [rooms, setRooms] = useState<number | undefined>(undefined);
    const [type, setType] = useState<string | undefined>(undefined);
    const [displayCurrency, setDisplayCurrency] = useState('BYN');

    // Курсы валют
    const EXCHANGE_RATES: Record<string, number> = {
        'BYN': 1,
        'USD': 0.32,
        'EUR': 0.34,
        'RUB': 30,
    };

    const convertPrice = (price: number, fromCurrency: string, toCurrency: string) => {
        const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
        const toRate = EXCHANGE_RATES[toCurrency] || 1;
        return (price / fromRate) * toRate;
    };

    useEffect(() => {
        if (listingType === 'sale') setPriceRange([0, 500000]);
        else setPriceRange([0, 5000]);
    }, [listingType]);

    useEffect(() => {
        const c = searchParams.get('city');
        if (c) setCity(c);
    }, [searchParams]);

    const maxPrice = listingType === 'sale' ? 500000 : 10000;
    const priceStep = listingType === 'sale' ? 5000 : 100;

    const { data = [], isLoading } = useQuery({
        queryKey: ['public-props', listingType, city, priceRange, rooms, type],
        queryFn: () => publicApiClient.get('/public/properties', {
            params: {
                listing_type: listingType,
                city: city || undefined,
                min_price: priceRange[0] || undefined,
                max_price: priceRange[1] < maxPrice ? priceRange[1] : undefined,
                rooms,
                type,
            },
        }).then(r => r.data),
    });

    const props = data as any[];

    const handleReset = () => {
        setCity('');
        setPriceRange(listingType === 'sale' ? [0, 500000] : [0, 5000]);
        setRooms(undefined);
        setType(undefined);
    };

    const getPrice = (p: any) =>
        listingType === 'sale' && p.sale_price
            ? `${Number(convertPrice(p.sale_price, p.currency || 'BYN', displayCurrency)).toLocaleString()} ${displayCurrency}`
            : `${Number(convertPrice(p.base_rent, p.currency || 'BYN', displayCurrency)).toLocaleString()} ${displayCurrency}/мес`;

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
            <PublicHeader />

            {/* Top controls */}
            <div style={{ padding: '20px 48px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <Space size="middle">
                    <Segmented
                        size="large"
                        value={listingType}
                        onChange={v => setListingType(v as 'rent' | 'sale')}
                        options={[
                            { label: <Space><HomeOutlined />Аренда</Space>, value: 'rent' },
                            { label: <Space><ShopOutlined />Продажа</Space>, value: 'sale' },
                        ]}
                        style={{ background: '#e2e8f0' }}
                    />
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        {listingType === 'rent' ? 'Объекты для аренды' : 'Объекты на продажу'}
                    </Text>
                </Space>

                <Segmented
                    value={viewMode}
                    onChange={v => setViewMode(v as 'list' | 'map')}
                    options={[
                        { label: <Space><BarsOutlined />Список</Space>, value: 'list' },
                        { label: <Space><GlobalOutlined />Карта</Space>, value: 'map' },
                    ]}
                />
            </div>

            <Layout style={{ padding: '20px 48px 40px', background: 'transparent' }}>
                {/* Sidebar filters */}
                <Sider
                    width={260}
                    style={{
                        background: 'white',
                        borderRadius: 20,
                        padding: 20,
                        marginRight: 24,
                        height: 'fit-content',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                        flexShrink: 0,
                    }}
                >
                    <Title level={5} style={{ margin: 0 }}><FilterOutlined /> Фильтры</Title>
                    <SidebarDivider />

                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        <div>
                            <Text strong style={{ fontSize: 13 }}>Город</Text>
                            <Input
                                placeholder="Например: Минск"
                                style={{ marginTop: 8 }}
                                allowClear
                                value={city}
                                onChange={e => setCity(e.target.value)}
                            />
                        </div>

                        <div>
                            <Text strong style={{ fontSize: 13 }}>
                                {listingType === 'sale' ? 'Цена продажи' : 'Цена аренды'}, BYN
                            </Text>
                            <Slider
                                range
                                max={maxPrice}
                                step={priceStep}
                                value={priceRange}
                                onChange={(val: number[]) => setPriceRange(val as [number, number])}
                                style={{ marginTop: 16 }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>{priceRange[0].toLocaleString()}</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>{priceRange[1].toLocaleString()}</Text>
                            </div>
                        </div>

                        <div>
                            <Text strong style={{ fontSize: 13 }}>Валюта</Text>
                            <Select
                                style={{ width: '100%', marginTop: 8 }}
                                value={displayCurrency}
                                onChange={setDisplayCurrency}
                                options={[
                                    { label: '🇧🇾 BYN', value: 'BYN' },
                                    { label: '🇺🇸 USD', value: 'USD' },
                                    { label: '🇪🇺 EUR', value: 'EUR' },
                                    { label: '🇷🇺 RUB', value: 'RUB' },
                                ]}
                            />
                        </div>

                        <div>
                            <Text strong style={{ fontSize: 13 }}>Тип недвижимости</Text>
                            <Select
                                style={{ width: '100%', marginTop: 8 }}
                                placeholder="Любой"
                                allowClear
                                value={type}
                                onChange={val => setType(val)}
                                options={[
                                    { value: 'flat', label: 'Квартира' },
                                    { value: 'office', label: 'Офис' },
                                    { value: 'warehouse', label: 'Склад' },
                                    { value: 'other', label: 'Другое' },
                                ]}
                            />
                        </div>

                        <div>
                            <Text strong style={{ fontSize: 13 }}>Комнат</Text>
                            <Select
                                style={{ width: '100%', marginTop: 8 }}
                                placeholder="Любое"
                                allowClear
                                value={rooms}
                                onChange={val => setRooms(val)}
                                options={[
                                    { value: 1, label: '1 комната' },
                                    { value: 2, label: '2 комнаты' },
                                    { value: 3, label: '3 комнаты' },
                                    { value: 4, label: '4+ комнат' },
                                ]}
                            />
                        </div>

                        <Button block onClick={handleReset} style={{ borderRadius: 10 }}>
                            Сбросить фильтры
                        </Button>
                    </Space>
                </Sider>

                {/* Content */}
                <Content>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <Title level={3} style={{ margin: 0 }}>
                                {isLoading ? 'Поиск...' : `${listingType === 'rent' ? 'Аренда' : 'Продажа'} — ${props.length} объект${props.length === 1 ? '' : props.length < 5 ? 'а' : 'ов'}`}
                            </Title>
                            <Text type="secondary" style={{ fontSize: 13 }}>Просматривайте без регистрации</Text>
                        </div>
                    </div>

                    {isLoading ? (
                        <div style={{ padding: 100, textAlign: 'center' }}><Spin size="large" /></div>
                    ) : viewMode === 'map' ? (
                        <PropertyMap properties={props} height={580} />
                    ) : props.length > 0 ? (
                        <Row gutter={[20, 20]}>
                            {props.map((p: any) => (
                                <Col xs={24} sm={24} md={12} lg={12} xl={8} key={p.id}>
                                    <Card
                                        hoverable
                                        onClick={() => navigate(`/properties/${p.id}`)}
                                        style={{ borderRadius: 16, overflow: 'hidden', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
                                        cover={
                                            <div style={{ height: 200, overflow: 'hidden', position: 'relative' }}>
                                                {p.images?.[0] ? (
                                                    <img
                                                        alt="property"
                                                        src={p.images[0]}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                                                    />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <BuildOutlined style={{ fontSize: 52, color: '#cbd5e1' }} />
                                                    </div>
                                                )}
                                                <div style={{
                                                    position: 'absolute', top: 12, left: 12,
                                                    background: p.listing_type === 'sale' ? '#7c3aed' : '#2563eb',
                                                    color: '#fff', padding: '3px 10px', borderRadius: 100,
                                                    fontSize: 12, fontWeight: 600,
                                                }}>
                                                    {p.listing_type === 'sale' ? 'Продажа' : 'Аренда'}
                                                </div>
                                                {p.images?.length > 1 && (
                                                    <div style={{
                                                        position: 'absolute', bottom: 10, right: 10,
                                                        background: 'rgba(0,0,0,0.55)', color: '#fff',
                                                        padding: '2px 8px', borderRadius: 100, fontSize: 11,
                                                    }}>
                                                        {p.images.length} фото
                                                    </div>
                                                )}
                                            </div>
                                        }
                                        styles={{ body: { padding: '14px 16px' } }}
                                    >
                                        <Space direction="vertical" style={{ width: '100%' }} size={6}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text strong style={{ fontSize: '1.15rem', color: p.listing_type === 'sale' ? '#7c3aed' : '#2563eb' }}>
                                                    {getPrice(p)}
                                                </Text>
                                                <Tag color="green" style={{ margin: 0 }}>Свободно</Tag>
                                            </div>
                                            <Text strong style={{ fontSize: 14, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {p.city}, {p.street}, {p.house}
                                            </Text>
                                            <div style={{ height: 1, background: '#f1f5f9' }} />
                                            <Space style={{ fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
                                                <Tag style={{ margin: 0, fontSize: 11 }}>{TYPE_LABELS[p.type] || p.type}</Tag>
                                                {p.rooms && <span><HomeOutlined /> {p.rooms} комн.</span>}
                                                <span><BuildOutlined /> {p.area} м²</span>
                                                {p.floor && <span>{p.floor}/{p.total_floors} эт.</span>}
                                            </Space>
                                        </Space>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    ) : (
                        <Empty
                            description={`Нет объектов для ${listingType === 'rent' ? 'аренды' : 'продажи'} по вашим фильтрам`}
                            style={{ padding: 80 }}
                        />
                    )}
                </Content>
            </Layout>
        </div>
    );
}
