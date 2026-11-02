import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './styles.css';
import { LanguageProvider } from './i18n';
import { CountryProvider } from './country';

createRoot(document.getElementById('root')!).render(<StrictMode><CountryProvider><LanguageProvider><BrowserRouter><App /></BrowserRouter></LanguageProvider></CountryProvider></StrictMode>);
