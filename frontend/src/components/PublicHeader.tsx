import { Button, Space, Typography } from 'antd';
import { UserOutlined, LoginOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

export function PublicHeader() {
    const navigate = useNavigate();
    const isAuth = !!localStorage.getItem('token');

    return (
        <div style={{
            padding: '0 48px',
            height: 64,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'white',
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
            <div style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                <Text strong style={{ fontSize: 22, color: '#2563eb' }}>RentHouse</Text>
            </div>

            <Space size="middle">
                <Button type="text" onClick={() => navigate('/catalog')}>Каталог</Button>
                {isAuth ? (
                    <Button type="primary" icon={<UserOutlined />} onClick={() => navigate('/app/dashboard')}>
                        Личный кабинет
                    </Button>
                ) : (
                    <>
                        <Button type="text" icon={<LoginOutlined />} onClick={() => navigate('/login')}>
                            Войти
                        </Button>
                        <Button type="primary" onClick={() => navigate('/register')}>
                            Регистрация
                        </Button>
                    </>
                )}
            </Space>
        </div>
    );
}
