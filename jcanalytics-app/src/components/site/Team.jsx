import { t } from '../../i18n/locale';
import { ArrowUpRight } from 'lucide-react';
import { TEAM } from '../../data/team';
import { Label, MaskLines, Reveal } from './primitives';
import { wa } from './links';
import MobileRail from './MobileRail';
import '../../styles/closing.css';

const TeamCard = ({ person, index }) => (
  <Reveal delay={index * 0.08} className={`team-member team-member--${index + 1}`}>
    <div className="team-member__portrait" style={{ background: person.portraitBg }}>
      <img src={person.portrait} alt={`${person.name}, ${person.role}`} width={720} height={960} loading="lazy" decoding="async" className="team-member__image" />
      <div className="team-member__caption" aria-hidden="true">
        <span>JC / {String(index + 1).padStart(2, '0')}</span>
        <ArrowUpRight size={17} />
      </div>
    </div>
    <div className="team-member__details">
      <p className="team-member__area">{person.area}</p>
      <h3 className="font-display">{person.name}</h3>
      <p className="team-member__role">{person.role}</p>
      <p className="team-member__bio">{person.bio}</p>
      <ul className="team-member__skills" aria-label={t(`Especialidades de ${person.first}`, `${person.first}’s specialties`)}>
        {person.skills.map((skill) => <li key={skill}>{skill}</li>)}
      </ul>
      <a href={wa(person.wa)} target="_blank" rel="noreferrer" className="team-member__link">
        <span>{t('Escribile a', 'Message')} {person.first}</span><ArrowUpRight size={17} aria-hidden="true" />
      </a>
    </div>
  </Reveal>
);

const Team = () => (
  <section id="equipo" className="team-section scroll-mt-24" aria-labelledby="team-title">
    <div className="closing-container">
      <div className="closing-heading team-heading">
        <div>
          <Label className="closing-label">{t("Las personas / Equipo", "The people / Team")}</Label>
          <h2 id="team-title" className="closing-title font-display">
            <MaskLines lines={[t("Las personas", "The people"), <span key="people" className="font-serif italic font-normal">{t("detrás.", "behind it.")}</span>]} />
          </h2>
        </div>
        <Reveal delay={0.15} className="team-heading__intro">
          <span className="closing-kicker">{t("Cercanía, de principio a fin.", "Personal, from start to finish.")}</span>
          <p>{t("Cuatro personas, sin intermediarios. Con la que hablás es la que hace el trabajo.", "Four people, no middlemen. The person you talk to is the person doing the work.")}</p>
        </Reveal>
      </div>
      <MobileRail className="team-grid" label={t("Personas del equipo", "Meet the team")}>
        {TEAM.map((person, index) => <TeamCard key={person.id} person={person} index={index} />)}
      </MobileRail>
      <Reveal className="team-signature">
        <span className="closing-kicker">{t("Un equipo. Una misma dirección.", "One team. One shared direction.")}</span>
        <p className="font-display">
          {TEAM.map((person, index) => (
            <span key={person.id}>
              <span>{person.first}</span>{' '}
              <span className="font-serif italic font-normal team-signature__action">{person.does}</span>
              {index < TEAM.length - 2 ? ', ' : index === TEAM.length - 2 ? t(" y ", " and ") : '.'}
            </span>
          ))}
        </p>
      </Reveal>
    </div>
  </section>
);
export default Team;
