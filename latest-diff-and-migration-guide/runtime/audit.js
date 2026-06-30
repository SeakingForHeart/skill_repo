const WRITE_COMMAND_PATTERN = /\b(?:git\s+(add|commit|push|merge|rebase|reset|clean|stash|checkout)|npm\s+(install|update)|pnpm\s+(install|up)|yarn\s+(install|upgrade)|pip\s+install|poetry\s+(update|add)|uv\s+(add|lock)|uv\s+pip\s+install)\b/i;

const UNSAFE_ACTION_PATTERNS = [
  /\bauto-?(upgrade|commit|push|install)\b/i,
  /\bI\s+(installed|upgraded|committed|pushed)\b/i,
  /\b(this runtime|this skill|we|I)\s+(will|can|should|must)\s+(run|execute|perform)\b.*\b(git\s+(add|commit|push|merge|rebase|reset)|npm\s+(install|update)|pnpm\s+up|yarn\s+upgrade|pip\s+install)\b/i,
];

const EXECUTION_INSTRUCTION_PATTERNS = [
  /^\s*(?:[-*]\s*)?(run|execute|perform)\s+(git\s+(add|commit|push|merge|rebase|reset)|npm\s+(install|update)|pnpm\s+(install|up)|yarn\s+(install|upgrade)|pip\s+install|poetry\s+(update|add)|uv\s+(add|lock))/i,
  /\b(next|then)\b.*\b(git\s+(add|commit|push|merge|rebase|reset)|npm\s+(install|update)|pnpm\s+up|yarn\s+upgrade|pip\s+install)\b/i,
];

const SAFE_BOUNDARY_PATTERNS = [
  /\bmanual\b/i,
  /\bmanually\b/i,
  /\buser\s+must\b/i,
  /\boutside\s+this\s+(skill|runtime)\b/i,
  /\bmust\s+not\b/i,
  /\bdo\s+not\s+run\b/i,
  /\bdoes\s+not\s+run\b/i,
  /\bnot\s+execute\b/i,
  /\bnever\b/i,
  /\bcannot\s+perform\b/i,
  /\bprohibited\b/i,
  /\bread-only\b/i,
];

function hasSafeBoundaryContext(line) {
  return SAFE_BOUNDARY_PATTERNS.some((pattern) => pattern.test(line));
}

function hasUnsafeInstructionContext(line) {
  return EXECUTION_INSTRUCTION_PATTERNS.some((pattern) => pattern.test(line));
}

function auditWriteMentions(text) {
  const issues = [];

  for (const pattern of UNSAFE_ACTION_PATTERNS) {
    if (pattern.test(text)) {
      issues.push({
        level: 'fail',
        message: `Output contains unsafe write/upgrade phrasing matching ${pattern}.`,
      });
    }
  }

  for (const line of text.split(/\r?\n/)) {
    if (!WRITE_COMMAND_PATTERN.test(line)) continue;
    if (hasSafeBoundaryContext(line)) continue;

    if (hasUnsafeInstructionContext(line)) {
      issues.push({
        level: 'fail',
        message: `Output contains unsafe execution-oriented instruction: ${line.trim()}`,
      });
      continue;
    }

    issues.push({
      level: 'warning',
      message: `Output mentions a write/upgrade command without explicit manual-boundary context: ${line.trim()}`,
    });
  }

  return issues;
}

function auditOutput(text) {
  const issues = auditWriteMentions(text);

  if (!/read-only|manual|does not run|do not run/i.test(text)) {
    issues.push({
      level: 'warning',
      message: 'Output should state the read-only/manual boundary for writes and upgrades.',
    });
  }

  return issues;
}

module.exports = {
  auditWriteMentions,
  auditOutput,
};
