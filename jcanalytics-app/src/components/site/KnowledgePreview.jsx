import { ArrowUpRight } from 'lucide-react';
import { articles, topics } from '../../content/catalog';
import { articlePath, journalPath } from '../../seo/routes';
import { locale, t } from '../../i18n/locale';
import '../../styles/journal.css';

export default function KnowledgePreview() {
  const practical = articles.filter(article => article.tool);
  const featured = practical.length ? [...practical, articles.find(item => item.id === 'human-review')].slice(0, 3) : ['data-quality', 'human-review', 'useful-websites'].map(id => articles.find(item => item.id === id));
  return <section className="knowledge-preview" id="ideas">
    <div className="journal-container">
      <div className="journal-section-heading"><div><span className="journal-eyebrow">JC / {t('CUADERNO DE IDEAS', 'FIELD NOTES')}</span><h2>{t('Buenas preguntas.', 'Better questions.')}<br /><em>{t('Mejores decisiones.', 'Better decisions.')}</em></h2></div><a className="journal-text-link" href={journalPath(locale)}>{t('Explorar todas las ideas', 'Explore all insights')} <ArrowUpRight size={20} /></a></div>
      <div className="journal-cards">{featured.map(article => <a className="journal-card" key={article.id} href={articlePath(article, locale)}>
        <div className="journal-card__image"><img src={article.image} alt="" width="1536" height="1024" loading="lazy" decoding="async" />{article.tool && <small className="journal-tool-badge">{t('Guía + herramienta', 'Guide + tool')}</small>}<span><ArrowUpRight size={22} /></span></div>
        <div className="journal-card__meta">{topics[article.topic][locale]}<span>{article.minutes} min</span></div><h3>{article[locale].title}</h3><p>{article[locale].summary}</p>
      </a>)}</div>
    </div>
  </section>;
}
