interface Props {
  onDelete: () => void;
  onHint: () => void;
  onIndirect: () => void;
  onRestart: () => void;
  onSkip: () => void;
  indirectDisabled: boolean;
}

export default function ControlPanel({ onDelete, onHint, onIndirect, onRestart, onSkip, indirectDisabled }: Props) {
  return (
    <div className="control-panel">
      <button className="ctrl-btn ctrl-btn--delete" onClick={onDelete}>
        Delete Node
      </button>
      <button className="ctrl-btn ctrl-btn--hint" onClick={onHint}>
        Get Hint
      </button>
      <button className="ctrl-btn" onClick={onIndirect} disabled={indirectDisabled}>
        Change to Indirect Proof
      </button>
      <button className="ctrl-btn" onClick={onRestart}>
        Restart Current Problem
      </button>
      <button className="ctrl-btn" onClick={onSkip}>
        Skip Current Problem
      </button>
    </div>
  );
}
