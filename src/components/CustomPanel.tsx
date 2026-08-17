import { useMemo, useState } from 'react';
import type { CustomSet } from '../data/customSets';
import { makeCustomProblem } from '../data/customSets';
import { parseProblemText } from '../logic/parse';

interface Props {
  sets: CustomSet[];
  onPlay: (set: CustomSet) => void;
  onDelete: (id: string) => void;
  onSave: (set: CustomSet) => void;
  onClose: () => void;
}

const EXAMPLE = `P and Q -> R ; P ; Q
R

A -> B
if not B then not A
`;

const SYNTAX_HELP = (
  <ul>
    <li>Each problem is two or more lines. The <strong>last line of a problem is the goal</strong>; the line(s) before it are premises. Premises on the same line are separated by <code>;</code>.</li>
    <li>Separate problems with a <strong>blank line</strong>.</li>
    <li>Variables: any word, e.g. <code>P</code>, <code>Q</code>, <code>A1</code>.</li>
    <li>Operators (English or symbolic):
      <code>not A</code> / <code>~A</code> / <code>¬A</code>,
      <code>A and B</code> / <code>A &amp; B</code> / <code>A ∧ B</code>,
      <code>A or B</code> / <code>A | B</code> / <code>A ∨ B</code>,
      <code>A -&gt; B</code> / <code>A =&gt; B</code> / <code>A → B</code> / <code>if A then B</code>,
      <code>A &lt;-&gt; B</code> / <code>A ↔ B</code> / <code>A iff B</code>,
      <code>_|_</code> / <code>⊥</code> for a contradiction.
    </li>
    <li>Use parentheses to group: <code>not (A and B)</code>.</li>
  </ul>
);

export default function CustomPanel({ sets, onPlay, onDelete, onSave, onClose }: Props) {
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [name, setName] = useState('');
  const [text, setText] = useState('');

  const parsed = useMemo(() => parseProblemText(text), [text]);
  const valid = parsed.errors.length === 0 && parsed.problems.length > 0;

  function resetEditor() {
    setName('');
    setText('');
  }

  function createSet() {
    if (!valid || !name.trim()) return;
    const setId = `cs-${Date.now()}`;
    const problems = parsed.problems.map((p, i) => makeCustomProblem(p.premises, p.goal, i + 1, setId));
    onSave({
      id: setId,
      name: name.trim(),
      createdAt: Date.now(),
      problems,
    });
    resetEditor();
    setView('list');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        {view === 'list' ? (
          <>
            <h3>Custom Problem Sets</h3>
            <p className="modal__hint">Create and solve your own proof problems.</p>
            <details className="custom-help">
              <summary>Format help</summary>
              {SYNTAX_HELP}
            </details>
            <div className="custom-set-list">
              {sets.length === 0 && (
                <p className="custom-empty">No custom sets yet. Create your first one below.</p>
              )}
              {sets.map((s) => (
                <div className="custom-set" key={s.id}>
                  <div className="custom-set__info">
                    <span className="custom-set__name">{s.name}</span>
                    <span className="custom-set__meta">{s.problems.length} problems</span>
                  </div>
                  <button className="modal__option modal__option--play" onClick={() => onPlay(s)}>
                    Play
                  </button>
                  <button className="modal__option modal__option--danger" onClick={() => onDelete(s.id)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <div className="modal__actions">
              <button className="modal__primary" onClick={() => setView('editor')}>
                Create New Set
              </button>
              <button className="modal__cancel" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <h3>Create Custom Problem Set</h3>
            <label className="custom-label">
              Set name
              <input
                className="custom-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Practice Set"
              />
            </label>
            <label className="custom-label">
              Problems
              <textarea
                className="custom-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={'P -> Q ; P\nQ\n\nA and B\nB and A'}
                rows={12}
              />
            </label>
            <div className="custom-actions">
              <button className="modal__cancel" onClick={() => setText(EXAMPLE)}>
                Load Example
              </button>
            </div>
            <div className="custom-errors">
              {parsed.errors.length === 0 ? (
                text.trim() ? (
                  <span className="custom-ok">{parsed.problems.length} valid problem(s) ready.</span>
                ) : (
                  <span className="custom-empty-note">Type problems above to see live validation.</span>
                )
              ) : (
                <ul>
                  {parsed.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="modal__actions">
              <button className="modal__primary" onClick={createSet} disabled={!valid || !name.trim()}>
                Save Set
              </button>
              <button
                className="modal__cancel"
                onClick={() => {
                  resetEditor();
                  setView('list');
                }}
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}