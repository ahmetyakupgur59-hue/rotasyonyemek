import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <App />
);

// PWA: Çevrimdışı çalışma ve hızlı yükleme için register() yapıyoruz
serviceWorkerRegistration.register();