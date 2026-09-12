import { STANDING_BADGE } from '../../utils/finance';

const BANDS = [
  { letter: 'E', min: 0,  max: 34  },
  { letter: 'D', min: 35, max: 49  },
  { letter: 'C', min: 50, max: 64  },
  { letter: 'B', min: 65, max: 79  },
  { letter: 'A', min: 80, max: 100 },
];

export function StandingBadge({ status }) {
  const b = STANDING_BADGE[status] || STANDING_BADGE.none;
  return <span className={`badge badge--${b.color} badge--dot`}>{b.label}</span>;
}

/** Compact score for table cells. */
export function ScoreCell({ standing }) {
  const { score, grade } = standing;
  return (
    <div className={`mf-score mf-score--${grade.tone}`}
      title={score == null ? 'No loan history' : `Repayment score ${score}/100 · ${grade.label}`}>
      <span className="mf-score__num">{score ?? '—'}</span>
      <span className="mf-score__bar"><i style={{ width: `${score ?? 0}%` }} /></span>
      <span className="mf-score__grade">{grade.letter}</span>
    </div>
  );
}

/** Full score card with banded scale and the facts behind the number. */
export function ScoreCard({ standing }) {
  const { score, grade } = standing;
  return (
    <div className="mf-scorecard">
      <div className="mf-scorecard__top">
        <div>
          <div className="mf-section-label" style={{ marginBottom: '.45rem' }}>Repayment score</div>
          <div className="mf-scorecard__value">
            <span className={`mf-scorecard__num mf-tone--${grade.tone}`}>{score ?? '—'}</span>
            <span className="mf-scorecard__of">/100</span>
          </div>
        </div>
        <div className={`mf-scorecard__grade mf-scorecard__grade--${grade.tone}`}>
          <b>{grade.letter}</b><span>{grade.label}</span>
        </div>
      </div>

      <div className="mf-scale" aria-hidden="true">
        {BANDS.map(b => (
          <span key={b.letter}
            className={`mf-scale__band mf-scale__band--${b.letter}${score != null && score >= b.min && score <= b.max ? ' is-active' : ''}`}>
            <i>{b.letter}</i>
          </span>
        ))}
        {score != null && <span className="mf-scale__marker" style={{ left: `${score}%` }} />}
      </div>

      {standing.n > 0 && (
        <ul className="mf-scorecard__facts">
          <li><span><b>{standing.paid}</b> of {standing.n} loan{standing.n === 1 ? '' : 's'} fully repaid</span></li>
          <li><span><b>{Math.round(standing.progress * 100)}%</b> of booked amount repaid</span></li>
          <li className={standing.overdue ? 'mf-tone--crimson' : ''}>
            <span><b>{standing.overdue}</b> overdue loan{standing.overdue === 1 ? '' : 's'}</span>
          </li>
        </ul>
      )}

      <p className="mf-scorecard__note">Derived from loan history in this system — not a credit bureau score.</p>
    </div>
  );
}
