import { Layout, Menu, Avatar, Dropdown, Space, Typography, Button, Badge, Popover, List, Empty, Divider, Spin } from 'antd';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
    HomeOutlined, BuildOutlined, UserOutlined,
    FileTextOutlined, DollarOutlined, LogoutOutlined,
    SettingOutlined, BellOutlined, BarChartOutlined, MessageOutlined, CrownOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import dayjs from 'dayjs';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

export function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    const handleMenu = ({ key }: { key: string }) => {
        if (key === 'logout') {
            localStorage.removeItem('token');
            navigate('/login');
        } else {
            navigate(key);
        }
    };

    let role = 'tenant';
    let username = 'User';
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            role = payload.role;
            username = payload.sub || 'Пользователь';
        } catch (e) { }
    }

    // Notifications: upcoming payments + expiring contracts (landlord/admin only)
    const { data: upcoming, isLoading: upcomingLoading } = useQuery({
        queryKey: ['upcoming-notifications'],
        queryFn: () => apiClient.get('/reports/upcoming?days=7').then(r => r.data),
        enabled: role === 'landlord' || role === 'admin',
        refetchInterval: 60000,
    });

    // Tenant: pending payments due within 7 days
    const { data: tenantPayments = [], isLoading: paymentsLoading } = useQuery({
        queryKey: ['tenant-payments-pending'],
        queryFn: () => apiClient.get('/payments?status=pending').then(r => r.data),
        enabled: role === 'tenant',
        refetchInterval: 60000,
    });

    const notifItems: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }[] = [];

    if (role === 'tenant') {
        const soon = (tenantPayments as any[]).filter(p => {
            const days = dayjs(p.due_date).diff(dayjs(), 'day');
            return days >= 0 && days <= 7;
        });
        soon.forEach(p => {
            const days = dayjs(p.due_date).diff(dayjs(), 'day');
            notifItems.push({
                icon: <DollarOutlined style={{ color: '#f59e0b' }} />,
                title: `Платёж ${p.amount} ${p.currency}`,
                desc: days === 0 ? 'Срок оплаты сегодня' : `Срок через ${days} дн. — ${dayjs(p.due_date).format('DD.MM.YYYY')}`,
                onClick: () => navigate('/app/payments'),
            });
        });
    } else if (upcoming) {
        (upcoming.upcoming_payments ?? []).forEach((p: any) => {
            const days = dayjs(p.due_date).diff(dayjs(), 'day');
            notifItems.push({
                icon: <DollarOutlined style={{ color: '#f59e0b' }} />,
                title: `Платёж ${p.amount} BYN`,
                desc: `${p.property} — через ${days} дн.`,
                onClick: () => navigate('/app/payments'),
            });
        });
        (upcoming.expiring_contracts ?? []).forEach((c: any) => {
            const days = dayjs(c.end_date).diff(dayjs(), 'day');
            notifItems.push({
                icon: <FileTextOutlined style={{ color: '#ef4444' }} />,
                title: `Договор ${c.number} истекает`,
                desc: `${c.tenant} — ${dayjs(c.end_date).format('DD.MM.YYYY')} (через ${days} дн.)`,
                onClick: () => navigate('/app/contracts'),
            });
        });
    }

    const notifContent = (
        <div style={{ width: 320 }}>
            <div style={{ padding: '8px 4px 12px', fontWeight: 600, fontSize: 14 }}>
                Уведомления
            </div>
            <Divider style={{ margin: '0 0 8px' }} />
            {(upcomingLoading || paymentsLoading) ? (
                <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
            ) : notifItems.length === 0 ? (
                <Empty description="Нет новых уведомлений" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '16px 0' }} />
            ) : (
                <List
                    dataSource={notifItems}
                    renderItem={item => (
                        <List.Item
                            style={{ cursor: 'pointer', padding: '10px 4px', borderRadius: 8 }}
                            onClick={item.onClick}
                            className="notif-item-hover"
                        >
                            <List.Item.Meta
                                avatar={<span style={{ fontSize: 20 }}>{item.icon}</span>}
                                title={<span style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</span>}
                                description={<span style={{ fontSize: 12, color: '#64748b' }}>{item.desc}</span>}
                            />
                        </List.Item>
                    )}
                />
            )}
        </div>
    );

    const { data: conversations = [] } = useQuery({
        queryKey: ['conversations'],
        queryFn: () => apiClient.get('/conversations').then(r => r.data),
        enabled: role !== 'admin',
        refetchInterval: 10000,
    });
    const unreadTotal = (conversations as any[]).reduce((s, c) => s + (c.unread_count || 0), 0);

    const menuItems: any[] = [
        { key: '/app/dashboard', icon: <HomeOutlined />, label: 'Обзор' },
    ];
    if (role === 'admin' || role === 'landlord') {
        menuItems.push({
            key: '/app/properties',
            icon: <BuildOutlined />,
            label: role === 'admin' ? 'Все объекты' : 'Мои объекты',
        });
        menuItems.push({ key: '/app/tenants', icon: <UserOutlined />, label: 'Арендаторы' });
    }
    menuItems.push({ key: '/app/contracts', icon: <FileTextOutlined />, label: 'Договоры' });
    menuItems.push({ key: '/app/payments', icon: <DollarOutlined />, label: 'Финансы' });
    if (role !== 'admin') {
        menuItems.push({
            key: '/app/messages',
            icon: unreadTotal > 0
                ? <Badge count={unreadTotal} size="small"><MessageOutlined /></Badge>
                : <MessageOutlined />,
            label: unreadTotal > 0 ? <span>Сообщения <Badge count={unreadTotal} size="small" /></span> : 'Сообщения',
        });
    }
    if (role === 'admin' || role === 'landlord') {
        menuItems.push({ key: '/app/reports', icon: <BarChartOutlined />, label: 'Отчёты' });
    }
    if (role === 'admin') {
        menuItems.push({
            key: '/app/admin',
            icon: <CrownOutlined style={{ color: '#ef4444' }} />,
            label: <span style={{ color: '#ef4444', fontWeight: 600 }}>Администрирование</span>,
        });
    }

    const userMenu = {
        items: [
            { key: 'profile', icon: <UserOutlined />, label: 'Профиль' },
            { key: 'settings', icon: <SettingOutlined />, label: 'Настройки' },
            { type: 'divider' as const },
            { key: 'logout', icon: <LogoutOutlined />, label: 'Выйти', danger: true },
        ],
        onClick: (info: any) => {
            if (info.key === 'logout') {
                handleMenu({ key: 'logout' });
            } else if (info.key === 'profile') {
                navigate('/app/profile');
            } else if (info.key === 'settings') {
                navigate('/app/settings');
            }
        }
    };

    return (
        <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
            <Sider
                theme="light"
                width={260}
                style={{
                    borderRight: '1px solid #e2e8f0',
                    position: 'fixed',
                    height: '100vh',
                    left: 0,
                    top: 0,
                    bottom: 0,
                }}
            >
                <div style={{ padding: '24px', textAlign: 'center' }}>
                    <Link to="/">
                        <Text strong style={{ fontSize: 24, color: '#2563eb' }}>RentHouse</Text>
                    </Link>
                    <div style={{ marginTop: 8 }}>
                        <Tag color={role === 'admin' ? 'red' : role === 'landlord' ? 'blue' : 'green'}>
                            {role === 'admin' ? '👑 Администратор' : role === 'landlord' ? 'Владелец' : 'Арендатор'}
                        </Tag>
                    </div>
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    onClick={handleMenu}
                    items={menuItems}
                    style={{ borderRight: 0, padding: '0 12px' }}
                />
            </Sider>
            <Layout style={{ marginLeft: 260 }}>
                <Header style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(8px)',
                    padding: '0 32px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    borderBottom: '1px solid #e2e8f0',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    width: '100%'
                }}>
                    <Space size="large">
                        <Popover content={notifContent} trigger="click" placement="bottomRight" arrow>
                            <Badge count={notifItems.length} size="small" offset={[-2, 2]}>
                                <Button type="text" icon={<BellOutlined />} style={{ fontSize: 18 }} />
                            </Badge>
                        </Popover>
                        <Dropdown menu={userMenu} placement="bottomRight" arrow>
                            <Space style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 8, transition: 'background 0.3s' }} className="user-dropdown-hover">
                                <Avatar style={{ backgroundColor: '#2563eb' }} icon={<UserOutlined />} />
                                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                    <Text strong style={{ fontSize: 13 }}>{username}</Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
                                </div>
                            </Space>
                        </Dropdown>
                    </Space>
                </Header>
                <Content style={{ padding: '32px' }}>
                    <div className="fade-in">
                        <Outlet />
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
}

function Tag({ children, color }: { children: React.ReactNode, color: string }) {
    return (
        <span style={{
            background: color === 'blue' ? '#eff6ff' : '#f1f5f9',
            color: color === 'blue' ? '#2563eb' : '#475569',
            padding: '4px 12px',
            borderRadius: '100px',
            fontSize: '12px',
            fontWeight: 600
        }}>
            {children}
        </span>
    );
}
