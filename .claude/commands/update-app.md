---
name: update-app
description: Update dependencies, fix deprecations and warnings
---

# Dependency Update & Deprecation Fix

## Step 1: Check for Updates

```bash
cd apps/mobile && npm outdated
```

## Step 2: Update Dependencies

```bash
cd apps/mobile && npx expo install --fix && npm update && npm audit fix
```

## Step 3: Check for Deprecations & Warnings

Run installation and check output:

```bash
cd apps/mobile && rm -rf node_modules package-lock.json && npm install
```

Read ALL output carefully. Look for:
- Deprecation warnings
- Security vulnerabilities
- Peer dependency warnings
- Breaking changes

## Step 4: Fix Issues

For each warning/deprecation:
1. Research the recommended replacement or fix
2. Update code/dependencies accordingly
3. Re-run installation
4. Verify no warnings remain

## Step 5: Run Quality Checks

```bash
cd apps/mobile && npx tsc --noEmit && npx expo install --check
```

Fix all errors before completing.

## Step 6: Verify Clean Install

```bash
cd apps/mobile && rm -rf node_modules package-lock.json && npm install
```

Verify ZERO warnings/errors and all dependencies resolve correctly.
