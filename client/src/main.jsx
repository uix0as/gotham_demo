import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/geist';
import '@fontsource-variable/noto-sans-kr';
import './styles/globals.css';
import './styles/workspace.css';
import App from './App';
import { Providers } from './context/Providers';

createRoot(document.getElementById('root')).render(
  <StrictMode><BrowserRouter><Providers><App /></Providers></BrowserRouter></StrictMode>,
);
