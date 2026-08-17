import type { Expr } from './types';
import { A, O, I, F, N, V } from './build';

type TokenType = 'NOT' | 'AND' | 'OR' | 'ARROW' | 'IFF' | 'IF' | 'THEN' | 'LPAREN' | 'RPAREN' | 'IDENT' | 'EOF';

interface Token {
  type: TokenType;
  text: string;
  pos: number;
}

const KEYWORDS: Record<string, TokenType> = {
  not: 'NOT',
  and: 'AND',
  or: 'OR',
  if: 'IF',
  then: 'THEN',
  iff: 'IFF',
};

class ParseIssue extends Error {
  pos: number;
  constructor(message: string, pos: number) {
    super(message);
    this.pos = pos;
  }
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;
  while (i < n) {
    const c = input[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '(') {
      tokens.push({ type: 'LPAREN', text: c, pos: i });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ type: 'RPAREN', text: c, pos: i });
      i++;
      continue;
    }
    if (c === '<') {
      if (input.slice(i, i + 3) === '<->') {
        tokens.push({ type: 'IFF', text: '<->', pos: i });
        i += 3;
        continue;
      }
      if (input.slice(i, i + 3) === '<=>') {
        tokens.push({ type: 'IFF', text: '<=>', pos: i });
        i += 3;
        continue;
      }
      throw new ParseIssue(`Unexpected "<" — did you mean "<->" or "<=>" for iff?`, i);
    }
    if (c === '-') {
      if (input[i + 1] === '>') {
        tokens.push({ type: 'ARROW', text: '->', pos: i });
        i += 2;
        continue;
      }
      tokens.push({ type: 'NOT', text: '-', pos: i });
      i++;
      continue;
    }
    if (c === '=') {
      if (input[i + 1] === '>') {
        tokens.push({ type: 'ARROW', text: '=>', pos: i });
        i += 2;
        continue;
      }
      tokens.push({ type: 'IFF', text: '=', pos: i });
      i++;
      continue;
    }
    if (c === '¬' || c === '!' || c === '~') {
      tokens.push({ type: 'NOT', text: c, pos: i });
      i++;
      continue;
    }
    if (c === '∧' || c === '&') {
      tokens.push({ type: 'AND', text: c, pos: i });
      i++;
      continue;
    }
    if (c === '∨' || c === '|') {
      tokens.push({ type: 'OR', text: c, pos: i });
      i++;
      continue;
    }
    if (c === '→') {
      tokens.push({ type: 'ARROW', text: c, pos: i });
      i++;
      continue;
    }
    if (c === '↔') {
      tokens.push({ type: 'IFF', text: c, pos: i });
      i++;
      continue;
    }
    if (/[A-Za-z]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_]/.test(input[j])) j++;
      const word = input.slice(i, j);
      const kw = KEYWORDS[word.toLowerCase()];
      if (kw) {
        tokens.push({ type: kw, text: word, pos: i });
      } else {
        tokens.push({ type: 'IDENT', text: word, pos: i });
      }
      i = j;
      continue;
    }
    throw new ParseIssue(`Unexpected character "${c}"`, i);
  }
  tokens.push({ type: 'EOF', text: '', pos: n });
  return tokens;
}

class Parser {
  tokens: Token[];
  idx = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  peek(): Token {
    return this.tokens[this.idx];
  }

  match(type: TokenType): Token | null {
    if (this.peek().type === type) {
      return this.tokens[this.idx++];
    }
    return null;
  }

  expect(type: TokenType, label: string): Token {
    const t = this.match(type);
    if (!t) {
      throw new ParseIssue(`Expected ${label} but found "${this.peek().text || 'end of input'}"`, this.peek().pos);
    }
    return t;
  }

  parseExpr(): Expr {
    return this.parseIff();
  }

  parseIff(): Expr {
    let left = this.parseArrow();
    while (this.match('IFF')) {
      const right = this.parseArrow();
      left = F(left, right);
    }
    return left;
  }

  parseArrow(): Expr {
    if (this.match('IF')) {
      const left = this.parseOr();
      this.expect('THEN', '"then"');
      const right = this.parseArrow();
      return I(left, right);
    }
    const left = this.parseOr();
    if (this.match('ARROW')) {
      const right = this.parseArrow();
      return I(left, right);
    }
    return left;
  }

  parseOr(): Expr {
    let left = this.parseAnd();
    while (this.match('OR')) {
      const right = this.parseAnd();
      left = O(left, right);
    }
    return left;
  }

  parseAnd(): Expr {
    let left = this.parseNot();
    while (this.match('AND')) {
      const right = this.parseNot();
      left = A(left, right);
    }
    return left;
  }

  parseNot(): Expr {
    if (this.match('NOT')) {
      return N(this.parseNot());
    }
    return this.parseAtom();
  }

  parseAtom(): Expr {
    if (this.match('LPAREN')) {
      const e = this.parseExpr();
      this.expect('RPAREN', '")"');
      return e;
    }
    const ident = this.match('IDENT');
    if (ident) {
      return V(ident.text);
    }
    const t = this.peek();
    if (t.type === 'THEN') {
      throw new ParseIssue(`Found "then" without a matching "if"`, t.pos);
    }
    throw new ParseIssue(`Expected a variable or "(" but found "${t.text || 'end of input'}"`, t.pos);
  }
}

export type ParseResult = { ok: true; expr: Expr } | { ok: false; error: string; pos: number };

export function parseExpression(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: 'This field is empty.', pos: 0 };
  }
  try {
    const tokens = tokenize(trimmed);
    const parser = new Parser(tokens);
    const expr = parser.parseExpr();
    const trailing = parser.peek();
    if (trailing.type !== 'EOF') {
      throw new ParseIssue(`Unexpected "${trailing.text}" after a complete expression`, trailing.pos);
    }
    return { ok: true, expr };
  } catch (err) {
    if (err instanceof ParseIssue) {
      return { ok: false, error: err.message, pos: err.pos };
    }
    return { ok: false, error: 'Could not parse this expression.', pos: 0 };
  }
}
