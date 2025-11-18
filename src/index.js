// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx'; // आपका मुख्य कॉम्पोनेंट
import './index.css'; // यदि यह फ़ाइल मौजूद है

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
