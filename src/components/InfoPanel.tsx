import type { ReprMode } from '../logic/types';

interface Props {
  reprMode: ReprMode;
  onChangeRepr: (m: ReprMode) => void;
  onShowInstructions: () => void;
}

export default function InfoPanel({ reprMode, onChangeRepr, onShowInstructions }: Props) {
  return (
    <div className="info-panel">
      <div className="representation">
        <h3>Representation</h3>
        <label>
          <input
            type="radio"
            name="repr"
            checked={reprMode === 'symbolic'}
            onChange={() => onChangeRepr('symbolic')}
          />
          Symbolic
        </label>
        <label>
          <input
            type="radio"
            name="repr"
            checked={reprMode === 'english'}
            onChange={() => onChangeRepr('english')}
          />
          English
        </label>
      </div>

      <div className="legend">
        <table>
          <tbody>
            <tr>
              <th>For</th>
              <th>Type</th>
            </tr>
            <tr>
              <td>A and B</td>
              <td>A ∧ B</td>
            </tr>
            <tr>
              <td>A or B</td>
              <td>A ∨ B</td>
            </tr>
            <tr>
              <td>not A</td>
              <td>¬A</td>
            </tr>
          </tbody>
        </table>
        <table>
          <tbody>
            <tr>
              <th>For</th>
              <th>Type</th>
            </tr>
            <tr>
              <td>if A then B</td>
              <td>A → B</td>
            </tr>
            <tr>
              <td>A iff B</td>
              <td>A ↔ B</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="deep-thought-card">
        <h2>Deep Thought</h2>
        <p className="dt-subtitle">
          <em>A Logic Proof Tutor</em>
        </p>
        <p>Version 2.0 (React)</p>
        <div className="dt-buttons">
          <button onClick={onShowInstructions}>Instructions</button>
          <button onClick={onShowInstructions}>Window Information</button>
          <button onClick={onShowInstructions}>Contact/Version Information</button>
        </div>
      </div>
    </div>
  );
}
