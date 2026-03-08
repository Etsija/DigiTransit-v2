## Git Workflow — GitButler CLI

This project uses **GitButler** for version control. The working branch is `gitbutler/workspace`.
Use `but` (the GitButler CLI) instead of raw `git` commands for all branching, committing, and
pushing operations. Standard `git` read commands (log, blame, etc.) are fine.

### Typical Implementation Flow

#### 1. Start: Check workspace state

```bash
but status          # Overview of branches, uncommitted changes, commit status
but pull --check    # Check if branches can cleanly rebase on target
but pull            # Rebase all applied branches onto latest target branch
```

#### 2. Branch: Create or select a branch

```bash
but branch new "my-feature"   # Create a new branch
but branch                    # List applied branches
```

#### 3. Stage & Commit changes

```bash
but status                          # See uncommitted files and their CLI IDs
but diff                            # Review all uncommitted changes
but diff <file-id>                  # Review changes in a specific file
but commit <branch> -m "message"    # Commit all uncommitted changes to a branch
but commit <branch> -o -m "message" # Commit only staged changes (--only)
but commit <branch> -i              # Commit with AI-generated message
```

With multiple branches applied, stage files to specific branches first:

```bash
but stage <file-or-hunk> <branch>   # Stage a file/hunk to a specific branch
```

#### 4. Edit commit history (safe — GitButler rebases dependents automatically)

```bash
but reword <commit> -m "new msg"    # Edit a commit message
but squash <c1> <c2>                # Squash c1 into c2
but squash <branch>                 # Squash all commits in a branch into one
but absorb                          # Auto-amend uncommitted changes into the right commits
but absorb --dry-run                # Preview what absorb would do
but move <commit> <target>          # Move a commit to a different position
but amend <file> <commit>           # Amend a specific file into a specific commit
```

#### 5. Push & Create PR

```bash
but push <branch>                   # Push a branch to remote
but push                            # Push all branches with unpushed commits
but pr new                          # Create a pull request
```

#### 6. Undo & Recovery

```bash
but undo                            # Undo the last operation
but oplog                           # View operation history
but oplog snapshot "checkpoint msg" # Create a named snapshot
but oplog restore <oplog-sha>       # Restore to any previous state
```

### Auto-stage / Auto-commit Rules

```bash
but mark <branch>    # Auto-stage new changes to this branch
but mark <commit>    # Auto-amend new changes into this commit
but unmark           # Remove all marks
```

### Key Differences from Git

- **No `git add` / `git commit`** — use `but stage` and `but commit`
- **No `git rebase -i`** — use `but squash`, `but move`, `but reword` instead
- **Safe history editing** — GitButler automatically rebases dependent commits
- **`but undo`** — recovers from any operation, including uncommitted changes
- **Multiple branches** can be applied simultaneously (virtual branches)
