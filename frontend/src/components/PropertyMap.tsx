import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Tag } from 'antd';
import { useNavigate } from 'react-router-dom';

// Fix default marker icons (Leaflet + vite issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const rentIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const saleIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const singleIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const TYPE_LABELS: Record<string, string> = {
    flat: 'Квартира', office: 'Офис', warehouse: 'Склад', other: 'Коммерческая',
};

function FitBounds({ coords }: { coords: [number, number][] }) {
    const map = useMap();
    useEffect(() => {
        if (coords.length === 1) {
            map.setView(coords[0], 15);
        } else if (coords.length > 1) {
            map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 14 });
        }
    }, [coords, map]);
    return null;
}

// List mode — catalog map with many properties
interface ListProps {
    properties: any[];
    height?: number;
}

// Single mode — property detail page
interface SingleProps {
    latitude: number;
    longitude: number;
    address?: string;
    title?: string;
    height?: number;
}

type Props = ListProps | SingleProps;

function isSingle(p: Props): p is SingleProps {
    return 'latitude' in p && 'longitude' in p;
}

export function PropertyMap(props: Props) {
    const navigate = useNavigate();

    if (isSingle(props)) {
        const { latitude, longitude, address, title, height = 340 } = props;
        return (
            <div>
                {title && (
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: '#374151' }}>{title}</div>
                )}
                <MapContainer
                    center={[latitude, longitude]}
                    zoom={15}
                    style={{ height, width: '100%', borderRadius: 16, zIndex: 0 }}
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <FitBounds coords={[[latitude, longitude]]} />
                    <Marker position={[latitude, longitude]} icon={singleIcon}>
                        <Popup>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13 }}>
                                {address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
                            </div>
                        </Popup>
                    </Marker>
                </MapContainer>
            </div>
        );
    }

    const { properties, height = 520 } = props;
    const withCoords = properties.filter(p => p.latitude && p.longitude);
    const coords: [number, number][] = withCoords.map(p => [p.latitude, p.longitude]);
    const center: [number, number] = coords.length > 0 ? coords[0] : [53.9045, 27.5615];

    return (
        <MapContainer
            center={center}
            zoom={12}
            style={{ height, width: '100%', borderRadius: 16, zIndex: 0 }}
            scrollWheelZoom
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds coords={coords} />

            {withCoords.map(p => (
                <Marker
                    key={p.id}
                    position={[p.latitude, p.longitude]}
                    icon={p.listing_type === 'sale' ? saleIcon : rentIcon}
                >
                    <Popup minWidth={240}>
                        <div style={{ fontFamily: 'Inter, sans-serif' }}>
                            {p.images?.[0] && (
                                <img
                                    src={p.images[0]}
                                    alt="property"
                                    style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
                                />
                            )}
                            <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                                <Tag color={p.listing_type === 'sale' ? 'purple' : 'blue'} style={{ margin: 0 }}>
                                    {p.listing_type === 'sale' ? 'Продажа' : 'Аренда'}
                                </Tag>
                                <Tag style={{ margin: 0 }}>{TYPE_LABELS[p.type] || p.type}</Tag>
                                {p.rooms && <Tag style={{ margin: 0 }}>{p.rooms} комн.</Tag>}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: p.listing_type === 'sale' ? '#7c3aed' : '#2563eb', marginBottom: 2 }}>
                                {p.listing_type === 'sale' && p.sale_price
                                    ? `${Number(p.sale_price).toLocaleString()} ${p.currency || 'BYN'}`
                                    : `${Number(p.base_rent).toLocaleString()} ${p.currency || 'BYN'}/мес`}
                            </div>
                            <div style={{ color: '#374151', fontWeight: 600, marginBottom: 2, fontSize: 13 }}>
                                {p.city}, {p.street}, {p.house}
                            </div>
                            <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 10 }}>
                                {p.area} м²{p.floor ? ` · ${p.floor} эт.` : ''}
                            </div>
                            <button
                                onClick={() => navigate(`/properties/${p.id}`)}
                                style={{
                                    width: '100%', padding: '7px 0',
                                    background: '#2563eb', color: '#fff',
                                    border: 'none', borderRadius: 8,
                                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                                }}
                            >
                                Подробнее →
                            </button>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
