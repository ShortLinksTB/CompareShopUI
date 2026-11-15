import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from './i18n';
import { getHomePartners, type HomePartner } from './partnersApi';

export function HomePartners() {
  const { t } = useLanguage();
  const [partners, setPartners] = useState<HomePartner[] | null>(null);

  useEffect(() => {
    let active = true;
    getHomePartners().then(result => {
      if (active) setPartners(result);
    }).catch(() => {
      if (active) setPartners([]);
    });
    return () => { active = false; };
  }, []);

  if (partners?.length === 0) return null;

  return <section className="partners" aria-label={t('partnersTitle')}>
    <div className="partners-heading"><span className="eyebrow">{t('trustedPlaces')}</span><h2>{t('partnersTitle')}</h2><p>{t('partnerDescription')}</p></div>
    <div className="partner-grid" aria-busy={partners === null}>
      {partners === null
        ? Array.from({ length: 12 }, (_, index) => <span className="partner-card partner-placeholder" key={index} aria-hidden="true" />)
        : partners.map(partner => <Link className="partner-card" to={`/shops/${encodeURIComponent(partner.slug)}`} key={partner.slug} aria-label={partner.name}><span className="partner-wordmark" aria-hidden="true">{partner.name}</span></Link>)}
    </div>
    <div className="trust-grid"><div className="trust-card"><span className="trust-icon">⌕</span><span><b>{t('trustFast')}</b><small>{t('trustFastDesc')}</small></span></div><div className="trust-card"><span className="trust-icon">✓</span><span><b>{t('trustClear')}</b><small>{t('trustClearDesc')}</small></span></div><div className="trust-card"><span className="trust-icon">◷</span><span><b>{t('trustTime')}</b><small>{t('trustTimeDesc')}</small></span></div><div className="trust-card"><span className="trust-icon">♡</span><span><b>{t('trustFree')}</b><small>{t('trustFreeDesc')}</small></span></div></div>
  </section>;
}
