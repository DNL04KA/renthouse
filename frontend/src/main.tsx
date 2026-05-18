import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import 'antd/dist/reset.css';
import 'leaflet/dist/leaflet.css';
import './index.css';
import { ConfigProvider } from 'antd';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ConfigProvider theme={{
            token: {
                colorPrimary: '#2563eb',
                borderRadius: 8,
                fontFamily: 'Inter, sans-serif'
            },
            components: {
                Button: {
                    controlHeight: 40,
                    fontWeight: 600
                },
                Card: {
                    borderRadiusLG: 16
                }
            }
        }}>
            <App />
        </ConfigProvider>
    </React.StrictMode>
);
