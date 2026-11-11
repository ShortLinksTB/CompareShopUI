import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './styles.css';
import { LanguageProvider } from './i18n';
import { CountryProvider } from './country';
import { AuthSessionProvider } from './auth/AuthSession';

createRoot(document.getElementById('root')!).render(<StrictMode><CountryProvider><LanguageProvider><AuthSessionProvider><BrowserRouter><App /></BrowserRouter></AuthSessionProvider></LanguageProvider></CountryProvider></StrictMode>);
