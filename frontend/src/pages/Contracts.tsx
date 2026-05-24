import { useState, useRef } from 'react';
import { Table, Button, Modal, Form, InputNumber, Select, DatePicker, message, Tag, Space, Typography, Card, Input, Row, Col, Popconfirm, Tooltip } from 'antd';
import { FileWordOutlined, PrinterOutlined, PlusOutlined, SaveOutlined, FileTextOutlined, StopOutlined, CheckOutlined, DownloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
dayjs.locale('ru');

const { Title, Text } = Typography;

const CONTRACT_TYPE_LABELS: Record<string, string> = {
    standard: 'Стандартный',
    short_term: 'Краткосрочный',
    commercial: 'Коммерческий',
};
const STATUS_COLORS: Record<string, string> = {
    active: 'green', terminated: 'red', finished: 'default', planned: 'blue',
};
const STATUS_LABELS: Record<string, string> = {
    active: 'Активен', terminated: 'Расторгнут', finished: 'Завершён', planned: 'Планируется',
};

function getRole(): string {
    try {
        const t = localStorage.getItem('token');
        if (!t) return '';
        return JSON.parse(atob(t.split('.')[1])).role || '';
    } catch { return ''; }
}

/* ─── Inline editable field ─────────────────────────────────────────────────── */
function F({ val, onChange, w, ph }: { val: string; onChange: (v: string) => void; w?: number; ph?: string }) {
    return (
        <span
            contentEditable
            suppressContentEditableWarning
            onBlur={e => onChange(e.currentTarget.textContent?.trim() || '')}
            style={{
                display: 'inline-block',
                minWidth: w || 120,
                borderBottom: '1.5px dashed #2563eb',
                background: '#fefce8',
                padding: '0 3px',
                outline: 'none',
                cursor: 'text',
                borderRadius: 2,
                color: val ? '#1e293b' : '#94a3b8',
                fontStyle: val ? 'normal' : 'italic',
            }}
            dangerouslySetInnerHTML={{ __html: val || ph || '___________' }}
        />
    );
}

function numWords(n: number): string {
    if (!n || isNaN(n)) return '___________';
    const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
        'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
        'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
    const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
    const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
    const thou = ['', 'одна тысяча', 'две тысячи', 'три тысячи', 'четыре тысячи', 'пять тысяч',
        'шесть тысяч', 'семь тысяч', 'восемь тысяч', 'девять тысяч', 'десять тысяч'];
    const int = Math.floor(n);
    if (int >= 10000) return `${int.toLocaleString()} BYN`;
    const th = Math.floor(int / 1000);
    const rem = int % 1000;
    const h = Math.floor(rem / 100);
    const t = Math.floor((rem % 100) / 10);
    const o = rem % 10;
    const parts = [];
    if (th > 0) parts.push(thou[th] || `${th} тысяч`);
    if (h > 0) parts.push(hundreds[h]);
    if (rem % 100 < 20 && rem % 100 > 0) { parts.push(ones[rem % 100]); }
    else { if (t > 0) parts.push(tens[t]); if (o > 0) parts.push(ones[o]); }
    return parts.filter(Boolean).join(' ') || 'ноль';
}

/* ─── RENTAL contract document ──────────────────────────────────────────────── */
function RentContractDoc({ contract }: { contract: any }) {
    const printRef = useRef<HTMLDivElement>(null);
    const landlord = contract.property?.owner;
    const tenant = contract.tenant;
    const prop = contract.property;

    const [f, setF] = useState({
        city: contract.signing_city || 'Минск',
        date: contract.signing_date ? dayjs(contract.signing_date).format('DD MMMM YYYY') : dayjs().format('DD MMMM YYYY'),
        landlordName: landlord?.name || '',
        landlordPassport: contract.landlord_passport || '',
        landlordAddress: contract.landlord_address || '',
        tenantName: tenant?.name || '',
        tenantPassport: contract.tenant_passport || '',
        tenantAddress: contract.tenant_address || '',
        propAddress: prop ? `${prop.city || ''}, ул. ${prop.street || ''}, д. ${prop.house || ''}` : '',
        propArea: String(prop?.area || ''),
        propRooms: String(prop?.rooms || '1'),
        propFloor: prop?.floor ? `${prop.floor} (${prop.total_floors ? 'из ' + prop.total_floors : ''})` : '',
        startDate: contract.start_date ? dayjs(contract.start_date).format('DD.MM.YYYY') : '',
        endDate: contract.end_date ? dayjs(contract.end_date).format('DD.MM.YYYY') : '',
        rentAmount: String(contract.rent_amount || ''),
        payPeriod: contract.payment_period === 'quarter' ? 'ежеквартально' : 'ежемесячно',
        deposit: String(contract.deposit_amount || '0'),
        penalty: '0,1',
        noticeDays: '30',
        extraClauses: '',
    });
    const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

    const passportMutation = useMutation({
        mutationFn: (data: any) => apiClient.patch(`/contracts/${contract.id}/passport`, data),
        onSuccess: () => message.success('Данные сохранены'),
        onError: () => message.error('Ошибка сохранения'),
    });

    const handleSave = () => {
        passportMutation.mutate({
            signing_city: f.city,
            signing_date: contract.signing_date || dayjs().format('YYYY-MM-DD'),
            landlord_passport: f.landlordPassport,
            landlord_address: f.landlordAddress,
            tenant_passport: f.tenantPassport,
            tenant_address: f.tenantAddress,
        });
    };

    const handlePrint = () => {
        const content = printRef.current?.innerHTML;
        if (!content) return;
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`<html><head><title>Договор ${contract.number}</title>
        <style>
            @page { margin: 2cm; }
            body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.8; color: #000; }
            h2, h3 { text-align: center; }
            h4 { margin-top: 16pt; }
            p { text-indent: 1.5em; margin: 6pt 0; text-align: justify; }
            .no-indent { text-indent: 0; }
            .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60pt; }
            .sig-line { border-top: 1px solid #000; margin-top: 50pt; padding-top: 4pt; font-size: 10pt; }
            .center { text-align: center; }
        </style></head><body>${content}</body></html>`);
        w.document.close();
        w.print();
    };

    const handleDownloadDocx = async () => {
        const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = await import('docx');
        const { saveAs } = await import('file-saver');

        const H = (text: string) => new Paragraph({ children: [new TextRun({ text, bold: true, size: 28, font: 'Times New Roman' })], alignment: AlignmentType.CENTER, spacing: { after: 100 } });
        const H3 = (text: string) => new Paragraph({ children: [new TextRun({ text, bold: true, size: 24, font: 'Times New Roman' })], spacing: { before: 200, after: 80 } });
        const P = (children: any[]) => new Paragraph({ children, indent: { firstLine: 720 }, alignment: AlignmentType.JUSTIFIED, spacing: { after: 60 } });
        const B = (t: string) => new TextRun({ text: t, bold: true, size: 24, font: 'Times New Roman' });
        const N = (t: string) => new TextRun({ text: t, size: 24, font: 'Times New Roman' });
        const UL = (t: string) => new TextRun({ text: t, size: 24, font: 'Times New Roman', underline: {} });

        const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
        const sigTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
            rows: [
                new TableRow({ children: [
                    new TableCell({ children: [new Paragraph({ children: [B('НАЙМОДАТЕЛЬ:')], spacing: { after: 120 } })], borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder } }),
                    new TableCell({ children: [new Paragraph({ children: [B('НАНИМАТЕЛЬ:')], spacing: { after: 120 } })], borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder } }),
                ] }),
                new TableRow({ children: [
                    new TableCell({ children: [new Paragraph({ children: [N(f.landlordName || '________________________')] })], borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder } }),
                    new TableCell({ children: [new Paragraph({ children: [N(f.tenantName || '________________________')] })], borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder } }),
                ] }),
                new TableRow({ children: [
                    new TableCell({ children: [new Paragraph({ children: [N(f.landlordPassport ? `Паспорт: ${f.landlordPassport}` : '')] })], borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder } }),
                    new TableCell({ children: [new Paragraph({ children: [N(f.tenantPassport ? `Паспорт: ${f.tenantPassport}` : '')] })], borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder } }),
                ] }),
                new TableRow({ children: [
                    new TableCell({ children: [
                        new Paragraph({ children: [N('')], spacing: { before: 600 } }),
                        new Paragraph({ children: [N('________________________   /________________/'), N('')], spacing: { after: 0 } }),
                        new Paragraph({ children: [N('       подпись                расшифровка')], spacing: { after: 0 } }),
                    ], borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder } }),
                    new TableCell({ children: [
                        new Paragraph({ children: [N('')], spacing: { before: 600 } }),
                        new Paragraph({ children: [N('________________________   /________________/'), N('')], spacing: { after: 0 } }),
                        new Paragraph({ children: [N('       подпись                расшифровка')], spacing: { after: 0 } }),
                    ], borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder } }),
                ] }),
            ],
        });

        const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1134, right: 850, bottom: 1134, left: 1701 } } }, children: [
            H('ДОГОВОР НАЙМА ЖИЛОГО ПОМЕЩЕНИЯ'),
            H(`№ ${contract.number}`),
            new Paragraph({ children: [N(`г. ${f.city}`), new TextRun({ text: `     ${f.date} г.`, size: 24, font: 'Times New Roman' })], alignment: AlignmentType.LEFT, spacing: { after: 200 } }),
            P([B(f.landlordName || 'Наймодатель'), N(', паспорт: '), UL(f.landlordPassport || '__________'), N(', адрес: '), UL(f.landlordAddress || '__________'), N(', именуемый далее '), B('«Наймодатель»'), N(', с одной стороны, и '), B(f.tenantName || 'Наниматель'), N(', паспорт: '), UL(f.tenantPassport || '__________'), N(', адрес: '), UL(f.tenantAddress || '__________'), N(', именуемый далее '), B('«Наниматель»'), N(', с другой стороны, заключили настоящий Договор о нижеследующем:')]),
            H3('1. ПРЕДМЕТ ДОГОВОРА'),
            P([N('1.1. Наймодатель передаёт Нанимателю во временное возмездное владение и пользование жилое помещение, расположенное по адресу: '), B(f.propAddress || '__________'), N(`, общей площадью `), B(`${f.propArea} м²`), N(`, количество комнат: `), B(f.propRooms), N('.')]),
            P([N(`1.2. Помещение предоставляется исключительно для проживания. Использование в иных целях не допускается без письменного согласия Наймодателя.`)]),
            P([N('1.3. Срок найма: с '), B(f.startDate), N(' по '), B(f.endDate), N('.')]),
            H3('2. ПЛАТА ЗА НАЁМ И ПОРЯДОК РАСЧЁТОВ'),
            P([N('2.1. Ежемесячная плата за наём составляет '), B(`${Number(f.rentAmount).toLocaleString()} (${numWords(Number(f.rentAmount))}) белорусских рублей`), N(`. Оплата производится `), B(f.payPeriod), N('.')]),
            P([N('2.2. Оплата производится не позднее 5-го числа каждого расчётного месяца путём перечисления на банковский счёт Наймодателя или наличными средствами.')]),
            Number(f.deposit) > 0 ? P([N('2.3. Наниматель вносит обеспечительный платёж (залог) в размере '), B(`${Number(f.deposit).toLocaleString()} BYN`), N('. Залог возвращается по окончании срока найма при надлежащем состоянии помещения.')]) : new Paragraph({}),
            H3('3. ПРАВА И ОБЯЗАННОСТИ СТОРОН'),
            P([N('3.1. Наймодатель обязан: передать помещение в надлежащем техническом и санитарном состоянии; обеспечить предоставление коммунальных услуг; устранять неисправности, возникшие не по вине Нанимателя; не препятствовать проживанию Нанимателя.')]),
            P([N('3.2. Наниматель обязан: использовать помещение по назначению; своевременно вносить плату; поддерживать чистоту и порядок; не производить перепланировку без письменного согласия; при обнаружении аварий немедленно уведомлять Наймодателя.')]),
            P([N('3.3. Наниматель не вправе сдавать помещение в субнаём без письменного согласия Наймодателя.')]),
            H3('4. ОТВЕТСТВЕННОСТЬ СТОРОН'),
            P([N(`4.1. При просрочке платежа Наниматель уплачивает пеню в размере ${f.penalty}% от суммы долга за каждый день просрочки.`)]),
            P([N('4.2. Стороны несут ответственность за ущерб, причинённый помещению по их вине или вине проживающих с ними лиц, в полном объёме.')]),
            P([N('4.3. Наймодатель несёт ответственность за скрытые недостатки помещения, о которых Наниматель не был предупреждён при заключении договора.')]),
            H3('5. РАСТОРЖЕНИЕ ДОГОВОРА'),
            P([N(`5.1. Договор может быть расторгнут по соглашению сторон в любое время.`)]),
            P([N(`5.2. Каждая из сторон вправе расторгнуть договор в одностороннем порядке, предупредив другую сторону в письменной форме за ${f.noticeDays} дней.`)]),
            P([N('5.3. Наймодатель вправе потребовать досрочного расторжения договора в случае: систематического нарушения сроков оплаты; использования помещения не по назначению; причинения ущерба имуществу.')]),
            H3('6. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ'),
            P([N('6.1. Настоящий Договор составлен в двух экземплярах, имеющих равную юридическую силу — по одному для каждой из Сторон.')]),
            P([N('6.2. Все изменения и дополнения к настоящему Договору действительны только при оформлении в письменном виде и подписании обеими Сторонами.')]),
            P([N('6.3. По всем вопросам, не урегулированным настоящим Договором, Стороны руководствуются действующим законодательством Республики Беларусь.')]),
            f.extraClauses ? P([N(f.extraClauses)]) : new Paragraph({ children: [] }),
            new Paragraph({ children: [], spacing: { before: 400 } }),
            sigTable,
        ] }] });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `Договор_найма_${contract.number}.docx`);
    };

    const docStyle: React.CSSProperties = {
        background: '#fff',
        border: '1px solid #d1d5db',
        borderRadius: 4,
        padding: '48px 56px',
        maxHeight: 'calc(100vh - 260px)',
        overflowY: 'auto',
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: 13,
        lineHeight: 1.9,
        color: '#000',
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
    };

    return (
        <div>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <Button type="primary" icon={<SaveOutlined />} loading={passportMutation.isPending} onClick={handleSave}>
                    Сохранить данные
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleDownloadDocx} style={{ background: '#1d6f42', color: '#fff', borderColor: '#1d6f42' }}>
                    Скачать .docx
                </Button>
                <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                    Печать / PDF
                </Button>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                    Нажмите на подчёркнутое поле — и редактируйте прямо в документе
                </Text>
            </div>

            {/* Document */}
            <div ref={printRef} style={docStyle}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Договор найма жилого помещения
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>№ {contract.number}</div>
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                        <span>г. <F val={f.city} onChange={v => set('city', v)} w={100} /></span>
                        <F val={f.date} onChange={v => set('date', v)} w={160} ph="дд месяц гггг" />
                    </div>
                </div>

                <p style={{ textAlign: 'justify', textIndent: '1.5em' }}>
                    <b><F val={f.landlordName} onChange={v => set('landlordName', v)} w={180} ph="ФИО арендодателя" /></b>,
                    паспорт: <F val={f.landlordPassport} onChange={v => set('landlordPassport', v)} w={160} ph="серия и номер" />,
                    адрес: <F val={f.landlordAddress} onChange={v => set('landlordAddress', v)} w={220} ph="адрес регистрации" />,
                    именуемый в дальнейшем <b>«Наймодатель»</b>, с одной стороны, и{' '}
                    <b><F val={f.tenantName} onChange={v => set('tenantName', v)} w={180} ph="ФИО арендатора" /></b>,
                    паспорт: <F val={f.tenantPassport} onChange={v => set('tenantPassport', v)} w={160} ph="серия и номер" />,
                    адрес: <F val={f.tenantAddress} onChange={v => set('tenantAddress', v)} w={220} ph="адрес регистрации" />,
                    именуемый в дальнейшем <b>«Наниматель»</b>, с другой стороны, заключили настоящий Договор о нижеследующем:
                </p>

                <h4 style={{ fontWeight: 700, marginTop: 20 }}>1. ПРЕДМЕТ ДОГОВОРА</h4>
                <p style={{ textAlign: 'justify', textIndent: '1.5em' }}>
                    1.1. Наймодатель передаёт Нанимателю во временное возмездное пользование жилое помещение, расположенное по адресу:{' '}
                    <b><F val={f.propAddress} onChange={v => set('propAddress', v)} w={280} ph="город, улица, дом" /></b>,
                    общей площадью <b><F val={f.propArea} onChange={v => set('propArea', v)} w={50} /></b> м²,
                    количество комнат: <b><F val={f.propRooms} onChange={v => set('propRooms', v)} w={40} /></b>
                    {f.propFloor && <>, этаж: <b><F val={f.propFloor} onChange={v => set('propFloor', v)} w={80} /></b></>}.
                </p>
                <p style={{ textIndent: '1.5em' }}>
                    1.2. Помещение предоставляется исключительно для проживания. Использование в иных целях не допускается.
                </p>
                <p style={{ textIndent: '1.5em' }}>
                    1.3. Срок найма: с <b><F val={f.startDate} onChange={v => set('startDate', v)} w={90} /></b> по <b><F val={f.endDate} onChange={v => set('endDate', v)} w={90} /></b>.
                </p>

                <h4 style={{ fontWeight: 700, marginTop: 20 }}>2. ПЛАТА ЗА НАЁМ И ПОРЯДОК РАСЧЁТОВ</h4>
                <p style={{ textIndent: '1.5em' }}>
                    2.1. Плата за наём составляет <b><F val={f.rentAmount} onChange={v => set('rentAmount', v)} w={80} /></b> ({numWords(Number(f.rentAmount))}) белорусских рублей в месяц.
                    Оплата производится <b><F val={f.payPeriod} onChange={v => set('payPeriod', v)} w={120} /></b>.
                </p>
                <p style={{ textIndent: '1.5em' }}>
                    2.2. Оплата производится не позднее 5-го числа каждого расчётного месяца путём перечисления на счёт Наймодателя или наличными.
                </p>
                {Number(f.deposit) > 0 && (
                    <p style={{ textIndent: '1.5em' }}>
                        2.3. Наниматель вносит обеспечительный платёж (залог) в размере <b><F val={f.deposit} onChange={v => set('deposit', v)} w={80} /></b> BYN.
                        Залог возвращается по окончании найма при надлежащем состоянии помещения.
                    </p>
                )}

                <h4 style={{ fontWeight: 700, marginTop: 20 }}>3. ПРАВА И ОБЯЗАННОСТИ СТОРОН</h4>
                <p style={{ textIndent: '1.5em' }}>
                    3.1. Наймодатель обязан: передать помещение в надлежащем состоянии; обеспечить коммунальные услуги; устранять неисправности не по вине Нанимателя; не препятствовать проживанию.
                </p>
                <p style={{ textIndent: '1.5em' }}>
                    3.2. Наниматель обязан: использовать помещение по назначению; своевременно вносить плату; поддерживать порядок; не производить перепланировку без согласия; немедленно уведомлять об авариях.
                </p>
                <p style={{ textIndent: '1.5em' }}>
                    3.3. Наниматель не вправе сдавать помещение в субнаём без письменного согласия Наймодателя.
                </p>

                <h4 style={{ fontWeight: 700, marginTop: 20 }}>4. ОТВЕТСТВЕННОСТЬ СТОРОН</h4>
                <p style={{ textIndent: '1.5em' }}>
                    4.1. При просрочке платежа Наниматель уплачивает пеню в размере <F val={f.penalty} onChange={v => set('penalty', v)} w={40} />% от суммы долга за каждый день просрочки.
                </p>
                <p style={{ textIndent: '1.5em' }}>
                    4.2. Стороны несут ответственность за ущерб, причинённый помещению по их вине, в полном объёме.
                </p>

                <h4 style={{ fontWeight: 700, marginTop: 20 }}>5. РАСТОРЖЕНИЕ ДОГОВОРА</h4>
                <p style={{ textIndent: '1.5em' }}>
                    5.1. Договор расторгается по соглашению сторон или в одностороннем порядке с письменным уведомлением за <F val={f.noticeDays} onChange={v => set('noticeDays', v)} w={40} /> дней.
                </p>
                <p style={{ textIndent: '1.5em' }}>
                    5.2. Основания досрочного расторжения: систематическое нарушение сроков оплаты; использование не по назначению; причинение ущерба имуществу.
                </p>

                <h4 style={{ fontWeight: 700, marginTop: 20 }}>6. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ</h4>
                <p style={{ textIndent: '1.5em' }}>
                    6.1. Договор составлен в двух экземплярах, имеющих равную юридическую силу, — по одному для каждой из Сторон.
                </p>
                <p style={{ textIndent: '1.5em' }}>
                    6.2. Изменения и дополнения действительны только в письменной форме, подписанной обеими Сторонами.
                </p>
                <p style={{ textIndent: '1.5em' }}>
                    6.3. В остальном Стороны руководствуются действующим законодательством Республики Беларусь.
                </p>
                {f.extraClauses && (
                    <p style={{ textIndent: '1.5em' }}>{f.extraClauses}</p>
                )}

                <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Дополнительные условия (необязательно):</Text>
                    <Input.TextArea
                        value={f.extraClauses}
                        onChange={e => set('extraClauses', e.target.value)}
                        rows={2}
                        placeholder="Введите дополнительные условия..."
                        style={{ fontFamily: '"Times New Roman", serif', fontSize: 13, marginTop: 4 }}
                    />
                </div>

                {/* Signatures */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 48 }}>
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>НАЙМОДАТЕЛЬ:</div>
                        <div><F val={f.landlordName} onChange={v => set('landlordName', v)} w={200} /></div>
                        {f.landlordPassport && <div style={{ fontSize: 11, color: '#555' }}>Паспорт: {f.landlordPassport}</div>}
                        {f.landlordAddress && <div style={{ fontSize: 11, color: '#555' }}>{f.landlordAddress}</div>}
                        <div style={{ marginTop: 36, borderTop: '1px solid #333', paddingTop: 4, fontSize: 11 }}>
                            подпись / расшифровка
                        </div>
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>НАНИМАТЕЛЬ:</div>
                        <div><F val={f.tenantName} onChange={v => set('tenantName', v)} w={200} /></div>
                        {f.tenantPassport && <div style={{ fontSize: 11, color: '#555' }}>Паспорт: {f.tenantPassport}</div>}
                        {f.tenantAddress && <div style={{ fontSize: 11, color: '#555' }}>{f.tenantAddress}</div>}
                        <div style={{ marginTop: 36, borderTop: '1px solid #333', paddingTop: 4, fontSize: 11 }}>
                            подпись / расшифровка
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── SALE contract document ─────────────────────────────────────────────────── */
function SaleContractDoc({ contract }: { contract: any }) {
    const printRef = useRef<HTMLDivElement>(null);
    const seller = contract.property?.owner;
    const buyer = contract.tenant;
    const prop = contract.property;

    const [f, setF] = useState({
        city: contract.signing_city || 'Минск',
        date: contract.signing_date ? dayjs(contract.signing_date).format('DD MMMM YYYY') : dayjs().format('DD MMMM YYYY'),
        sellerName: seller?.name || '',
        sellerPassport: contract.landlord_passport || '',
        sellerAddress: contract.landlord_address || '',
        buyerName: buyer?.name || '',
        buyerPassport: contract.tenant_passport || '',
        buyerAddress: contract.tenant_address || '',
        propAddress: prop ? `${prop.city || ''}, ул. ${prop.street || ''}, д. ${prop.house || ''}` : '',
        propArea: String(prop?.area || ''),
        propRooms: String(prop?.rooms || '1'),
        propFloor: prop?.floor ? `${prop.floor}/${prop.total_floors || ''}` : '',
        salePrice: String(prop?.sale_price || contract.rent_amount || ''),
        paymentDeadline: '10',
        transferDeadline: '30',
        registrationDays: '30',
        penalty: '0,1',
        extraClauses: '',
    });
    const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

    const passportMutation = useMutation({
        mutationFn: (data: any) => apiClient.patch(`/contracts/${contract.id}/passport`, data),
        onSuccess: () => message.success('Данные сохранены'),
        onError: () => message.error('Ошибка'),
    });

    const handleSave = () => {
        passportMutation.mutate({
            signing_city: f.city,
            signing_date: contract.signing_date || dayjs().format('YYYY-MM-DD'),
            landlord_passport: f.sellerPassport,
            landlord_address: f.sellerAddress,
            tenant_passport: f.buyerPassport,
            tenant_address: f.buyerAddress,
        });
    };

    const handlePrint = () => {
        const w = window.open('', '_blank');
        if (!w || !printRef.current) return;
        w.document.write(`<html><head><title>Договор К-П ${contract.number}</title>
        <style>
            @page { margin: 2cm; }
            body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.8; }
            h4 { margin-top: 16pt; } p { text-indent: 1.5em; margin: 6pt 0; text-align: justify; }
        </style></head><body>${printRef.current.innerHTML}</body></html>`);
        w.document.close(); w.print();
    };

    const handleDownloadDocx = async () => {
        const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = await import('docx');
        const { saveAs } = await import('file-saver');

        const B = (t: string) => new TextRun({ text: t, bold: true, size: 24, font: 'Times New Roman' });
        const N = (t: string) => new TextRun({ text: t, size: 24, font: 'Times New Roman' });
        const UL = (t: string) => new TextRun({ text: t, size: 24, font: 'Times New Roman', underline: {} });
        const P = (children: any[]) => new Paragraph({ children, indent: { firstLine: 720 }, alignment: AlignmentType.JUSTIFIED, spacing: { after: 60 } });
        const H4 = (t: string) => new Paragraph({ children: [B(t)], spacing: { before: 200, after: 80 } });
        const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

        const sigTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
            rows: [
                new TableRow({ children: [
                    new TableCell({ children: [new Paragraph({ children: [B('ПРОДАВЕЦ:')] })], borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder } }),
                    new TableCell({ children: [new Paragraph({ children: [B('ПОКУПАТЕЛЬ:')] })], borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder } }),
                ] }),
                new TableRow({ children: [
                    new TableCell({ children: [new Paragraph({ children: [N(f.sellerName)] }), new Paragraph({ children: [N(f.sellerPassport ? `Паспорт: ${f.sellerPassport}` : '')] })], borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder } }),
                    new TableCell({ children: [new Paragraph({ children: [N(f.buyerName)] }), new Paragraph({ children: [N(f.buyerPassport ? `Паспорт: ${f.buyerPassport}` : '')] })], borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder } }),
                ] }),
                new TableRow({ children: [
                    new TableCell({ children: [new Paragraph({ children: [N('')], spacing: { before: 500 } }), new Paragraph({ children: [N('___________________ / ________________/')] })], borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder } }),
                    new TableCell({ children: [new Paragraph({ children: [N('')], spacing: { before: 500 } }), new Paragraph({ children: [N('___________________ / ________________/')] })], borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder } }),
                ] }),
            ],
        });

        const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1134, right: 850, bottom: 1134, left: 1701 } } }, children: [
            new Paragraph({ children: [B('ДОГОВОР КУПЛИ-ПРОДАЖИ НЕДВИЖИМОГО ИМУЩЕСТВА')], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
            new Paragraph({ children: [B(`№ ${contract.number}`)], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
            new Paragraph({ children: [N(`г. ${f.city}     ${f.date} г.`)], spacing: { after: 200 } }),
            P([B(f.sellerName || 'Продавец'), N(', паспорт: '), UL(f.sellerPassport || '__________'), N(', адрес: '), UL(f.sellerAddress || '__________'), N(', именуемый '), B('«Продавец»'), N(', и '), B(f.buyerName || 'Покупатель'), N(', паспорт: '), UL(f.buyerPassport || '__________'), N(', адрес: '), UL(f.buyerAddress || '__________'), N(', именуемый '), B('«Покупатель»'), N(', заключили настоящий Договор:')]),
            H4('1. ПРЕДМЕТ ДОГОВОРА'),
            P([N('1.1. Продавец продаёт, а Покупатель приобретает в собственность объект недвижимости: '), B(f.propAddress), N(`, площадь `), B(`${f.propArea} м²`), N(`, комнат: `), B(f.propRooms), N('.')]),
            P([N('1.2. Продавец гарантирует, что объект не заложен, не арестован, не обременён правами третьих лиц, в споре не состоит.')]),
            H4('2. ЦЕНА И ПОРЯДОК РАСЧЁТОВ'),
            P([N('2.1. Цена объекта составляет '), B(`${Number(f.salePrice).toLocaleString()} (${numWords(Number(f.salePrice))}) белорусских рублей`), N('.')]),
            P([N(`2.2. Расчёт производится в течение ${f.paymentDeadline} рабочих дней с момента подписания настоящего Договора.`)]),
            P([N('2.3. Оплата производится в безналичном порядке на банковский счёт Продавца либо наличными средствами.')]),
            H4('3. ПЕРЕДАЧА ОБЪЕКТА'),
            P([N(`3.1. Объект передаётся Покупателю в течение ${f.transferDeadline} дней после полной оплаты по Акту приёма-передачи.`)]),
            P([N('3.2. Риск случайной гибели или повреждения переходит к Покупателю с момента подписания Акта приёма-передачи.')]),
            P([N(`3.3. Государственная регистрация перехода права собственности осуществляется в течение ${f.registrationDays} дней.`)]),
            H4('4. ПРАВА И ОБЯЗАННОСТИ СТОРОН'),
            P([N('4.1. Продавец обязан: своевременно передать объект; предоставить все необходимые документы; устранить имеющиеся обременения.')]),
            P([N('4.2. Покупатель обязан: произвести оплату в установленный срок; принять объект по Акту; осуществить государственную регистрацию.')]),
            H4('5. ОТВЕТСТВЕННОСТЬ'),
            P([N(`5.1. В случае просрочки оплаты Покупатель уплачивает пеню ${f.penalty}% от суммы долга за каждый день просрочки.`)]),
            P([N('5.2. В случае нарушения Продавцом сроков передачи объекта Покупатель вправе требовать возврата уплаченных средств и неустойки.')]),
            H4('6. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ'),
            P([N('6.1. Договор составлен в двух экземплярах, имеющих равную юридическую силу.')]),
            P([N('6.2. Изменения допустимы только в письменной форме, подписанной обеими Сторонами.')]),
            P([N('6.3. По вопросам, не урегулированным настоящим Договором, применяется законодательство Республики Беларусь.')]),
            new Paragraph({ children: [], spacing: { before: 400 } }),
            sigTable,
        ] }] });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `Договор_КП_${contract.number}.docx`);
    };

    const ds: React.CSSProperties = {
        background: '#fff', border: '1px solid #d1d5db', borderRadius: 4,
        padding: '48px 56px', maxHeight: 'calc(100vh - 260px)', overflowY: 'auto',
        fontFamily: '"Times New Roman", Times, serif', fontSize: 13, lineHeight: 1.9,
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <Button type="primary" icon={<SaveOutlined />} loading={passportMutation.isPending} onClick={handleSave}>
                    Сохранить данные
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleDownloadDocx} style={{ background: '#1d6f42', color: '#fff', borderColor: '#1d6f42' }}>
                    Скачать .docx
                </Button>
                <Button icon={<PrinterOutlined />} onClick={handlePrint}>Печать / PDF</Button>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>Нажмите на подчёркнутое поле для редактирования</Text>
            </div>

            <div ref={printRef} style={ds}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Договор купли-продажи недвижимого имущества
                    </div>
                    <div style={{ fontWeight: 700 }}>№ {contract.number}</div>
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                        <span>г. <F val={f.city} onChange={v => set('city', v)} w={100} /></span>
                        <F val={f.date} onChange={v => set('date', v)} w={160} />
                    </div>
                </div>

                <p style={{ textAlign: 'justify', textIndent: '1.5em' }}>
                    <b><F val={f.sellerName} onChange={v => set('sellerName', v)} w={180} ph="ФИО продавца" /></b>,
                    паспорт: <F val={f.sellerPassport} onChange={v => set('sellerPassport', v)} w={150} />,
                    адрес: <F val={f.sellerAddress} onChange={v => set('sellerAddress', v)} w={220} />,
                    именуемый <b>«Продавец»</b>, и{' '}
                    <b><F val={f.buyerName} onChange={v => set('buyerName', v)} w={180} ph="ФИО покупателя" /></b>,
                    паспорт: <F val={f.buyerPassport} onChange={v => set('buyerPassport', v)} w={150} />,
                    адрес: <F val={f.buyerAddress} onChange={v => set('buyerAddress', v)} w={220} />,
                    именуемый <b>«Покупатель»</b>, заключили настоящий Договор:
                </p>

                <h4 style={{ fontWeight: 700, marginTop: 20 }}>1. ПРЕДМЕТ ДОГОВОРА</h4>
                <p style={{ textIndent: '1.5em' }}>
                    1.1. Продавец продаёт, а Покупатель приобретает в собственность объект недвижимости:{' '}
                    <b><F val={f.propAddress} onChange={v => set('propAddress', v)} w={280} /></b>,
                    площадью <b><F val={f.propArea} onChange={v => set('propArea', v)} w={50} /></b> м²,
                    комнат: <b><F val={f.propRooms} onChange={v => set('propRooms', v)} w={40} /></b>
                    {f.propFloor && <>, этаж: <b><F val={f.propFloor} onChange={v => set('propFloor', v)} w={60} /></b></>}.
                </p>
                <p style={{ textIndent: '1.5em' }}>
                    1.2. Продавец гарантирует, что объект не заложен, не арестован, правами третьих лиц не обременён, в споре не состоит.
                </p>

                <h4 style={{ fontWeight: 700, marginTop: 20 }}>2. ЦЕНА И ПОРЯДОК РАСЧЁТОВ</h4>
                <p style={{ textIndent: '1.5em' }}>
                    2.1. Цена объекта составляет <b><F val={f.salePrice} onChange={v => set('salePrice', v)} w={100} /></b> ({numWords(Number(f.salePrice))}) белорусских рублей.
                </p>
                <p style={{ textIndent: '1.5em' }}>
                    2.2. Расчёт производится в течение <F val={f.paymentDeadline} onChange={v => set('paymentDeadline', v)} w={40} /> рабочих дней с даты подписания Договора.
                </p>
                <p style={{ textIndent: '1.5em' }}>
                    2.3. Форма оплаты — безналичный перевод на счёт Продавца либо наличными средствами.
                </p>

                <h4 style={{ fontWeight: 700, marginTop: 20 }}>3. ПЕРЕДАЧА ОБЪЕКТА</h4>
                <p style={{ textIndent: '1.5em' }}>
                    3.1. Объект передаётся Покупателю в течение <F val={f.transferDeadline} onChange={v => set('transferDeadline', v)} w={40} /> дней после полной оплаты по Акту приёма-передачи.
                </p>
                <p style={{ textIndent: '1.5em' }}>
                    3.2. Риск случайной гибели переходит к Покупателю с момента подписания Акта.
                </p>
                <p style={{ textIndent: '1.5em' }}>
                    3.3. Государственная регистрация перехода права собственности — в течение <F val={f.registrationDays} onChange={v => set('registrationDays', v)} w={40} /> дней.
                </p>

                <h4 style={{ fontWeight: 700, marginTop: 20 }}>4. ПРАВА И ОБЯЗАННОСТИ СТОРОН</h4>
                <p style={{ textIndent: '1.5em' }}>
                    4.1. Продавец обязан: своевременно передать объект; предоставить все правоустанавливающие документы; устранить обременения.
                </p>
                <p style={{ textIndent: '1.5em' }}>
                    4.2. Покупатель обязан: произвести оплату в срок; принять объект по Акту; зарегистрировать право собственности.
                </p>

                <h4 style={{ fontWeight: 700, marginTop: 20 }}>5. ОТВЕТСТВЕННОСТЬ СТОРОН</h4>
                <p style={{ textIndent: '1.5em' }}>
                    5.1. При просрочке оплаты Покупатель уплачивает пеню <F val={f.penalty} onChange={v => set('penalty', v)} w={40} />% от суммы долга за каждый день просрочки.
                </p>
                <p style={{ textIndent: '1.5em' }}>
                    5.2. При нарушении сроков передачи объекта Покупатель вправе требовать возврата уплаченных средств с неустойкой.
                </p>

                <h4 style={{ fontWeight: 700, marginTop: 20 }}>6. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ</h4>
                <p style={{ textIndent: '1.5em' }}>6.1. Договор составлен в двух экземплярах, имеющих равную юридическую силу.</p>
                <p style={{ textIndent: '1.5em' }}>6.2. Изменения и дополнения — только в письменной форме, подписанной обеими Сторонами.</p>
                <p style={{ textIndent: '1.5em' }}>6.3. По вопросам, не урегулированным настоящим Договором, применяется законодательство Республики Беларусь.</p>

                <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Дополнительные условия:</Text>
                    <Input.TextArea
                        value={f.extraClauses}
                        onChange={e => set('extraClauses', e.target.value)}
                        rows={2}
                        placeholder="Введите дополнительные условия..."
                        style={{ fontFamily: '"Times New Roman", serif', fontSize: 13, marginTop: 4 }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 48 }}>
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>ПРОДАВЕЦ:</div>
                        <div><F val={f.sellerName} onChange={v => set('sellerName', v)} w={200} /></div>
                        {f.sellerPassport && <div style={{ fontSize: 11 }}>Паспорт: {f.sellerPassport}</div>}
                        {f.sellerAddress && <div style={{ fontSize: 11 }}>{f.sellerAddress}</div>}
                        <div style={{ marginTop: 36, borderTop: '1px solid #333', paddingTop: 4, fontSize: 11 }}>подпись / расшифровка</div>
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>ПОКУПАТЕЛЬ:</div>
                        <div><F val={f.buyerName} onChange={v => set('buyerName', v)} w={200} /></div>
                        {f.buyerPassport && <div style={{ fontSize: 11 }}>Паспорт: {f.buyerPassport}</div>}
                        {f.buyerAddress && <div style={{ fontSize: 11 }}>{f.buyerAddress}</div>}
                        <div style={{ marginTop: 36, borderTop: '1px solid #333', paddingTop: 4, fontSize: 11 }}>подпись / расшифровка</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Main Contracts page ───────────────────────────────────────────────────── */
export function Contracts() {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [docOpen, setDocOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<any>(null);
    const [form] = Form.useForm();
    const role = getRole();

    const { data: contracts = [], isLoading } = useQuery({
        queryKey: ['contracts'],
        queryFn: () => apiClient.get('/contracts').then(r => r.data),
    });
    const { data: availableProps = [] } = useQuery({
        queryKey: ['props_avail'],
        queryFn: () => apiClient.get('/properties').then(r => r.data.filter((p: any) => p.status === 'available')),
    });
    const { data: tenants = [] } = useQuery({
        queryKey: ['tenants_all'],
        queryFn: () => apiClient.get('/tenants').then(r => r.data),
    });

    const createMutation = useMutation({
        mutationFn: (vals: any) => {
            const { dates, ...rest } = vals;
            return apiClient.post('/contracts', {
                ...rest,
                start_date: dates[0].format('YYYY-MM-DD'),
                end_date: dates[1].format('YYYY-MM-DD'),
            });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['contracts'] });
            qc.invalidateQueries({ queryKey: ['props_avail'] });
            setOpen(false);
            form.resetFields();
            message.success('Договор создан');
        },
        onError: (e: any) => message.error(e.response?.data?.detail || 'Ошибка'),
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            apiClient.patch(`/contracts/${id}/status`, { status }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['contracts'] });
            qc.invalidateQueries({ queryKey: ['props_avail'] });
            qc.invalidateQueries({ queryKey: ['props'] });
            message.success('Статус договора изменён');
        },
        onError: (e: any) => message.error(e.response?.data?.detail || 'Ошибка'),
    });

    const columns = [
        {
            title: 'Номер',
            dataIndex: 'number',
            render: (v: string) => <Text strong style={{ fontFamily: 'monospace' }}>{v}</Text>,
        },
        {
            title: 'Тип',
            dataIndex: 'contract_type',
            render: (v: string) => <Tag color="blue">{CONTRACT_TYPE_LABELS[v] || v}</Tag>,
        },
        {
            title: 'Объект',
            key: 'prop',
            render: (_: any, r: any) => r.property
                ? <Text>{r.property.city}, {r.property.street}</Text>
                : <Text type="secondary">—</Text>,
        },
        {
            title: 'Арендатор / Покупатель',
            key: 'tenant',
            render: (_: any, r: any) => r.tenant?.name || <Text type="secondary">—</Text>,
        },
        {
            title: 'Период',
            key: 'period',
            render: (_: any, r: any) => (
                <Text style={{ fontSize: 12 }}>{r.start_date} — {r.end_date}</Text>
            ),
        },
        {
            title: 'Сумма',
            dataIndex: 'rent_amount',
            render: (v: number) => <Text strong>{Number(v).toLocaleString()} BYN</Text>,
        },
        {
            title: 'Статус',
            dataIndex: 'status',
            render: (s: string) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s] || s}</Tag>,
        },
        {
            title: 'Действия',
            key: 'doc',
            render: (_: any, r: any) => (
                <Space size={4} wrap>
                    <Button
                        size="small"
                        icon={<FileWordOutlined />}
                        onClick={() => { setSelectedContract(r); setDocOpen(true); }}
                    >
                        Документ
                    </Button>
                    {r.status === 'active' && (role === 'admin' || role === 'landlord') && (
                        <>
                            <Tooltip title="Завершить договор">
                                <Popconfirm
                                    title="Завершить договор?"
                                    description="Объект будет переведён в статус «Свободен»."
                                    onConfirm={() => statusMutation.mutate({ id: r.id, status: 'finished' })}
                                    okText="Завершить" cancelText="Отмена"
                                >
                                    <Button size="small" icon={<CheckOutlined />} style={{ color: '#16a34a', borderColor: '#16a34a' }} />
                                </Popconfirm>
                            </Tooltip>
                            <Tooltip title="Расторгнуть договор">
                                <Popconfirm
                                    title="Расторгнуть договор?"
                                    description="Объект будет переведён в статус «Свободен»."
                                    onConfirm={() => statusMutation.mutate({ id: r.id, status: 'terminated' })}
                                    okText="Расторгнуть" cancelText="Отмена"
                                    okButtonProps={{ danger: true }}
                                >
                                    <Button size="small" danger icon={<StopOutlined />} />
                                </Popconfirm>
                            </Tooltip>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    const isSaleContract = selectedContract?.property?.listing_type === 'sale';

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Договоры</Title>
                    <Text type="secondary">Управление договорами аренды и купли-продажи</Text>
                </div>
                {(role === 'admin' || role === 'landlord') && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
                        Новый договор
                    </Button>
                )}
            </div>

            <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 16 }}>
                <Table
                    dataSource={contracts as any[]}
                    rowKey="id"
                    loading={isLoading}
                    columns={columns}
                    style={{ padding: '0 4px' }}
                />
            </Card>

            {/* Create contract modal */}
            <Modal
                title={<Space><FileTextOutlined /> Создание договора</Space>}
                open={open}
                onCancel={() => setOpen(false)}
                onOk={() => form.submit()}
                okText="Создать"
                width={600}
                confirmLoading={createMutation.isPending}
            >
                <Form form={form} layout="vertical" onFinish={vals => createMutation.mutate(vals)}>
                    <Form.Item name="contract_type" label="Тип договора" rules={[{ required: true }]} initialValue="standard">
                        <Select options={[
                            { value: 'standard', label: 'Стандартный договор найма' },
                            { value: 'short_term', label: 'Краткосрочный (посуточно)' },
                            { value: 'commercial', label: 'Коммерческая недвижимость' },
                        ]} />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="property_id" label="Объект" rules={[{ required: true }]}>
                                <Select
                                    placeholder="Выберите объект"
                                    options={(availableProps as any[]).map((p: any) => ({
                                        value: p.id,
                                        label: `${p.city}, ${p.street} (${p.listing_type === 'sale' ? 'продажа' : 'аренда'})`,
                                    }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="tenant_id" label="Арендатор / Покупатель" rules={[{ required: true }]}>
                                <Select
                                    placeholder="Выберите арендатора"
                                    showSearch
                                    optionFilterProp="label"
                                    options={(tenants as any[]).map((t: any) => ({
                                        value: t.id,
                                        label: `${t.name} (${t.phone})`,
                                    }))}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="dates" label="Период" rules={[{ required: true }]}>
                        <DatePicker.RangePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="rent_amount" label="Сумма (BYN)" rules={[{ required: true }]}>
                                <InputNumber min={0} style={{ width: '100%' }} addonAfter="BYN" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="payment_period" label="Шаг платежей" initialValue="month">
                                <Select options={[
                                    { value: 'month', label: 'Ежемесячно' },
                                    { value: 'quarter', label: 'Ежеквартально' },
                                ]} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {/* Document modal */}
            <Modal
                open={docOpen}
                onCancel={() => setDocOpen(false)}
                footer={null}
                width="min(960px, 96vw)"
                title={
                    <Space>
                        <FileWordOutlined style={{ color: isSaleContract ? '#7c3aed' : '#2563eb' }} />
                        <span>
                            {isSaleContract ? 'Договор купли-продажи' : 'Договор найма'} № {selectedContract?.number}
                        </span>
                        <Tag color={STATUS_COLORS[selectedContract?.status]}>
                            {STATUS_LABELS[selectedContract?.status]}
                        </Tag>
                    </Space>
                }
                styles={{ body: { padding: '16px 24px 24px', background: '#f1f5f9' } }}
            >
                {selectedContract && (
                    isSaleContract
                        ? <SaleContractDoc contract={selectedContract} />
                        : <RentContractDoc contract={selectedContract} />
                )}
            </Modal>
        </>
    );
}
