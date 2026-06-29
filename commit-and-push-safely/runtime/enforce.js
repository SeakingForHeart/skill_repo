const FORBIDDEN_EXACT = [
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

const FORBIDDEN_FLAG_RULES = [
  { prefix: 'git branch', flag: '-d', rule: 'git branch -d' },
  { prefix: 'git branch', flag: '-D', rule: 'git branch -D' },
  { prefix: 'git branch', flag: '-m', rule: 'git branch -m' },
  { prefix: 'git checkout', flag: '--', rule: 'git checkout -- <file>' },
  { prefix: 'git checkout', flag: 'HEAD', rule: 'git checkout HEAD -- <file>' },
  { prefix: 'git tag', flag: '-a', rule: 'git tag -a' },
  { prefix: 'git tag', flag: '-d', rule: 'git tag -d' },
  { prefix: 'git remote', flag: 'add', rule: 'git remote add' },
  { prefix: 'git remote', flag: 'remove', rule: 'git remote remove' },
  { prefix: 'git remote', flag: 'set-url', rule: 'git remote set-url' },
  { prefix: 'git config', flag: '--global', rule: 'git config --global' },
  { prefix: 'git config', flag: '--local', rule: 'git config --local' },
];

const ALLOWED_PREFIXES = [
  'git status',
  'git diff',
  'git log',
  'git branch',
  'git remote -v',
  'git remote',
  'git ls-files',
  'git ls-tree',
  'git cat-file',
  'git rev-parse',
  'git rev-list',
  'git blame',
  'git show',
  'git describe',
  'git count-objects',
  'git fsck',
];

const GRAY_AREA_PREFIXES = ['git fetch', 'git clone'];
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

function expandAlias(segment) {
  const tokens = normalizeWhitespace(segment).split(' ');
  if (tokens[0] !== 'git' || tokens.length < 2) return normalizeWhitespace(segment);
  const alias = GIT_ALIASES.get(tokens[1]);
  if (!alias) return normalizeWhitespace(segment);
  return normalizeWhitespace(['git', alias, ...tokens.slice(2)].join(' '));
}

function assessSegment(segment) {
  const normalized = expandAlias(segment);
  const reasons = [];
  const matchedRules = [];

  if (!normalized.startsWith('git ')) {
    return {
      safety: 'gray-area',
      reasons: ['Non-git command requires separate review.'],
      matchedRules: [],
    };
  }

  for (const exact of FORBIDDEN_EXACT) {
    if (normalized === exact || normalized.startsWith(`${exact} `)) {
      reasons.push(`Matches forbidden git write command: ${exact}.`);
      matchedRules.push(exact);
      return { safety: 'forbidden', reasons, matchedRules };
    }
  }

  for (const rule of FORBIDDEN_FLAG_RULES) {
    if (normalized.startsWith(`${rule.prefix} `) && normalized.includes(` ${rule.flag}`)) {
      reasons.push(`Matches forbidden flag pattern: ${rule.rule}.`);
      matchedRules.push(rule.rule);
      return { safety: 'forbidden', reasons, matchedRules };
    }
  }

  for (const prefix of GRAY_AREA_PREFIXES) {
    if (normalized === prefix || normalized.startsWith(`${prefix} `)) {
      reasons.push(`Matches context-dependent git command: ${prefix}.`);
      matchedRules.push(prefix);
      return { safety: 'gray-area', reasons, matchedRules };
    }
  }

  for (const prefix of ALLOWED_PREFIXES) {
    if (normalized === prefix || normalized.startsWith(`${prefix} `)) {
      reasons.push(`Matches allowed read-only git command: ${prefix}.`);
      matchedRules.push(prefix);
      return { safety: 'allowed', reasons, matchedRules };
    }
  }

  reasons.push('Unknown git command defaults to refusal.');
  return { safety: 'forbidden', reasons, matchedRules };
}

function assessGitCommand(command) {
  const segments = splitSegments(command);
  if (segments.length === 0) {
    return {
      safety: 'gray-area',
      reasons: ['Empty command.'],
      matchedRules: [],
    };
  }

  const assessments = segments.map(assessSegment);
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

function assertReadOnlyGitCommand(command) {
  const assessment = assessGitCommand(command);
  if (assessment.safety !== 'allowed') {
    throw new Error(assessment.reasons.join(' '));
  }
}

module.exports = {
  assessGitCommand,
  assertReadOnlyGitCommand,
};
