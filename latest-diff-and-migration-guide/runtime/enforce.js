const FORBIDDEN_GIT_EXACT = [
  'git add',
  'git rm',
  'git mv',
  'git commit',
  'git push',
  'git stash',
  'git merge',
  'git rebase',
  'git clean',
  'git reset',
];

const FORBIDDEN_GIT_FLAG_RULES = [
  { prefix: 'git checkout', flag: '--', rule: 'git checkout -- <file>' },
  { prefix: 'git checkout', flag: 'HEAD', rule: 'git checkout HEAD -- <file>' },
  { prefix: 'git branch', flag: '-d', rule: 'git branch -d' },
  { prefix: 'git branch', flag: '-D', rule: 'git branch -D' },
  { prefix: 'git branch', flag: '-m', rule: 'git branch -m' },
  { prefix: 'git tag', flag: '-a', rule: 'git tag -a' },
  { prefix: 'git tag', flag: '-d', rule: 'git tag -d' },
  { prefix: 'git remote', flag: 'add', rule: 'git remote add' },
  { prefix: 'git remote', flag: 'remove', rule: 'git remote remove' },
  { prefix: 'git remote', flag: 'set-url', rule: 'git remote set-url' },
];

const ALLOWED_GIT_PREFIXES = [
  'git status',
  'git diff',
  'git log',
  'git show',
  'git rev-parse',
  'git rev-list',
  'git branch',
  'git remote -v',
  'git tag',
  'git describe',
  'git ls-files',
  'git cat-file',
];

const FORBIDDEN_DEPENDENCY_EXACT = [
  'npm install',
  'npm update',
  'npm audit fix',
  'pnpm install',
  'pnpm up',
  'yarn install',
  'yarn upgrade',
  'pip install',
  'poetry update',
  'poetry add',
  'uv add',
  'uv pip install',
  'uv lock',
];

const ALLOWED_DEPENDENCY_PREFIXES = [
  'npm outdated',
  'pnpm outdated',
  'yarn outdated',
  'pip list --outdated',
  'poetry show --outdated',
  'uv tree',
];

const SHELL_SEPARATORS = ['&&', '||', ';', '|'];
const GIT_ALIASES = new Map([
  ['co', 'checkout'],
  ['ci', 'commit'],
  ['st', 'status'],
  ['br', 'branch'],
]);

function normalizeWhitespace(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function splitSegments(command) {
  const segments = [];
  let buffer = '';

  for (const token of command.split(/(\&\&|\|\||;|\|)/)) {
    if (SHELL_SEPARATORS.includes(token)) {
      if (buffer.trim()) segments.push(buffer.trim());
      buffer = '';
      continue;
    }
    buffer += token;
  }

  if (buffer.trim()) segments.push(buffer.trim());
  return segments;
}

function expandGitAlias(segment) {
  const tokens = normalizeWhitespace(segment).split(' ');
  if (tokens[0] !== 'git' || tokens.length < 2) return normalizeWhitespace(segment);
  const alias = GIT_ALIASES.get(tokens[1]);
  if (!alias) return normalizeWhitespace(segment);
  return normalizeWhitespace(['git', alias, ...tokens.slice(2)].join(' '));
}

function isExactOrPrefix(normalized, prefix) {
  return normalized === prefix || normalized.startsWith(`${prefix} `);
}

function forbiddenResult(reason, rule) {
  return { safety: 'forbidden', reasons: [reason], matchedRules: rule ? [rule] : [] };
}

function allowedResult(reason, rule) {
  return { safety: 'allowed', reasons: [reason], matchedRules: rule ? [rule] : [] };
}

function grayResult(reason, rule) {
  return { safety: 'gray-area', reasons: [reason], matchedRules: rule ? [rule] : [] };
}

function assessGitSegment(segment) {
  const normalized = expandGitAlias(segment);

  if (!normalized.startsWith('git ')) {
    return grayResult('Non-git command requires dependency or separate review.');
  }

  for (const exact of FORBIDDEN_GIT_EXACT) {
    if (isExactOrPrefix(normalized, exact)) {
      return forbiddenResult(`Matches forbidden git write command: ${exact}.`, exact);
    }
  }

  for (const rule of FORBIDDEN_GIT_FLAG_RULES) {
    if (normalized.startsWith(`${rule.prefix} `) && normalized.includes(` ${rule.flag}`)) {
      return forbiddenResult(`Matches forbidden git flag pattern: ${rule.rule}.`, rule.rule);
    }
  }

  for (const prefix of ALLOWED_GIT_PREFIXES) {
    if (isExactOrPrefix(normalized, prefix)) {
      return allowedResult(`Matches allowed read-only git command: ${prefix}.`, prefix);
    }
  }

  if (isExactOrPrefix(normalized, 'git fetch')) {
    if (normalized.includes(' --dry-run') || normalized.endsWith(' --dry-run')) {
      return grayResult('git fetch --dry-run is context-dependent and should not be automatic.', 'git fetch --dry-run');
    }
    return forbiddenResult('git fetch may update local refs and is not allowed by this runtime.', 'git fetch');
  }

  return forbiddenResult('Unknown git command defaults to refusal.');
}

function assessDependencySegment(segment) {
  const normalized = normalizeWhitespace(segment);

  for (const exact of FORBIDDEN_DEPENDENCY_EXACT) {
    if (isExactOrPrefix(normalized, exact)) {
      return forbiddenResult(`Matches forbidden dependency write command: ${exact}.`, exact);
    }
  }

  for (const prefix of ALLOWED_DEPENDENCY_PREFIXES) {
    if (isExactOrPrefix(normalized, prefix)) {
      return allowedResult(`Matches allowed dependency inspection command: ${prefix}.`, prefix);
    }
  }

  return grayResult('Unknown non-git command requires separate review.');
}

function combineAssessments(assessments) {
  const safety = assessments.some((item) => item.safety === 'forbidden')
    ? 'forbidden'
    : assessments.some((item) => item.safety === 'gray-area')
      ? 'gray-area'
      : 'allowed';

  return {
    safety,
    reasons: assessments.flatMap((item) => item.reasons),
    matchedRules: assessments.flatMap((item) => item.matchedRules),
  };
}

function assessGitCommand(command) {
  const segments = splitSegments(command);
  if (segments.length !== 1) {
    return forbiddenResult('Shell command composition is not allowed in this runtime.');
  }
  return assessGitSegment(segments[0]);
}

function assessDependencyCommand(command) {
  const segments = splitSegments(command);
  if (segments.length !== 1) {
    return forbiddenResult('Shell command composition is not allowed in this runtime.');
  }
  return assessDependencySegment(segments[0]);
}

function assessCommand(command) {
  const segments = splitSegments(command);
  if (segments.length !== 1) {
    return forbiddenResult('Shell command composition is not allowed in this runtime.');
  }

  const normalized = normalizeWhitespace(segments[0]);
  const assessment = normalized.startsWith('git ')
    ? assessGitSegment(normalized)
    : assessDependencySegment(normalized);
  return combineAssessments([assessment]);
}

function assertReadOnlyCommand(command) {
  const assessment = assessCommand(command);
  if (assessment.safety !== 'allowed') {
    throw new Error(assessment.reasons.join(' '));
  }
}

module.exports = {
  assessCommand,
  assertReadOnlyCommand,
  assessGitCommand,
  assessDependencyCommand,
};
