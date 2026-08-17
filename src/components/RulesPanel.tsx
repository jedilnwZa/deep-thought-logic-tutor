import type { Rule } from '../logic/types';
import { RULES } from '../logic/rules';

interface Props {
  onApply: (rule: Rule) => void;
}

function pairUp<T>(arr: T[]): [T, T][] {
  const out: [T, T][] = [];
  for (let i = 0; i < arr.length; i += 2) out.push([arr[i], arr[i + 1]]);
  return out;
}

export default function RulesPanel({ onApply }: Props) {
  const rows = pairUp(RULES);
  return (
    <div className="rules-panel">
      <h2 className="rules-title">Rules</h2>
      <div className="rules-grid">
        {rows.map(([a, b], i) => (
          <div className="rules-row" key={i}>
            <RuleButton rule={a} onApply={onApply} />
            <RuleButton rule={b} onApply={onApply} />
          </div>
        ))}
      </div>
    </div>
  );
}

function RuleButton({ rule, onApply }: { rule: Rule; onApply: (r: Rule) => void }) {
  return (
    <button className="rule-btn" onClick={() => onApply(rule)} title={rule.sublabel}>
      <span className="rule-btn__label">{rule.label}</span>
      <span className="rule-btn__sub">{rule.sublabel}</span>
    </button>
  );
}
