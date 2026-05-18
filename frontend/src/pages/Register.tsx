import { useState } from 'react';
import { Form, Input, Button, Card, message, Select, DatePicker, Steps, Typography, Row, Col, Space } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined, HomeOutlined, IdcardOutlined, TeamOutlined } from '@ant-design/icons';
import { apiClient } from '../api/client';
import { useNavigate, Link } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

export function Register() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [role, setRole] = useState<string>('tenant');
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const onFinish = async (vals: any) => {
        setLoading(true);
        try {
            const payload = {
                ...vals,
                birth_date: vals.birth_date ? vals.birth_date.format('YYYY-MM-DD') : undefined,
            };
            await apiClient.post('/auth/register', payload);

            // Auto-login after registration
            const form_data = new URLSearchParams();
            form_data.append('username', vals.username);
            form_data.append('password', vals.password);
            const loginRes = await apiClient.post('/auth/login', form_data, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            localStorage.setItem('token', loginRes.data.access_token);
            message.success('Добро пожаловать!');
            navigate('/app/dashboard');
        } catch (e: any) {
            const status = e.response?.status;
            const detail = e.response?.data?.detail;
            if (detail === 'User exists') {
                message.error('Пользователь с таким логином уже существует');
                setStep(0);
            } else if (status === 422) {
                const errors = e.response?.data?.detail;
                if (Array.isArray(errors)) {
                    const msg = errors.map((err: any) => err.msg).join(', ');
                    message.error(`Ошибка валидации: ${msg}`);
                } else {
                    message.error('Ошибка валидации данных');
                }
            } else if (status === 500) {
                message.error('Ошибка сервера. Возможно, такой телефон уже зарегистрирован.');
            } else if (!e.response) {
                message.error('Нет связи с сервером. Проверьте, запущен ли бэкенд.');
            } else {
                message.error(typeof detail === 'string' ? detail : 'Ошибка регистрации. Проверьте данные.');
            }
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        const fields = step === 0
            ? ['last_name', 'first_name', 'birth_date']
            : ['phone', 'role'];
        form.validateFields(fields).then(() => setStep(s => s + 1)).catch(() => {});
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
            <div style={{ width: '100%', maxWidth: 560 }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <Link to="/">
                        <Title level={3} style={{ color: '#2563eb', margin: 0 }}>RentHouse</Title>
                    </Link>
                    <Text type="secondary">Создайте аккаунт для управления арендой</Text>
                </div>

                <Card style={{ borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: 'none' }}>
                    <Steps
                        current={step}
                        style={{ marginBottom: 32 }}
                        size="small"
                        items={[
                            { title: 'Личные данные', icon: <IdcardOutlined /> },
                            { title: 'Контакты', icon: <PhoneOutlined /> },
                            { title: 'Аккаунт', icon: <LockOutlined /> },
                        ]}
                    />

                    <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">

                        {/* Step 0: Personal info */}
                        <div style={{ display: step === 0 ? 'block' : 'none' }}>
                            <Title level={5} style={{ marginBottom: 20 }}>Личные данные</Title>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="last_name" label="Фамилия" rules={[{ required: true, message: 'Введите фамилию' }]}>
                                        <Input prefix={<UserOutlined />} placeholder="Иванов" size="large" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="first_name" label="Имя" rules={[{ required: true, message: 'Введите имя' }]}>
                                        <Input placeholder="Иван" size="large" />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Form.Item name="patronymic" label="Отчество">
                                <Input placeholder="Иванович (необязательно)" size="large" />
                            </Form.Item>
                            <Form.Item
                                name="birth_date"
                                label="Дата рождения"
                                rules={[
                                    { required: true, message: 'Укажите дату рождения' },
                                    {
                                        validator: (_, v) => {
                                            if (v && dayjs().diff(v, 'year') < 18) {
                                                return Promise.reject('Вам должно быть не менее 18 лет');
                                            }
                                            return Promise.resolve();
                                        }
                                    }
                                ]}
                            >
                                <DatePicker
                                    style={{ width: '100%' }}
                                    size="large"
                                    format="DD.MM.YYYY"
                                    placeholder="ДД.ММ.ГГГГ"
                                    disabledDate={d => d && d.isAfter(dayjs().subtract(18, 'year'))}
                                />
                            </Form.Item>
                        </div>

                        {/* Step 1: Contacts */}
                        <div style={{ display: step === 1 ? 'block' : 'none' }}>
                            <Title level={5} style={{ marginBottom: 20 }}>Контактные данные</Title>
                            <Form.Item
                                name="phone"
                                label="Номер телефона"
                                rules={[
                                    { required: true, message: 'Введите номер телефона' },
                                    { pattern: /^\+?[\d\s\-()]{7,}$/, message: 'Неверный формат телефона' }
                                ]}
                            >
                                <Input
                                    prefix={<PhoneOutlined />}
                                    placeholder="+375 (29) 123-45-67"
                                    size="large"
                                />
                            </Form.Item>
                            <Form.Item name="address" label="Адрес проживания">
                                <Input
                                    prefix={<HomeOutlined />}
                                    placeholder="г. Минск, ул. Ленина, д. 1, кв. 1"
                                    size="large"
                                />
                            </Form.Item>
                            <Form.Item
                                name="role"
                                label="Роль в системе"
                                initialValue="tenant"
                                rules={[{ required: true }]}
                            >
                                <Select size="large" onChange={v => setRole(v)}>
                                    <Option value="tenant">
                                        <Space><TeamOutlined /> Арендатор — ищу жильё</Space>
                                    </Option>
                                    <Option value="landlord">
                                        <Space><HomeOutlined /> Арендодатель — сдаю недвижимость</Space>
                                    </Option>
                                </Select>
                            </Form.Item>
                            <div style={{ background: '#f0f9ff', borderRadius: 12, padding: '12px 16px', marginBottom: 8 }}>
                                <Text style={{ fontSize: 13 }}>
                                    {role === 'landlord'
                                        ? 'Как арендодатель вы сможете добавлять объекты, заключать договоры и отслеживать платежи.'
                                        : 'Как арендатор вы сможете просматривать объекты, вести переписку с владельцами и получать договоры.'}
                                </Text>
                            </div>
                        </div>

                        {/* Step 2: Account */}
                        <div style={{ display: step === 2 ? 'block' : 'none' }}>
                            <Title level={5} style={{ marginBottom: 20 }}>Данные для входа</Title>
                            <Form.Item
                                name="username"
                                label="Логин"
                                rules={[
                                    { required: true, message: 'Придумайте логин' },
                                    { min: 3, message: 'Минимум 3 символа' },
                                    { pattern: /^[a-zA-Z0-9_]+$/, message: 'Только буквы, цифры и _' }
                                ]}
                            >
                                <Input prefix={<UserOutlined />} placeholder="ivan_ivanov" size="large" />
                            </Form.Item>
                            <Form.Item
                                name="password"
                                label="Пароль"
                                rules={[
                                    { required: true, message: 'Придумайте пароль' },
                                    { min: 6, message: 'Минимум 6 символов' }
                                ]}
                            >
                                <Input.Password prefix={<LockOutlined />} placeholder="Минимум 6 символов" size="large" />
                            </Form.Item>
                            <Form.Item
                                name="confirm_password"
                                label="Повторите пароль"
                                dependencies={['password']}
                                rules={[
                                    { required: true, message: 'Повторите пароль' },
                                    ({ getFieldValue }) => ({
                                        validator(_, v) {
                                            if (!v || getFieldValue('password') === v) return Promise.resolve();
                                            return Promise.reject('Пароли не совпадают');
                                        }
                                    })
                                ]}
                            >
                                <Input.Password prefix={<LockOutlined />} placeholder="Повторите пароль" size="large" />
                            </Form.Item>

                            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Регистрируясь, вы принимаете условия использования системы. Ваши данные защищены и не передаются третьим лицам.
                                </Text>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                            {step > 0 ? (
                                <Button size="large" onClick={() => setStep(s => s - 1)}>← Назад</Button>
                            ) : (
                                <div />
                            )}
                            {step < 2 ? (
                                <Button type="primary" size="large" onClick={nextStep}>
                                    Далее →
                                </Button>
                            ) : (
                                <Button type="primary" size="large" htmlType="submit" loading={loading} style={{ minWidth: 160 }}>
                                    Создать аккаунт
                                </Button>
                            )}
                        </div>
                    </Form>
                </Card>

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <Text type="secondary">Уже есть аккаунт? </Text>
                    <Link to="/login" style={{ color: '#2563eb', fontWeight: 600 }}>Войти</Link>
                </div>
            </div>
        </div>
    );
}
