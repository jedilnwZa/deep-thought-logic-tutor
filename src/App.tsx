import { useEffect, useMemo, useState } from 'react';
import type { Problem, ProofNode, ReprMode, Rule, RuleResult } from './logic/types';
import { collectVars, exprKey, N } from './logic/build';
import { positionForNew, initialPremiseLayout } from './logic/layout';
import { PROBLEMS, LEVEL_COUNT, problemsForLevel } from './data/problems';
import { findHint } from './logic/hint';
import { RULES_BY_ID } from './logic/rules';
import { formatExpr } from './logic/format';
import RulesPanel from './components/RulesPanel';
import ProofCanvas from './components/ProofCanvas';
import ProofTable from './components/ProofTable';
import ControlPanel from './components/ControlPanel';
import MessageBox from './components/MessageBox';
import ChoiceModal from './components/ChoiceModal';
import InfoPanel from './components/InfoPanel';
import './App.css';

let uid = 0;
const nextId = () => `n${uid++}`;

type Theme = 'light' | 'dark';
const THEME_KEY = 'deep-thought-theme';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function buildNodesFromProblem(problem: Problem): { nodes: ProofNode[]; nextLine: number } {
  const positions = initialPremiseLayout(problem.premises.length);
  const nodes: ProofNode[] = problem.premises.map((expr, i) => ({
    id: nextId(),
    expr,
    isPremise: true,
    isGoal: false,
    sourceIds: [],
    ruleApplied: 'Given',
    lineNumber: i + 1,
    x: positions[i].x,
    y: positions[i].y,
  }));
  const goalNode: ProofNode = {
    id: nextId(),
    expr: problem.goal,
    isPremise: false,
    isGoal: true,
    sourceIds: [],
    ruleApplied: '',
    lineNumber: 'C',
    x: 350,
    y: 620,
  };
  nodes.push(goalNode);
  return { nodes, nextLine: problem.premises.length + 1 };
}

export default function App() {
  const [level, setLevel] = useState(1);
  const [levelsCompleted, setLevelsCompleted] = useState(0);
  const [levelQueue, setLevelQueue] = useState<Problem[]>(() => problemsForLevel(1));
  const [problem, setProblem] = useState<Problem>(() => levelQueue[0]);
  const [{ nodes, nextLine }, setState] = useState(() => buildNodesFromProblem(problem));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reprMode, setReprMode] = useState<ReprMode>('english');
  const [message, setMessage] = useState('Welcome to Deep Thought! Select premises and apply a rule to begin.');
  const [pendingChoice, setPendingChoice] = useState<{ rule: Rule; results: RuleResult[]; sourceIds: string[] } | null>(
    null
  );
  const [isIndirect, setIsIndirect] = useState(false);
  const [solved, setSolved] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const goalNode = nodes.find((n) => n.isGoal)!;
  const allVars = useMemo(() => {
    const s = new Set<string>();
    problem.premises.forEach((p) => collectVars(p, s));
    collectVars(problem.goal, s);
    return Array.from(s);
  }, [problem]);

  function loadProblem(p: Problem) {
    const built = buildNodesFromProblem(p);
    setProblem(p);
    setState(built);
    setSelectedIds([]);
    setIsIndirect(false);
    setSolved(false);
    setPendingChoice(null);
    setMessage(`Loaded problem ${p.code}. Select premises and apply a rule.`);
  }

  function onSelect(id: string) {
    if (solved) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  function onMove(id: string, x: number, y: number) {
    setState((s) => ({ ...s, nodes: s.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)) }));
  }

  function finalizeAdd(result: RuleResult, rule: Rule, sourceIds: string[]) {
    const existing = nodes.find((n) => !n.isGoal && exprKey(n.expr) === exprKey(result.expr));
    if (existing) {
      setMessage(`That expression is already on the proof (line ${existing.lineNumber}).`);
      setSelectedIds([existing.id]);
      setPendingChoice(null);
      return;
    }
    const sourceNodes = sourceIds.map((id) => nodes.find((n) => n.id === id)!).filter(Boolean);
    const pos = positionForNew(sourceNodes, nodes);
    const newNode: ProofNode = {
      id: nextId(),
      expr: result.expr,
      isPremise: false,
      isGoal: false,
      sourceIds,
      ruleApplied: rule.label,
      lineNumber: nextLine,
      x: pos.x,
      y: pos.y,
    };
    const newNodes = [...nodes, newNode];
    setState({ nodes: newNodes, nextLine: nextLine + 1 });
    setSelectedIds([]);
    setPendingChoice(null);

    const isWin = exprKey(result.expr) === exprKey(goalNode.expr);
    if (isWin) {
      setSolved(true);
      setMessage(`Proof complete! Line ${newNode.lineNumber}: ${formatExpr(result.expr, reprMode)} matches the goal. Great work.`);
    } else {
      setMessage(`Applied ${rule.sublabel}: derived "${formatExpr(result.expr, reprMode)}" on line ${newNode.lineNumber}.`);
    }
  }

  function onApplyRule(rule: Rule) {
    if (solved) {
      setMessage('This problem is already solved. Try "Skip Current Problem" to continue.');
      return;
    }
    if (selectedIds.length < rule.min || selectedIds.length > rule.max) {
      const need = rule.min === rule.max ? `exactly ${rule.min}` : `${rule.min}-${rule.max}`;
      setMessage(`${rule.sublabel} (${rule.label}) requires selecting ${need} node(s). You have ${selectedIds.length} selected.`);
      return;
    }
    const selectedExprs = selectedIds.map((id) => nodes.find((n) => n.id === id)!.expr);
    const results = rule.apply(selectedExprs, allVars);
    if (results.length === 0) {
      setMessage(`${rule.sublabel} does not apply to the selected expression(s). Try a different selection.`);
      return;
    }
    if (results.length === 1) {
      finalizeAdd(results[0], rule, selectedIds);
    } else {
      setPendingChoice({ rule, results, sourceIds: selectedIds });
    }
  }

  function onDelete() {
    if (selectedIds.length !== 1) {
      setMessage('Select exactly one derived node to delete.');
      return;
    }
    const id = selectedIds[0];
    const node = nodes.find((n) => n.id === id);
    if (!node || node.isPremise || node.isGoal) {
      setMessage('Only derived nodes can be deleted.');
      return;
    }
    if (nodes.some((n) => n.sourceIds.includes(id))) {
      setMessage('This node is used to derive another line, so it cannot be deleted. Delete dependents first.');
      return;
    }
    const remaining = nodes.filter((n) => n.id !== id);
    // renumber derived nodes sequentially, keep premises fixed
    const premises = remaining.filter((n) => n.isPremise).sort((a, b) => Number(a.lineNumber) - Number(b.lineNumber));
    const derived = remaining
      .filter((n) => !n.isPremise && !n.isGoal)
      .sort((a, b) => Number(a.lineNumber) - Number(b.lineNumber));
    const goal = remaining.find((n) => n.isGoal)!;
    let ln = premises.length + 1;
    const renumberedDerived = derived.map((n) => ({ ...n, lineNumber: ln++ }));
    setState({ nodes: [...premises, ...renumberedDerived, goal], nextLine: ln });
    setSelectedIds([]);
    setMessage('Node deleted.');
  }

  function onHint() {
    const currentExprs = nodes.filter((n) => !n.isGoal).map((n) => n.expr);
    const step = findHint(currentExprs, goalNode.expr);
    if (!step) {
      setMessage(
        isIndirect
          ? 'No hint found within the search depth. Try Simplification/DeMorgan on compound premises, or look for a direct contradiction.'
          : 'No hint found within the search depth. Try breaking down compound premises (Simp, DeMorgan) or consider "Change to Indirect Proof".'
      );
      return;
    }
    const operandIds = step.operandKeys
      .map((k) => nodes.find((n) => exprKey(n.expr) === k)?.id)
      .filter((x): x is string => !!x);
    setSelectedIds(operandIds);
    const ruleLabel = RULES_BY_ID[step.ruleId]?.label ?? step.ruleId;
    setMessage(
      `Hint: apply ${step.ruleLabel} (${ruleLabel}) to the highlighted node(s) to derive "${formatExpr(step.resultExpr, reprMode)}".`
    );
  }

  function onIndirect() {
    if (isIndirect) {
      setMessage('Already in indirect proof mode.');
      return;
    }
    const premiseNodes = nodes.filter((n) => n.isPremise);
    const assumption: ProofNode = {
      id: nextId(),
      expr: N(goalNode.expr),
      isPremise: true,
      isGoal: false,
      sourceIds: [],
      ruleApplied: 'Assumption (Indirect Proof)',
      lineNumber: nextLine,
      x: 20,
      y: 30,
    };
    // place assumption to the right of existing premises row
    const maxX = Math.max(...premiseNodes.map((n) => n.x), 0);
    assumption.x = maxX + 240;
    assumption.y = premiseNodes[0]?.y ?? 30;

    const newGoal: ProofNode = { ...goalNode, expr: { kind: 'Bottom' } };
    const rest = nodes.filter((n) => !n.isGoal);
    setState({ nodes: [...rest, assumption, newGoal], nextLine: nextLine + 1 });
    setIsIndirect(true);
    setMessage('Switched to indirect proof: assumed the negation of the goal; the new goal is a contradiction (⊥).');
  }

  function onRestart() {
    loadProblem(problem);
  }

  function onSkip() {
    if (levelQueue.length <= 1) {
      setMessage('No other problems in this level to skip to.');
      return;
    }
    const [first, ...rest] = levelQueue;
    const nq = [...rest, first];
    setLevelQueue(nq);
    loadProblem(nq[0]);
  }

  function advanceAfterSolve() {
    const rest = levelQueue.slice(1);
    if (rest.length === 0) {
      const nextLevel = level + 1;
      setLevelsCompleted((c) => c + 1);
      if (nextLevel > LEVEL_COUNT) {
        setLevelQueue([]);
        setMessage('Congratulations! You have completed all levels of Deep Thought.');
        return;
      }
      const nq = problemsForLevel(nextLevel);
      setLevel(nextLevel);
      setLevelQueue(nq);
      loadProblem(nq[0]);
    } else {
      setLevelQueue(rest);
      loadProblem(rest[0]);
    }
  }

  const totalProblems = PROBLEMS.length;

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Deep Thought — Logic Proof Tutor</h1>
        <div className="app-header__stats">
          <span>Current Level: {level}</span>
          <span>Problems Remaining This Level: {levelQueue.length}</span>
          <span>
            Levels Completed: {levelsCompleted}/{LEVEL_COUNT}
          </span>
          <span>Problem Code: {problem.code}</span>
          <span className="app-header__total">{totalProblems} problems loaded</span>
          <button
            className="theme-toggle"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="panel panel--canvas">
          <ProofCanvas
            nodes={nodes}
            selectedIds={selectedIds}
            reprMode={reprMode}
            onSelect={onSelect}
            onMove={onMove}
            canvasHeight={820}
          />
          <MessageBox message={message} />
          <ControlPanel
            onDelete={onDelete}
            onHint={onHint}
            onIndirect={onIndirect}
            onRestart={onRestart}
            onSkip={onSkip}
            indirectDisabled={isIndirect || solved}
          />
        </section>

        <section className="panel panel--rules">
          <RulesPanel onApply={onApplyRule} />
        </section>

        <section className="panel panel--right">
          <ProofTable nodes={nodes} reprMode={reprMode} />
          <InfoPanel reprMode={reprMode} onChangeRepr={setReprMode} onShowInstructions={() => setShowInstructions(true)} />
        </section>
      </main>

      {pendingChoice && (
        <ChoiceModal
          title={`${pendingChoice.rule.sublabel} — choose a result`}
          results={pendingChoice.results}
          reprMode={reprMode}
          onPick={(r) => finalizeAdd(r, pendingChoice.rule, pendingChoice.sourceIds)}
          onCancel={() => setPendingChoice(null)}
        />
      )}

      {solved && !pendingChoice && (
        <div className="win-banner">
          <span>Proof complete for {problem.code}!</span>
          <button onClick={advanceAfterSolve}>Next Problem →</button>
        </div>
      )}

      {showInstructions && (
        <div className="modal-overlay" onClick={() => setShowInstructions(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Instructions</h3>
            <p>
              Click premise or derived expression boxes to select them (up to 3 for rules like Constructive
              Dilemma). Click a rule in the middle panel to apply it to your selection. If a rule can produce more
              than one valid result, you'll be asked to choose which one to add. Drag boxes to rearrange the
              layout. Use <strong>Get Hint</strong> if you're stuck, <strong>Delete Node</strong> to remove an
              unused derived line, <strong>Change to Indirect Proof</strong> to assume the negation of the goal and
              aim for a contradiction (⊥), and <strong>Skip</strong> / <strong>Restart</strong> to manage the
              current problem. Reach the goal expression (shown at row "C") to complete the proof.
            </p>
            <button className="modal__cancel" onClick={() => setShowInstructions(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
