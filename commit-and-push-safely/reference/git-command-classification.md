# Git Command Classification

## 🔴 FORBIDDEN Commands (Never Execute)
These commands modify repository state and MUST NEVER be invoked via Bash tool:

### Staging Operations
- `git add` - stages files
- `git rm` - removes files from index
- `git mv` - moves/renames files in index

### Commit Operations
- `git commit` - creates commits
- `git commit --amend` - modifies existing commits

### Push Operations
- `git push` - pushes to remote
- `git push --force` - force pushes (destructive)
- `git push --all` - pushes all branches

### Reset Operations
- `git reset` - resets index
- `git reset --hard` - destructive reset
- `git reset --soft` - resets to specific state

### Checkout Operations (Discard Changes)
- `git checkout -- <file>` - discards working tree changes
- `git checkout HEAD -- <file>` - discards to HEAD state

### Clean Operations
- `git clean -fd` - removes untracked files (destructive)
- `git clean -fx` - removes ignored files (destructive)

### Stash Operations
- `git stash` - stashes changes (modifies working tree)
- `git stash pop` - applies and drops stash
- `git stash drop` - drops stash

### Branch Operations (Write)
- `git branch -d` - deletes branch
- `git branch -D` - force deletes branch
- `git branch -m` - renames branch

### Merge Operations
- `git merge` - merges branches (modifies history)
- `git merge --abort` - aborts merge

### Rebase Operations
- `git rebase` - rebases commits (destructive)
- `git rebase -i` - interactive rebase (destructive)

### Tag Operations (Write)
- `git tag -a` - creates annotated tag
- `git tag -d` - deletes tag

### Remote Operations (Write)
- `git remote add` - adds remote
- `git remote remove` - removes remote
- `git remote set-url` - changes remote URL

### Config Operations (Write)
- `git config --global` - modifies global config
- `git config --local` - modifies local config

## ✅ ALLOWED Commands (Read-Only)
These commands only read state and are SAFE to execute:

### Status Operations
- `git status` - shows working tree status
- `git status --short` - short format status

### Diff Operations
- `git diff` - shows differences
- `git diff --cached` - shows staged differences
- `git diff HEAD` - shows differences against HEAD

### Log Operations
- `git log` - shows commit history
- `git log --oneline` - compact history
- `git log --graph` - graphical history
- `git show` - shows commit details

### Branch Operations (Read)
- `git branch` - lists branches (without flags)
- `git branch -a` - lists all branches
- `git branch -r` - lists remote branches

### Remote Operations (Read)
- `git remote` - lists remotes
- `git remote -v` - shows remote URLs

### File Operations (Read)
- `git ls-files` - lists tracked files
- `git ls-tree` - lists tree contents
- `git cat-file` - shows object contents

### Revision Operations
- `git rev-parse` - parses revision names
- `git rev-list` - lists commit revisions

### Blame Operations
- `git blame` - shows file annotation
- `git blame -L` - shows line range annotation

### Describe Operations
- `git describe` - describes current state
- `git describe --tags` - describes using tags

### Other Read Operations
- `git count-objects` - counts object database
- `git fsck` - verifies object database (read-only check)
- `git gc --aggressive` (FORBIDDEN - modifies database)

## ⚠️ GRAY AREA Commands (Context-Dependent)

### Clone (Reads but creates directory)
- `git clone` - Generally safe for new repo setup, but avoid in existing repo

### Fetch (Reads but updates remote tracking)
- `git fetch` - Updates remote-tracking branches, generally safe but can be viewed as state modification

## Enforcement Rules

1. **Default to Refusal**: If unsure about a command's safety, refuse to execute
2. **Pattern Matching**: Reject any Bash command starting with forbidden git operations
3. **Flag Analysis**: Even allowed commands become forbidden with write flags (e.g., `git branch` is safe, `git branch -D` is forbidden)
4. **Output Audit**: Scan generated output for accidentally embedded git write commands
5. **User Clarification**: If user requests ambiguous operation, ask for clarification before executing

## Implementation Example

```python
# Pseudocode for enforcement check
FORBIDDEN_PATTERNS = [
    'git add', 'git commit', 'git push', 'git reset', 'git clean',
    'git stash', 'git rm', 'git mv', 'git merge', 'git rebase',
    'git branch -d', 'git branch -D', 'git branch -m',
    'git tag -a', 'git tag -d', 'git remote add', 'git remote remove'
]

def is_safe_git_command(command):
    for pattern in FORBIDDEN_PATTERNS:
        if pattern in command:
            return False
    return True
```

## Testing Requirements

Each forbidden command should be tested in:
1. Direct invocation scenarios
2. Aliases and abbreviations (e.g., `git co` for checkout)
3. Combined commands (e.g., `git add . && git commit`)
4. Shell script inclusion scenarios
5. Emergency/pressure scenarios

See [tests/boundary-tests.md](./boundary-tests.md) for complete test specifications.