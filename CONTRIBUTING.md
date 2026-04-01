# Contributing Guide

## Branch Strategy

```
main        ← Production-ready releases (protected)
  ↑
staging     ← Pre-release testing & QA (protected)
  ↑
dev         ← Active development integration (protected)
  ↑
feature/*   ← New features (from dev)
fix/*       ← Bug fixes (from dev)
hotfix/*    ← Critical production fixes (from main)
```

### Rules

- **Never push directly** to `main`, `staging`, or `dev`
- All changes go through **Pull Requests** with at least 1 review
- `feature/*` and `fix/*` branches are created from `dev`
- `hotfix/*` branches are created from `main` (cherry-picked back to `dev`)
- Delete branches after merge

### Flow

```
1. Create branch:   git checkout dev && git pull && git checkout -b feature/my-feature
2. Develop & commit: Follow conventional commits (see below)
3. Push & create PR: git push -u origin feature/my-feature → PR to dev
4. Code review:      At least 1 approval required
5. CI must pass:     Lint + tests green
6. Merge:            Squash merge to dev
7. Release cycle:    dev → PR to staging → QA → PR to main → tag release
```

## Commit Convention

Format: `<type>: <description>`

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |
| `chore` | Build, CI, tooling, dependencies |
| `style` | Formatting, whitespace (no code change) |

**Examples:**
```
feat: add RFID scan button to stock picking form
fix: prevent double-click on scan button during active scan
refactor: extract WebSocket connection logic to shared utility
docs: add integration guide for warehouse module
```

**Rules:**
- Use imperative mood: "add feature" not "added feature"
- No period at the end
- Keep first line under 72 characters
- Add body for complex changes (separated by blank line)

## Pull Request Process

1. **Title**: Follow commit convention (`feat: ...`, `fix: ...`)
2. **Description**: Fill in the PR template completely
3. **Size**: Keep PRs small and focused (< 400 lines changed)
4. **Tests**: Add/update tests for any logic change
5. **Review**: Request review from at least 1 team member
6. **CI**: All checks must pass before merge
7. **Conflicts**: Rebase on latest `dev` before requesting review

## Code Standards

### Python (Backend)

- Follow PEP 8
- Max line length: 120 characters
- Use type hints on function signatures
- Use `logging` module (never `print()`)
- Handle errors explicitly, never silently swallow
- Validate inputs at system boundaries

### JavaScript (Frontend - OWL)

- Use `/** @odoo-module **/` header
- Follow Odoo OWL component patterns
- Use `_t()` for all user-facing strings (i18n)
- Use services (`useService`) for shared functionality
- Clean up timers and listeners in `onWillUnmount`

### XML (Views)

- Use 4-space indentation
- Add section comments for readability
- Use meaningful `id` attributes
- Keep views focused - one concern per file when possible

### Security

- No hardcoded secrets (API keys, passwords, tokens)
- Use `@api.model` or `@api.depends` decorators correctly
- Define proper `ir.model.access.csv` for all models
- Validate all user inputs in Python methods

## Module Versioning

Follow semantic versioning in `__manifest__.py`:

```
MAJOR.MINOR.PATCH

MAJOR → Breaking changes (API incompatibility)
MINOR → New features (backwards compatible)
PATCH → Bug fixes
```

Bump version in `__manifest__.py` before creating a release PR to `main`.

## Release Process

1. Ensure all features are merged to `dev`
2. Create PR: `dev` → `staging`
3. QA testing on staging environment
4. Create PR: `staging` → `main`
5. After merge to `main`, create a git tag:
   ```bash
   git tag -a v1.2.0 -m "Release v1.2.0"
   git push origin v1.2.0
   ```
6. GitHub Actions automatically creates a Release
