import { useState } from 'react';
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

interface TipState {
  rule: Rule;
  x: number;
  y: number;
}

export default function RulesPanel({ onApply }: Props) {
  const [tip, setTip] = useState<TipState | null>(null);
  const rows = pairUp(RULES);

  return (
    <div className="rules-panel">
      <h2 className="rules-title">Rules</h2>
      <div className="rules-grid">
        {rows.map(([a, b], i) => (
          <div className="rules-row" key={i}>
            <RuleButton rule={a} onApply={onApply} onHover={setTip} />
            <RuleButton rule={b} onApply={onApply} onHover={setTip} />
          </div>
        ))}
      </div>
      {tip && <RuleTooltip tip={tip} />}
    </div>
  );
}

function RuleButton({
  rule,
  onApply,
  onHover,
}: {
  rule: Rule;
  onApply: (r: Rule) => void;
  onHover: (t: TipState | null) => void;
}) {
  return (
    <button
      className="rule-btn"
      onClick={() => onApply(rule)}
      onMouseEnter={(e) => onHover({ rule, x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => onHover({ rule, x: e.clientX, y: e.clientY })}
      onMouseLeave={() => onHover(null)}
    >
      <span className="rule-btn__label">{rule.label}</span>
      <span className="rule-btn__sub">{rule.sublabel}</span>
    </button>
  );
}

function RuleTooltip({ tip }: { tip: TipState }) {
  const { rule, x, y } = tip;
  const left = Math.min(x + 14, window.innerWidth - 330);
  const top = Math.min(y + 18, window.innerHeight - 150);
  const arity = rule.min === rule.max ? `${rule.min}` : `${rule.min}–${rule.max}`;
  return (
    <div className="rule-tip" style={{ left, top }}>
      <div className="rule-tip__title">
        {rule.label} — {rule.sublabel}
      </div>
      <div className="rule-tip__desc">{rule.description}</div>
      <div className="rule-tip__arity">
        Requires selecting {arity} expression{rule.max === 1 ? '' : 's'}
      </div>
    </div>
  );
}