import { Card, Row, Col, Typography, Tag, Button, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export function PublicCatalog() {
    const navigate = useNavigate();
    const { data, isLoading } = useQuery({ queryKey: ['public-props'], queryFn: () => apiClient.get('/properties').then(r => r.data) });

    return (
        <div style={{ padding: '24px 48px', background: '#f0f2f5', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Доступные объекты</Title>
                <div>
                    <Button type="primary" onClick={() => navigate('/login')} style={{ marginRight: 8 }}>Войти</Button>
                    <Button onClick={() => navigate('/register')}>Регистрация</Button>
                </div>
            </div>

            {isLoading ? <Spin size="large" /> : (
                <Row gutter={[16, 16]}>
                    {data?.filter((p: any) => p.status === 'available').map((p: any) => (
                        <Col xs={24} sm={12} md={8} lg={6} key={p.id}>
                            <Card hoverable onClick={() => navigate(`/properties/${p.id}`)} title={`${p.city || 'Город'}, ${p.street || 'Улица'}`} extra={<Tag color="green">Свободно</Tag>}>
                                <Text strong>Тип:</Text> {p.type === 'flat' ? 'Квартира' : p.type === 'office' ? 'Офис' : p.type === 'warehouse' ? 'Склад' : 'Другое'}<br />
                                <Text strong>Площадь:</Text> {p.area} м²<br />
                                <Text strong>Ставка:</Text> <Text type="success" strong>{Number(p.base_rent).toFixed(2)} BYN</Text>
                            </Card>
                        </Col>
                    ))}
                    {(!data || data.length === 0) && <Text>Нет доступных объектов для аренды.</Text>}
                </Row>
            )}
        </div>
    );
}
