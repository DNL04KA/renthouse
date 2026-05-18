import { Form, Input, Button, Card, message, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { apiClient } from '../api/client';
import { useNavigate, Link } from 'react-router-dom';

const { Title, Text } = Typography;

export function Login() {
    const navigate = useNavigate();

    const onFinish = async (vals: any) => {
        try {
            const form = new URLSearchParams();
            form.append('username', vals.username);
            form.append('password', vals.password);
            const res = await apiClient.post('/auth/login', form);
            localStorage.setItem('token', res.data.access_token);
            window.location.href = '/app/dashboard';
        } catch {
            message.error('Неверный логин или пароль');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 50%, #f0fdf4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 16px',
        }}>
            {/* Back arrow — top-left */}
            <div style={{ position: 'fixed', top: 24, left: 24 }}>
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/')}
                    type="text"
                    style={{ fontSize: 15, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                    На главную
                </Button>
            </div>

            <div style={{ width: '100%', maxWidth: 420 }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <Link to="/">
                        <Title level={3} style={{ color: '#2563eb', margin: 0 }}>RentHouse</Title>
                    </Link>
                    <Text type="secondary">Войдите в свой аккаунт</Text>
                </div>

                <Card style={{ borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: 'none' }}>
                    <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
                        <Form.Item name="username" label="Логин" rules={[{ required: true, message: 'Введите логин' }]}>
                            <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="Ваш логин" size="large" />
                        </Form.Item>
                        <Form.Item name="password" label="Пароль" rules={[{ required: true, message: 'Введите пароль' }]}>
                            <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="Ваш пароль" size="large" />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" block size="large" style={{ marginTop: 8 }}>
                            Войти
                        </Button>
                    </Form>

                    <div style={{ marginTop: 20, textAlign: 'center' }}>
                        <Space split={<Text type="secondary">·</Text>}>
                            <Link to="/register" style={{ color: '#2563eb' }}>Создать аккаунт</Link>
                            <Link to="/catalog" style={{ color: '#64748b' }}>Смотреть объекты</Link>
                        </Space>
                    </div>
                </Card>
            </div>
        </div>
    );
}
