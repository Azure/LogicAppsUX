# 🧠 Agent Development Workflow (Git + Worktrees)

This document defines how `.github/` and `.squad/` (agent files) are managed across branches.

---

# 🧱 Core Model

## Source of Truth

```
agent-dev branch owns:
.github/
.squad/
```

## Feature Branch Behavior

- ✅ Can use agent files  
- ✅ Can modify locally  
- ❌ MUST NOT commit or push agent changes  

---

# 🚫 Git Constraint (Important)

Git pushes **commits**, not files.

```
❌ Cannot exclude files at push time
✅ Must prevent unwanted changes from being committed
```

---

# ✅ Solution: skip-worktree

We use:

```bash
git update-index --skip-worktree <files>
```

## What this does

- Keeps files tracked
- Hides local changes from Git

### Result

| Action       | Behavior         |
| ------------ | ---------------- |
| `git status` | hides changes    |
| `git add`    | ignores files    |
| `git commit` | excludes files   |
| `git push`   | no agent leakage |

---

# 🛠️ Required Setup

---

## ✅ 1. git new (create feature branch with agents isolated)

> ⚠️ **Why not `git merge agent-dev`?**  
> Merging creates a commit containing all agent files. That commit gets pushed with your PR, leaking `.github/` and `.squad/` changes. `skip-worktree` only hides *future local edits* — it cannot remove what is already committed.
>
> **Fix:** copy agent files into the working directory without any commit, then hide them with `skip-worktree`.

```bash
git config --global alias.new '!f() { \
  branch=$1; \
  git fetch origin && \
  git worktree add -b "$branch" "../$branch" origin/main && \
  cd "../$branch" && \
  git checkout origin/agent-dev -- .github .squad && \
  git restore --staged .github .squad && \
  git ls-files .github .squad | xargs git update-index --skip-worktree && \
  echo "✅ Worktree ready at ../$branch (agents hidden, no merge commit)"; \
}; f'
```

**What this does step by step:**

| Step | Command | Effect |
| ---- | ------- | ------ |
| 1 | `git checkout origin/agent-dev -- .github .squad` | Copies agent files into working dir + stages them |
| 2 | `git restore --staged .github .squad` | Unstages (index reverts to main); working dir keeps agent files |
| 3 | `skip-worktree` | Hides the working-dir delta from all future git operations |

---

## ✅ 2. hide-agents (manually re-hide if needed)

```bash
git config --global alias.hide-agents \
"!git ls-files .github .squad | xargs git update-index --skip-worktree"
```

---

## ✅ 3. unhide-agents (ONLY when updating agents)

```bash
git config --global alias.unhide-agents \
"!git ls-files .github .squad | xargs git update-index --no-skip-worktree"
```

---

## ✅ 4. agents (sync forward from agent-dev)

> ⚠️ `git pull origin agent-dev` would merge agent-dev into your branch, creating a commit with agent changes. Same leak problem as above.

```bash
git config --global alias.agents '!git fetch origin agent-dev && git checkout FETCH_HEAD -- .github .squad && git restore --staged .github .squad && git ls-files .github .squad | xargs git update-index --skip-worktree && echo "✅ Agents synced (no merge commit)"'
```

---

## ✅ 5. ap (commit helper)

```bash
git config --global alias.ap "commit -am"
```

---

# 🔁 Workflow

---

## ✅ 1. Create feature branch

```bash
git new my-feature
```

✅ Creates worktree  
✅ Merges agent-dev  
✅ Hides `.github/` and `.squad/`

---

## ✅ 2. Work normally

```bash
git status
```

👉 `.github/` and `.squad/` WILL NOT show up

---

## ✅ 3. Commit product code only

```bash
git add src/
git commit -m "fix issue"
git push
```

✅ Clean PR  
❌ No agent changes

---

## ✅ 4. Update agents (ONLY in agent-dev)

```bash
cd ../la-agent-dev
git unhide-agents
git ap "improve prompts"
git push
```

---

## ✅ 5. Sync updated agents to feature branch

```bash
cd ../la-feature-X
git agents
```

✅ Fetches latest agent files from `agent-dev`  
✅ No merge commit created  
✅ Re-applies skip-worktree automatically

---

# 🔄 Feedback Loop

Agent improvements discovered during feature work MUST be fed back:

```bash
cd ../la-agent-dev
git checkout feature-X -- .github .squad
git commit -m "sync agent improvements"
git push
```

---

# ⚠️ Edge Cases

---

## New files in `.github/` or `.squad/`

Run:

```bash
git hide-agents
```

---

## Accidentally staged agent files

```bash
git reset HEAD .github .squad
```

---

## Accidentally committed agent files

```bash
git restore --source=HEAD~1 -- .github .squad
```

---

## Verify skip-worktree files

```bash
git ls-files -v | grep '^S'
```

---

# 🧠 Rules (Enforced by Agents)

Agents MUST:

- ❌ Never commit `.github/` or `.squad/` from feature branches
- ✅ Suggest `git hide-agents` if these files appear in status
- ✅ Suggest syncing to `agent-dev` for improvements
- ✅ Keep feature PRs free of agent config changes

---

# ✅ TL;DR

```bash
git new feature-x     # create isolated branch
git agents            # sync latest agents
git hide-agents       # ensure agent changes are hidden
git unhide-agents     # ONLY in agent-dev
```

---

# 🎯 Outcome

- ✅ Clean PRs (no agent noise)
- ✅ Local agent flexibility
- ✅ Centralized agent evolution
- ✅ No accidental commits
