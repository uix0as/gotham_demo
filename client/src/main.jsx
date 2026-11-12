import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource-variable/noto-sans-kr';
import './styles/app.css';
import App from './App';
import { Providers } from './context/Providers';

createRoot(document.getElementById('root')).render(
  <StrictMode><BrowserRouter><Providers><App /></Providers></BrowserRouter></StrictMode>,
);
