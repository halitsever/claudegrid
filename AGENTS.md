# AGENTS.md

claudegrid is a TypeScript CLI, published to npm as `@halitsever/claudegrid`, that opens a grid of Claude Code agents in one terminal window. Developers on Linux and macOS use it.

## Verify a change

CI (`.github/workflows/ci.yml`) runs these on Node 20, 22 and 24, plus a macOS job:

- `npm ci`, then `npm run typecheck`, then `npm test`. `npm test` builds `dist/` with `tsc` first, then runs `node --test test/*.test.mjs`.
- The tests create git repos and worktrees. CI sets `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME` and `GIT_COMMITTER_EMAIL` for `npm test`, so do the same on a machine without a git identity. The tmux integration tests are skipped when tmux is missing, and CI installs it.
- Lint job: `shellcheck install.sh`. The completion output must parse: `node dist/cli.js completion bash | bash -n`, and the same for `zsh -n` and `fish --no-execute`.
- `npm pack --dry-run` must contain `dist/cli.js` and nothing from `src/`. The package ships only what `files` in `package.json` lists (`dist`, `assets` and three `docs/public` files), plus the files npm always adds.
- macOS: `/bin/bash ./install.sh` must work with macOS's bash 3.2, and `node dist/cli.js -b iterm2 -l 3x2 -p "hello" --dry-run` must succeed.
- Docs: `npm run docs:build` (the docs are a separate package: `cd docs && npm ci` first).

## Gotchas

- `dist/` is ignored and built by `prepare`, so run a build before trying `node dist/cli.js`.
- The desktop app's page is `assets/ui.html`, read at runtime by `src/server/index.ts`, and it ships in the package.
- `docs/public/schema.json` is the `$schema` for `.claudegrid.json`. It is served from the site and shipped in the package. Nothing checks it against `src/config.ts`, so update it by hand when config keys change.
- The CLI reads its version from `package.json`.
- Pushing a `v*` tag runs the release. The tag must match the `package.json` version. The workflow runs the tests, builds the tarball and `.deb`, and creates the GitHub Release with notes from `CHANGELOG.md`. It publishes to npm only when `NPM_TOKEN` or trusted publishing is configured, and pushes to the AUR only when `AUR_SSH_PRIVATE_KEY` is set.
- `packaging/aur/PKGBUILD` in the repo lags behind (`pkgver=1.1.0`). The release job rewrites a fresh copy in the AUR repo with `packaging/aur/update.sh`, so leave the committed one as a template.
- `.claudegrid.json` at the root is the project's own preset file for working on claudegrid. It is not test data.

## Conventions

- Commit subjects use conventional-commit style, in English, with no body or trailer.
- Work on a branch and open a PR. The owner merges.
- Don't add emoji to new text. Code comments are short, one line where possible, and explain why. Format with Prettier (`.prettierrc`).
- The README follows the owner's template. Leave every image from `halitsever-api.vercel.app` byte-for-byte as it is. Only the `title=` value of `api/repo-title` and the issue wrapper link may be corrected.
- The owner bumps the version, updates `CHANGELOG.md`, tags releases and publishes to npm.

## Docs site

- The VitePress site lives in `docs/` and deploys to https://halitsever.github.io/claudegrid/ from `.github/workflows/docs.yml` on pushes to `main` that touch `docs/`. That workflow checks out full history because `lastUpdated` reads git.
- A new guide page goes into the sidebar in `docs/.vitepress/config.mts` and into `docs/public/llms.txt`.
