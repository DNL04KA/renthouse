import { useState, useRef, useEffect } from 'react';
import {
    Layout, List, Avatar, Badge, Typography, Input, Button, Tag, Empty,
    Space, Modal, Form, DatePicker, InputNumber, Select, message as antMsg, Spin, Tooltip,
} from 'antd';
import {
    SendOutlined, UserOutlined, HomeOutlined, FileTextOutlined,
    CloseCircleOutlined, CheckCircleOutlined, MessageOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

const { Sider, Content } = Layout;
const { Text, Title, Paragraph } = Typography;

const STATUS_COLORS: Record<string, string> = {
    active: 'blue', contracted: 'green', closed: 'default',
};
const STATUS_LABELS: Record<string, string> = {
    active: 'Активна', contracted: 'Договор оформлен', closed: 'Закрыта',
};

function getMyId(): string {
    try {
        const token = localStorage.getItem('token');
        if (!token) return '';
        return JSON.parse(atob(token.split('.')[1])).sub || '';
    } catch { return ''; }
}

function getMyRole(): string {
    try {
        const token = localStorage.getItem('token');
        if (!token) return '';
        return JSON.parse(atob(token.split('.')[1])).role || '';
    } catch { return ''; }
}

export function Messages() {
    const qc = useQueryClient();
    const [activeId, setActiveId] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [contractOpen, setContractOpen] = useState(false);
    const [contractForm] = Form.useForm();
    const bottomRef = useRef<HTMLDivElement>(null);
    const myUsername = getMyId();
    const myRole = getMyRole();

    const { data: conversations = [], isLoading: listLoading } = useQuery({
        queryKey: ['conversations'],
        queryFn: () => apiClient.get('/conversations').then(r => r.data),
        refetchInterval: 5000,
    });

    const { data: activeConv, isLoading: convLoading } = useQuery({
        queryKey: ['conversation', activeId],
        queryFn: () => apiClient.get(`/conversations/${activeId}`).then(r => r.data),
        enabled: !!activeId,
        refetchInterval: 3000,
    });

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeConv?.messages]);

    const sendMutation = useMutation({
        mutationFn: ({ id, text }: { id: string; text: string }) =>
            apiClient.post(`/conversations/${id}/messages`, { text }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['conversation', activeId] });
            qc.invalidateQueries({ queryKey: ['conversations'] });
            setText('');
        },
    });

    const closeMutation = useMutation({
        mutationFn: (id: string) => apiClient.patch(`/conversations/${id}/close`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['conversations'] });
            qc.invalidateQueries({ queryKey: ['conversation', activeId] });
            antMsg.success('Переписка закрыта');
        },
    });

    const contractMutation = useMutation({
        mutationFn: (vals: any) =>
            apiClient.post(`/conversations/${activeId}/contract`, {
                ...vals,
                start_date: vals.dates[0].format('YYYY-MM-DD'),
                end_date: vals.dates[1].format('YYYY-MM-DD'),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['conversations'] });
            qc.invalidateQueries({ queryKey: ['conversation', activeId] });
            qc.invalidateQueries({ queryKey: ['contracts'] });
            qc.invalidateQueries({ queryKey: ['props'] });
            setContractOpen(false);
            contractForm.resetFields();
            antMsg.success('Договор создан! Объект переведён в статус "Сдан".');
        },
        onError: (e: any) => antMsg.error(e.response?.data?.detail || 'Ошибка создания договора'),
    });

    const handleSend = () => {
        if (!text.trim() || !activeId) return;
        sendMutation.mutate({ id: activeId, text: text.trim() });
    };

    // Determine "other party" for each conversation
    const otherParty = (conv: any) =>
        conv.tenant?.username === myUsername ? conv.landlord : conv.tenant;

    const totalUnread = conversations.reduce((s: number, c: any) => s + (c.unread_count || 0), 0);

    return (
        <Layout style={{ height: 'calc(100vh - 130px)', borderRadius: 16, overflow: 'hidden', background: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)' }}>
            {/* Left: conversation list */}
            <Sider
                width={320}
                style={{ background: '#f8fafc', borderRight: '1px solid #e2e8f0', overflow: 'auto' }}
            >
                <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #e2e8f0' }}>
                    <Title level={4} style={{ margin: 0 }}>
                        <MessageOutlined /> Сообщения
                        {totalUnread > 0 && <Badge count={totalUnread} style={{ marginLeft: 8 }} />}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>Переписки по объектам</Text>
                </div>

                {listLoading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
                ) : conversations.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Нет переписок"
                        style={{ padding: 40 }}
                    />
                ) : (
                    <List
                        dataSource={conversations}
                        renderItem={(conv: any) => {
                            const other = otherParty(conv);
                            const lastMsg = conv.messages?.[conv.messages.length - 1];
                            const isActive = conv.id === activeId;
                            return (
                                <List.Item
                                    onClick={() => setActiveId(conv.id)}
                                    style={{
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        background: isActive ? '#eff6ff' : 'transparent',
                                        borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <List.Item.Meta
                                        avatar={
                                            <Badge count={conv.unread_count} size="small">
                                                <Avatar icon={<UserOutlined />} style={{ background: '#2563eb' }} />
                                            </Badge>
                                        }
                                        title={
                                            <Space>
                                                <Text strong style={{ fontSize: 13 }}>
                                                    {other?.name || other?.username || '—'}
                                                </Text>
                                                <Tag color={STATUS_COLORS[conv.status]} style={{ fontSize: 10 }}>
                                                    {STATUS_LABELS[conv.status]}
                                                </Tag>
                                            </Space>
                                        }
                                        description={
                                            <div>
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    <HomeOutlined /> {conv.property?.city}, {conv.property?.street}
                                                </Text>
                                                <br />
                                                <Text type="secondary" style={{ fontSize: 11, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                                                    {lastMsg?.text || 'Нет сообщений'}
                                                </Text>
                                            </div>
                                        }
                                    />
                                </List.Item>
                            );
                        }}
                    />
                )}
            </Sider>

            {/* Right: chat */}
            <Content style={{ display: 'flex', flexDirection: 'column', background: '#fff' }}>
                {!activeId ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="Выберите переписку слева"
                        />
                    </div>
                ) : convLoading ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Spin size="large" />
                    </div>
                ) : (
                    <>
                        {/* Chat header */}
                        <div style={{
                            padding: '14px 20px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#fff',
                        }}>
                            <div>
                                <Space>
                                    <Avatar icon={<UserOutlined />} style={{ background: '#2563eb' }} />
                                    <div>
                                        <Text strong>
                                            {otherParty(activeConv)?.name || otherParty(activeConv)?.username}
                                        </Text>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            <HomeOutlined /> {activeConv?.property?.city}, {activeConv?.property?.street} {activeConv?.property?.house} · {activeConv?.property?.area} м² · {Number(activeConv?.property?.base_rent).toLocaleString()} BYN/мес
                                        </Text>
                                    </div>
                                </Space>
                            </div>
                            <Space>
                                <Tag color={STATUS_COLORS[activeConv?.status]}>
                                    {STATUS_LABELS[activeConv?.status]}
                                </Tag>
                                {(myRole === 'landlord' || myRole === 'admin') && activeConv?.status === 'active' && (
                                    <Tooltip title="Оформить договор аренды">
                                        <Button
                                            type="primary"
                                            icon={<FileTextOutlined />}
                                            size="small"
                                            onClick={() => setContractOpen(true)}
                                        >
                                            Создать договор
                                        </Button>
                                    </Tooltip>
                                )}
                                {activeConv?.status === 'active' && (
                                    <Tooltip title="Закрыть переписку">
                                        <Button
                                            danger
                                            icon={<CloseCircleOutlined />}
                                            size="small"
                                            onClick={() => closeMutation.mutate(activeId)}
                                        />
                                    </Tooltip>
                                )}
                                {activeConv?.status === 'contracted' && (
                                    <Button
                                        size="small"
                                        icon={<CheckCircleOutlined />}
                                        style={{ color: '#16a34a', borderColor: '#16a34a' }}
                                        onClick={() => window.location.href = '/app/contracts'}
                                    >
                                        Открыть договор
                                    </Button>
                                )}
                            </Space>
                        </div>

                        {/* Property card */}
                        {activeConv?.property && (
                            <div style={{ padding: '10px 20px', background: '#f0f9ff', borderBottom: '1px solid #bae6fd' }}>
                                <Space size="middle">
                                    <div style={{
                                        width: 56, height: 56, borderRadius: 10, overflow: 'hidden', background: '#e2e8f0', flexShrink: 0,
                                    }}>
                                        <img
                                            src={activeConv.property.images?.[0] || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&h=80&fit=crop'}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            alt="prop"
                                        />
                                    </div>
                                    <div>
                                        <Text strong>{activeConv.property.city}, {activeConv.property.street} {activeConv.property.house}</Text>
                                        <br />
                                        <Space>
                                            <Tag>{activeConv.property.type === 'flat' ? 'Квартира' : activeConv.property.type}</Tag>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{activeConv.property.area} м²</Text>
                                            <Text strong style={{ color: '#2563eb', fontSize: 13 }}>
                                                {Number(activeConv.property.base_rent).toLocaleString()} BYN/мес
                                            </Text>
                                        </Space>
                                    </div>
                                </Space>
                            </div>
                        )}

                        {/* Messages */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {activeConv?.messages?.length === 0 && (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Начните переписку" style={{ margin: 'auto' }} />
                            )}
                            {activeConv?.messages?.map((msg: any) => {
                                const isMine = msg.sender?.username === myUsername;
                                return (
                                    <div key={msg.id} style={{
                                        display: 'flex',
                                        justifyContent: isMine ? 'flex-end' : 'flex-start',
                                    }}>
                                        {!isMine && (
                                            <Avatar size={28} icon={<UserOutlined />} style={{ background: '#64748b', marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' }} />
                                        )}
                                        <div style={{
                                            maxWidth: '70%',
                                            background: isMine ? '#2563eb' : '#f1f5f9',
                                            color: isMine ? '#fff' : '#1e293b',
                                            borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                            padding: '10px 14px',
                                        }}>
                                            {!isMine && (
                                                <Text style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 2 }}>
                                                    {msg.sender?.name || msg.sender?.username}
                                                </Text>
                                            )}
                                            <Paragraph style={{ margin: 0, color: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                {msg.text}
                                            </Paragraph>
                                            <Text style={{ fontSize: 10, opacity: 0.7, color: 'inherit', float: 'right', marginTop: 4 }}>
                                                {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                                {isMine && (msg.is_read ? ' ✓✓' : ' ✓')}
                                            </Text>
                                        </div>
                                        {isMine && (
                                            <Avatar size={28} icon={<UserOutlined />} style={{ background: '#2563eb', marginLeft: 8, flexShrink: 0, alignSelf: 'flex-end' }} />
                                        )}
                                    </div>
                                );
                            })}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        {activeConv?.status === 'active' ? (
                            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10 }}>
                                <Input.TextArea
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    placeholder="Написать сообщение..."
                                    autoSize={{ minRows: 1, maxRows: 4 }}
                                    onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                    style={{ borderRadius: 20, resize: 'none' }}
                                />
                                <Button
                                    type="primary"
                                    icon={<SendOutlined />}
                                    onClick={handleSend}
                                    loading={sendMutation.isPending}
                                    style={{ borderRadius: 20, height: 40, width: 44 }}
                                />
                            </div>
                        ) : (
                            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                                <Text type="secondary">
                                    {activeConv?.status === 'contracted'
                                        ? '✓ Договор оформлен — переписка завершена'
                                        : 'Переписка закрыта'}
                                </Text>
                            </div>
                        )}
                    </>
                )}
            </Content>

            {/* Contract modal */}
            <Modal
                title={<Space><FileTextOutlined /> Оформить договор аренды</Space>}
                open={contractOpen}
                onCancel={() => setContractOpen(false)}
                onOk={() => contractForm.submit()}
                okText="Создать договор"
                width={560}
                confirmLoading={contractMutation.isPending}
            >
                {activeConv && (
                    <div style={{ background: '#f0f9ff', borderRadius: 12, padding: 14, marginBottom: 20 }}>
                        <Space>
                            <HomeOutlined style={{ color: '#2563eb' }} />
                            <div>
                                <Text strong>{activeConv.property?.city}, {activeConv.property?.street} {activeConv.property?.house}</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Арендатор: <b>{activeConv.tenant?.name || activeConv.tenant?.username}</b>
                                </Text>
                            </div>
                        </Space>
                    </div>
                )}
                <Form form={contractForm} layout="vertical" onFinish={vals => contractMutation.mutate(vals)}>
                    <Form.Item name="contract_type" label="Тип договора" initialValue="standard" rules={[{ required: true }]}>
                        <Select options={[
                            { value: 'standard', label: 'Стандартный' },
                            { value: 'short_term', label: 'Краткосрочный' },
                            { value: 'commercial', label: 'Коммерческий' },
                        ]} />
                    </Form.Item>
                    <Form.Item name="dates" label="Период аренды" rules={[{ required: true }]}>
                        <DatePicker.RangePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="rent_amount" label="Сумма аренды (BYN)" rules={[{ required: true }]}
                            initialValue={activeConv?.property?.base_rent}>
                            <InputNumber style={{ width: '100%' }} addonAfter="BYN" min={0} />
                        </Form.Item>
                        <Form.Item name="payment_period" label="Период оплаты" initialValue="month">
                            <Select options={[
                                { value: 'month', label: 'Ежемесячно' },
                                { value: 'quarter', label: 'Ежеквартально' },
                            ]} />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>
        </Layout>
    );
}
