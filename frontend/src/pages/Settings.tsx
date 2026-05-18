import { useState } from 'react';
import { Card, Typography, message, Switch, Space, Alert } from 'antd';
import { BellOutlined, SafetyOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export function Settings() {
    const [notifications, setNotifications] = useState(() => {
        try { return JSON.parse(localStorage.getItem('notif_settings') || '{}'); } catch { return {}; }
    });

    const saveNotif = (key: string, val: boolean) => {
        const updated = { ...notifications, [key]: val };
        setNotifications(updated);
        localStorage.setItem('notif_settings', JSON.stringify(updated));
        message.success('Настройки сохранены');
    };

    return (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <Title level={3} style={{ marginBottom: 24 }}>Настройки</Title>

            <Card
                style={{ borderRadius: 16, marginBottom: 24 }}
                title={<Space><BellOutlined /> Уведомления</Space>}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {[
                        { key: 'payments', label: 'Напоминания об оплате', desc: 'Уведомления о предстоящих платежах' },
                        { key: 'contracts', label: 'Истечение договоров', desc: 'Уведомления об окончании договоров аренды' },
                        { key: 'messages', label: 'Новые сообщения', desc: 'Уведомления о входящих сообщениях' },
                    ].map(({ key, label, desc }) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <Text strong>{label}</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>{desc}</Text>
                            </div>
                            <Switch
                                checked={notifications[key] !== false}
                                onChange={v => saveNotif(key, v)}
                            />
                        </div>
                    ))}
                </div>
            </Card>

            <Card
                style={{ borderRadius: 16 }}
                title={<Space><SafetyOutlined /> Безопасность</Space>}
            >
                <Alert
                    message="Ваши данные защищены"
                    description="Пароли хранятся в зашифрованном виде. Мы никогда не запрашиваем ваш пароль по электронной почте."
                    type="info"
                    showIcon
                />
            </Card>
        </div>
    );
}
