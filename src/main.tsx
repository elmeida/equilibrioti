import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

async function mount() {
  const Root = import.meta.env.DEV && import.meta.env.MODE === 'demo'
    ? (await import('./demo/DemoApp')).DemoApp
    : App;
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><Root /></React.StrictMode>,
  );
}

void mount();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => undefined);
  });
}
