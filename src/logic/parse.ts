import type { Expr } from './types';
import { A, Bot, F, I, N, O, V } from './build';

interface Token {
  type: string;
  value: string;
  pos: number;
}

const MULTI_CHAR: [string, string][] = [
  ['_|_', 'bottom'],
  ['<=>', 'iff'],
  ['<->', 'iff'],
  ['->', 'impl'],
  ['=>', 'impl'],
];

const SINGLE_CHAR: Record<string, string> = {
  '\u00ac': 'not',
  '\u22a5': 'bottom',
  '\u2227': 'and',
  '\u2228': 'or',
  '\u2192': 'impl',
  '\u2194': 'iff',
  '&': 'and',
  '|': 'or',
  '~': 'not',
  '!': 'not',
  '-': 'not',
  '(': 'lp',
  ')': 'rp',
  ';': 'semi',
};

const WORDS: Record<string, string> = {
  not: 'not',
  and: 'and',
  or: 'or',
  iff: 'iff',
  if: 'if',
  then: 'then',
  implies: 'impl',
  implication: 'impl',
  equivalent: 'iff',
  equivalence: 'iff',
  bottom: 'bottom',
  false: 'bottom',
};

function tokenize(src: string): { tokens: Token[]; error?: string } {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }
    let matched = false;
    for (const [tok, type] of MULTI_CHAR) {
      if (src.startsWith(tok, i)) {
        tokens.push({ type, value: tok, pos: i });
        i += tok.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    if (SINGLE_CHAR[ch] !== undefined) {
      tokens.push({ type: SINGLE_CHAR[ch], value: ch, pos: i });
      i++;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      const word = src.slice(i, j);
      const lower = word.toLowerCase();
      tokens.push({ type: WORDS[lower] ?? 'var', value: word, pos: i });
      i = j;
      continue;
    }
    return { tokens: [], error: `Unexpected character "${ch}" at position ${i + 1}.` };
  }
  tokens.push({ type: 'eof', value: '', pos: src.length });
  return { tokens };
}

class Parser {
  private i = 0;
  private err?: string;
  private toks: Token[];

  constructor(toks: Token[]) {
    this.toks = toks;
  }

  private peek(): Token {
    return this.toks[this.i] ?? this.toks[this.toks.length - 1];
  }

  private next(): Token {
    return this.toks[this.i++] ?? this.toks[this.toks.length - 1];
  }

  private fail(msg: string): null {
    this.err = msg;
    return null;
  }

  parseTop(): Expr | null {
    const e = this.parseIff();
    if (!e) return null;
    if (this.peek().type !== 'eof') {
      return this.fail(`Unexpected token "${this.peek().value}" after the expression.`);
    }
    return e;
  }

  get error(): string | undefined {
    return this.err;
  }

  private parseIff(): Expr | null {
    let left = this.parseImpl();
    if (!left) return null;
    while (this.peek().type === 'iff') {
      this.next();
      const right = this.parseImpl();
      if (!right) return null;
      left = F(left, right);
    }
    return left;
  }

  private parseImpl(): Expr | null {
    if (this.peek().type === 'if') {
      this.next();
      const left = this.parseOr();
      if (!left) return null;
      if (this.peek().type !== 'then') return this.fail('Expected "then".');
      this.next();
      const right = this.parseImpl();
      if (!right) return null;
      return I(left, right);
    }
    let left = this.parseOr();
    if (!left) return null;
    while (this.peek().type === 'impl') {
      this.next();
      const right = this.parseImpl();
      if (!right) return null;
      left = I(left, right);
    }
    return left;
  }

  private parseOr(): Expr | null {
    let left = this.parseAnd();
    if (!left) return null;
    while (this.peek().type === 'or') {
      this.next();
      const right = this.parseAnd();
      if (!right) return null;
      left = O(left, right);
    }
    return left;
  }

  private parseAnd(): Expr | null {
    let left = this.parseNot();
    if (!left) return null;
    while (this.peek().type === 'and') {
      this.next();
      const right = this.parseNot();
      if (!right) return null;
      left = A(left, right);
    }
    return left;
  }

  private parseNot(): Expr | null {
    if (this.peek().type === 'not') {
      this.next();
      const e = this.parseNot();
      return e ? N(e) : null;
    }
    return this.parseAtom();
  }

  private parseAtom(): Expr | null {
    const t = this.peek();
    if (t.type === 'lp') {
      this.next();
      const e = this.parseIff();
      if (!e) return null;
      if (this.peek().type !== 'rp') return this.fail('Expected ")".');
      this.next();
      return e;
    }
    if (t.type === 'bottom') {
      this.next();
      return Bot;
    }
    if (t.type === 'var') {
      this.next();
      return V(t.value);
    }
    if (t.type === 'eof') return this.fail('Unexpected end of expression.');
    return this.fail(`Unexpected token "${t.value}".`);
  }
}

export function parseExprText(text: string): { expr: Expr | null; error?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { expr: null, error: 'Empty expression.' };
  const { tokens, error } = tokenize(trimmed);
  if (error) return { expr: null, error };
  const p = new Parser(tokens);
  const expr = p.parseTop();
  if (expr) return { expr };
  return { expr: null, error: p.error ?? 'Cannot parse expression.' };
}

export interface ParsedProblem {
  premises: Expr[];
  goal: Expr;
}

export function parseProblemText(text: string): { problems: ParsedProblem[]; errors: string[] } {
  const errors: string[] = [];
  const problems: ParsedProblem[] = [];
  const blocks: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (blocks.length > 0 && blocks[blocks.length - 1].length > 0) blocks.push([]);
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (!last || last.length === 0) {
      blocks.push([trimmed]);
    } else {
      last.push(trimmed);
    }
  }
  const nonEmpty = blocks.filter((b) => b.length > 0);

  if (nonEmpty.length === 0) {
    errors.push('No problems found. Write at least two lines per problem and separate problems with a blank line.');
    return { problems, errors };
  }

  nonEmpty.forEach((lines, bi) => {
    const num = bi + 1;
    const goalText = lines[lines.length - 1];
    const premiseTexts: string[] = [];
    for (let i = 0; i < lines.length - 1; i++) {
      for (const part of lines[i].split(';')) {
        const t = part.trim();
        if (t) premiseTexts.push(t);
      }
    }
    if (premiseTexts.length === 0) {
      errors.push(`Problem ${num}: needs at least one premise before the goal line.`);
      return;
    }
    const premises: Expr[] = [];
    for (const t of premiseTexts) {
      const r = parseExprText(t);
      if (!r.expr) {
        errors.push(`Problem ${num}: premise "${t}" — ${r.error}.`);
        return;
      }
      premises.push(r.expr);
    }
    const g = parseExprText(goalText);
    if (!g.expr) {
      errors.push(`Problem ${num}: goal "${goalText}" — ${g.error}.`);
      return;
    }
    problems.push({ premises, goal: g.expr });
  });

  return { problems, errors };
}