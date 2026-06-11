---
name: Cross-platform native binary overrides
description: Why Windows/Mac CI builds fail with "Cannot find module @rollup/rollup-win32-x64-msvc" and how to fix it in this pnpm monorepo.
---

# Cross-platform native binary overrides

`pnpm-workspace.yaml` has an `overrides:` block that sets every non-linux-x64 native
binary to `"-"` (meaning "do not install"). It covers `esbuild`, `rollup`,
`lightningcss`, `@tailwindcss/oxide`, and `@expo/ngrok-bin`. This is intentional —
the Replit container is linux-x64 only, so excluding other platforms keeps installs
lean and avoids firewall-blocked downloads.

## The trap
Any CI job that builds on a *different* OS (e.g. a GitHub Actions `windows-latest`
runner producing an Electron app) will fail with errors like:

```
Cannot find module @rollup/rollup-win32-x64-msvc
```

`--no-frozen-lockfile` does NOT fix this. The override removes the package from the
dependency graph entirely, so it never enters the lockfile and pnpm has nothing to
install on Windows.

## The fix
1. In `pnpm-workspace.yaml`, delete the `"-"` override lines for the target platform's
   binaries. For a Windows x64 Vite + Tailwind build that's the four:
   - `rollup>@rollup/rollup-win32-x64-msvc`
   - `esbuild>@esbuild/win32-x64`
   - `@tailwindcss/oxide>@tailwindcss/oxide-win32-x64-msvc`
   - `lightningcss>lightningcss-win32-x64-msvc`
2. Run `pnpm install --lockfile-only` to regenerate the lockfile. This adds the win32
   entries WITHOUT downloading them on Linux (optional deps gated by os/cpu).
3. Verify with `grep "win32-x64" pnpm-lock.yaml` — the package entries (not `'-'`)
   should appear.
4. Commit + push; the Windows runner now resolves and installs them.

**Why:** Removing only the override is safe for Replit — linux still uses
`rollup-linux-x64-gnu` etc. The win32 binaries sit in the lockfile as resolvable
optional deps and only download where the platform matches.

**How to apply:** Whenever you add a CI/build target on an OS other than linux-x64
(Windows, macOS, arm64), identify which native build tools that target invokes and
remove the matching override lines, then regen the lockfile. The same pattern applies
to esbuild minify, rollup bundle, tailwind oxide, and lightningcss.
