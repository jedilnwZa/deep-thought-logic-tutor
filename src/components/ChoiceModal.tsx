import type { RuleResult, ReprMode } from '../logic/types';
import { formatExpr } from '../logic/format';

interface Props {
  title: string;
  results: RuleResult[];
  reprMode: ReprMode;
  onPick: (r: RuleResult) => void;
  onCancel: () => void;
}

export default function ChoiceModal({ title, results, reprMode, onPick, onCancel }: Props) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p className="modal__hint">Multiple results are possible — choose one to add to the proof:</p>
        <div className="modal__options">
          {results.map((r, i) => (
            <button key={i} className="modal__option" onClick={() => onPick(r)}>
              {formatExpr(r.expr, reprMode)}
              {r.description && <span className="modal__option-desc"> ({r.description})</span>}
            </button>
          ))}
        </div>
        <button className="modal__cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
