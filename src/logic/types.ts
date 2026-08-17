export type Expr =
  | { kind: 'Var'; name: string }
  | { kind: 'Not'; e: Expr }
  | { kind: 'And'; l: Expr; r: Expr }
  | { kind: 'Or'; l: Expr; r: Expr }
  | { kind: 'Implies'; l: Expr; r: Expr }
  | { kind: 'Iff'; l: Expr; r: Expr }
  | { kind: 'Bottom' };

export type ReprMode = 'english' | 'symbolic';

export interface RuleResult {
  expr: Expr;
  description: string;
}

export interface Rule {
  id: string;
  label: string;
  sublabel: string;
  min: number;
  max: number;
  apply: (selected: Expr[], allVars: string[]) => RuleResult[];
}

export interface ProofNode {
  id: string;
  expr: Expr;
  isPremise: boolean;
  isGoal: boolean;
  sourceIds: string[];
  ruleApplied: string;
  lineNumber: number | string | null;
  x: number;
  y: number;
}

export interface Problem {
  id: string;
  level: number;
  code: string;
  premises: Expr[];
  goal: Expr;
}
