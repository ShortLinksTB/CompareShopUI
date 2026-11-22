import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from './i18n';
import { getHomePartners, type HomePartner } from './partnersApi';
import { useCountry } from './country';

export function HomePartners() {
  const { t } = useLanguage();
  const { country } = useCountry();
  const [partners, setPartners] = useState<HomePartner[] | null>(null);
  const [error, setError] = useState(false);
  const requestId = useRef(0);
  const load = (selectedCountry = country) => {
    const currentRequestId = ++requestId.current;
    setPartners(null);
    setError(false);
    getHomePartners(selectedCountry).then(result => {
      if (currentRequestId === requestId.current) setPartners(result);
    }).catch(() => {
      if (currentRequestId === requestId.current) { setPartners(null); setError(true); }
    });
  };

  useEffect(() => {
    load(country);
    return () => { requestId.current += 1; };
  }, [country]);

  if (partners?.length === 0 && !error) return null;

  return <section className="partners" aria-label={t('partnersTitle')}>
    <div className="partners-heading"><span className="eyebrow">{t('trustedPlaces')}</span><h2>{t('partnersTitle')}</h2><p>{t('partnerDescription')}</p></div>
    {error && <p role="alert">{t('searchSuggestionsUnavailable')} <button type="button" className="button button-ghost" onClick={() => load()}>{t('tryAgain')}</button></p>}
    <div className="partner-grid" aria-busy={partners === null}>
      {partners === null
        ? Array.from({ length: 12 }, (_, index) => <span className="partner-card partner-placeholder" key={index} aria-hidden="true" />)
        : partners.map(partner => <Link className="partner-card" to={`/shops/${encodeURIComponent(partner.slug)}`} key={partner.slug} aria-label={partner.name}><span className="partner-wordmark" aria-hidden="true">{partner.name}</span></Link>)}
    </div>
    <div className="trust-grid"><div className="trust-card"><span className="trust-icon">⌕</span><span><b>{t('trustFast')}</b><small>{t('trustFastDesc')}</small></span></div><div className="trust-card"><span className="trust-icon">✓</span><span><b>{t('trustClear')}</b><small>{t('trustClearDesc')}</small></span></div><div className="trust-card"><span className="trust-icon">◷</span><span><b>{t('trustTime')}</b><small>{t('trustTimeDesc')}</small></span></div><div className="trust-card"><span className="trust-icon">♡</span><span><b>{t('trustFree')}</b><small>{t('trustFreeDesc')}</small></span></div></div>
  </section>;
}
