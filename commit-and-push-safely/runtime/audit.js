const GIT_WRITE_COMMAND_PATTERN = /\bgit\s+(add|commit|push)\b/i;

const UNSAFE_ACTION_PATTERNS = [
  /\bauto-?(commit|push)\b/i,
  /\bI\s+pushed\b/i,
  /\bI\s+(will|can|am going to)\s+(run\s+|execute\s+|perform\s+)?git\s+(add|commit|push)\b/i,
  /\b(this skill|we|I)\s+(will|can|should|must)\s+(run|execute|perform)\b.*\bgit\s+(add|commit|push)\b/i,
];

const SAFE_BOUNDARY_PATTERNS = [
  /\bmanual\b/i,
  /\bmanually\b/i,
  /\buser\s+must\b/i,
  /\bmust\s+not\b/i,
  /\bdo\s+not\s+run\b/i,
  /\bdoes\s+not\s+run\b/i,
  /\bnot\s+execute\b/i,
  /\bdoes\s+not\s+execute\b/i,
  /\bnever\b/i,
  /\bcannot\s+perform\b/i,
  /\bcan't\s+perform\b/i,
  /\bprohibited\b/i,
  /\bdraft-only\b/i,
];

const EXECUTION_INSTRUCTION_PATTERNS = [
  /^\s*(?:[-*]\s*)?(run|execute|perform)\s+git\s+(add|commit|push)\b/i,
  /\b(next|then)\b.*\bgit\s+(add|commit|push)\b/i,
  /\b(run|execute|perform)\b.*\bgit\s+(add|commit|push)\b/i,
  /\bwill\b.*\bgit\s+(add|commit|push)\b/i,
];

function hasSafeBoundaryContext(line) {
  return SAFE_BOUNDARY_PATTERNS.some((pattern) => pattern.test(line));
}

function hasUnsafeInstructionContext(line) {
  return EXECUTION_INSTRUCTION_PATTERNS.some((pattern) => pattern.test(line));
}

function auditGitWriteMentions(text) {
  const issues = [];

  for (const pattern of UNSAFE_ACTION_PATTERNS) {
    if (pattern.test(text)) {
      issues.push({
        level: 'fail',
        message: `Output contains unsafe git write action phrasing matching ${pattern}.`,
      });
    }
  }

  for (const line of text.split(/\r?\n/)) {
    if (!GIT_WRITE_COMMAND_PATTERN.test(line)) continue;
    if (hasSafeBoundaryContext(line)) continue;

    if (hasUnsafeInstructionContext(line)) {
      issues.push({
        level: 'fail',
        message: `Output contains unsafe git write instruction: ${line.trim()}`,
      });
      continue;
    }

    issues.push({
      level: 'warning',
      message: `Output mentions a git write command without explicit manual-boundary context: ${line.trim()}`,
    });
  }

  return issues;
}

function containsUnsafeGitWriteInstruction(text) {
  return auditGitWriteMentions(text).some((issue) => issue.level === 'fail');
}

function auditOutput(text) {
  const issues = auditGitWriteMentions(text);

  if (!/manual/i.test(text)) {
    issues.push({
      level: 'warning',
      message: 'Output should remind the user that git write operations remain manual.',
    });
  }

  return issues;
}

module.exports = {
  auditGitWriteMentions,
  containsUnsafeGitWriteInstruction,
  auditOutput,
};
