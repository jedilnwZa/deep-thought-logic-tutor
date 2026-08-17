import { useState } from 'react';
import type { Expr, Problem, ReprMode } from '../logic/types';
import { parseExpression } from '../logic/parser';
import { formatExpr } from '../logic/format';

interface Props {
  reprMode: ReprMode;
  savedProblems: Problem[];
  onCreate: (problem: Problem) => void;
  onLoad: (problem: Problem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function CreateProblemModal({ reprMode, savedProblems, onCreate, onLoad, onDelete, onClose }: Props) {
  const [premises, setPremises] = useState<string[]>(['', '']);
  const [goal, setGoal] = useState('');

  const parsedPremises = premises.map((p) => parseExpression(p));
  const parsedGoal = parseExpression(goal);
  const nonEmptyCount = premises.filter((p) => p.trim()).length;
  const allValid = nonEmptyCount > 0 && parsedPremises.every((r, i) => !premises[i].trim() || r.ok) && parsedGoal.ok;
  const canCreate = allValid && parsedGoal.ok && premises.some((p) => p.trim());

  function updatePremise(i: number, value: string) {
    setPremises((prev) => prev.map((p, idx) => (idx === i ? value : p)));
  }

  function addPremise() {
    setPremises((prev) => [...prev, '']);
  }

  function removePremise(i: number) {
    setPremises((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  function handleCreate() {
    if (!canCreate || !parsedGoal.ok) return;
    const exprs = premises
      .filter((p) => p.trim())
      .map((p) => (parseExpression(p) as { ok: true; expr: Expr }).expr);
    const problem: Problem = {
      id: `custom-${Date.now()}`,
      level: 0,
      code: 'Custom',
      premises: exprs,
      goal: parsedGoal.expr,
      custom: true,
    };
    onCreate(problem);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h3>Create Your Own Problem</h3>
        <p className="modal__hint">
          Type expressions using either words or symbols — both work anywhere:{' '}
          <code>not</code>/<code>¬</code>/<code>!</code>, <code>and</code>/<code>∧</code>/<code>&amp;</code>,{' '}
          <code>or</code>/<code>∨</code>/<code>|</code>, <code>if...then</code>/<code>-&gt;</code>/<code>→</code>,{' '}
          <code>iff</code>/<code>&lt;-&gt;</code>/<code>↔</code>. Example: <code>if P and not Q then R or S</code>
        </p>

        {savedProblems.length > 0 && (
          <div className="saved-problems">
            <h4>Your Saved Problems</h4>
            <ul className="saved-problems__list">
              {savedProblems.map((p) => (
                <li key={p.id} className="saved-problems__item">
                  <span className="saved-problems__goal">Goal: {formatExpr(p.goal, reprMode)}</span>
                  <span className="saved-problems__actions">
                    <button onClick={() => onLoad(p)}>Load</button>
                    <button className="saved-problems__delete" onClick={() => onDelete(p.id)}>
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="problem-form">
          <label className="problem-form__label">Premises</label>
          {premises.map((p, i) => {
            const result = parsedPremises[i];
            const showError = p.trim() && !result.ok;
            const showPreview = p.trim() && result.ok;
            return (
              <div className="problem-form__row" key={i}>
                <div className="problem-form__field">
                  <input
                    type="text"
                    value={p}
                    placeholder={`Premise ${i + 1}, e.g. if P then Q`}
                    onChange={(e) => updatePremise(i, e.target.value)}
                    className={showError ? 'problem-form__input problem-form__input--error' : 'problem-form__input'}
                  />
                  {showError && !result.ok && <div className="problem-form__error">{result.error}</div>}
                  {showPreview && result.ok && (
                    <div className="problem-form__preview">
                      {formatExpr(result.expr, 'english')} &nbsp;·&nbsp; {formatExpr(result.expr, 'symbolic')}
                    </div>
                  )}
                </div>
                <button
                  className="problem-form__remove"
                  onClick={() => removePremise(i)}
                  disabled={premises.length <= 1}
                  aria-label="Remove premise"
                  title="Remove premise"
                >
                  ×
                </button>
              </div>
            );
          })}
          <button className="problem-form__add" onClick={addPremise}>
            + Add Premise
          </button>

          <label className="problem-form__label problem-form__label--goal">Goal</label>
          <div className="problem-form__field">
            <input
              type="text"
              value={goal}
              placeholder="Goal, e.g. R or S"
              onChange={(e) => setGoal(e.target.value)}
              className={
                goal.trim() && !parsedGoal.ok
                  ? 'problem-form__input problem-form__input--error'
                  : 'problem-form__input'
              }
            />
            {goal.trim() && !parsedGoal.ok && <div className="problem-form__error">{parsedGoal.error}</div>}
            {goal.trim() && parsedGoal.ok && (
              <div className="problem-form__preview">
                {formatExpr(parsedGoal.expr, 'english')} &nbsp;·&nbsp; {formatExpr(parsedGoal.expr, 'symbolic')}
              </div>
            )}
          </div>
        </div>

        <div className="modal__footer">
          <button className="modal__cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="modal__primary" onClick={handleCreate} disabled={!canCreate}>
            Create &amp; Load Problem
          </button>
        </div>
      </div>
    </div>
  );
}
