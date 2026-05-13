# Branch Protection Checklist

Use this checklist when configuring branch protection for `main` (or `master`) in GitHub repository settings.

## Required Pull Request Rules

- [ ] Require a pull request before merging.
- [ ] Require approvals: at least 1 reviewer.
- [ ] Dismiss stale approvals when new commits are pushed.
- [ ] Require review from Code Owners.
- [ ] Require conversation resolution before merge.

## Required Status Checks

Enable "Require status checks to pass before merging", then select these checks after first workflow run:

- [ ] `CI / Quality - api-gateway`
- [ ] `CI / Quality - worker-service`
- [ ] `CI / Quality - simulator`
- [ ] `CI / Quality - dashboard`
- [ ] `CI / Quality - common`
- [ ] `CI / Quality - models`
- [ ] `CodeQL / Analyze (CodeQL)`
- [ ] `PR New Code Guard / No explicit any in new code`

## Recommended Additional Rules

- [ ] Require branches to be up to date before merging.
- [ ] Include administrators.
- [ ] Restrict who can push to matching branches.
- [ ] Restrict force pushes.
- [ ] Restrict deletions.

## Optional Non-Blocking Checks

These are useful but should usually stay non-required:

- [ ] `PR ESLint Fix / Fix changed files` (autofix helper)
- [ ] `Lint Autofix / autofix` (manual workflow)
