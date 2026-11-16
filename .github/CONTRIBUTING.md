# Contributing

Thanks for taking the time to contribute. Bug reports, ideas, docs fixes and code are all welcome.

Before you start, please read the [Code of Conduct](CODE_OF_CONDUCT.md). If you found a security problem, follow the [security policy](SECURITY.md) instead of opening a public issue.

## Reporting bugs

Search the existing issues first. If nobody has reported it yet, open a new issue with the **Bug report** template and include the steps to reproduce it, what you expected to happen and what happened instead.

## Suggesting features

Open an issue with the **Feature request** template. Start with the problem you're trying to solve, then describe the solution you have in mind. For bigger changes, please wait until the direction is agreed on in the issue before writing code.

## Development

You need Node.js 20 or newer. tmux makes the integration tests run, and they are skipped without it.

```sh
npm install
npm test                                   # build, unit tests and tmux integration tests
CLAUDEGRID_TEST_KONSOLE=1 npm test         # also start a real Konsole, offscreen
node dist/cli.js --dry-run -l 3x2          # try your build without installing it
npm run docs:dev                           # docs at http://localhost:5173/claudegrid/
```

The code lives in `src/`:

- `cli.ts` parses arguments and dispatches to `commands/`
- `config.ts` loads and validates config files, `plan.ts` turns them into a launch plan
- `backends/` has one file per terminal. Each backend receives the plan and a `run` function, which records commands during a dry run
- `pane.ts` is what runs inside every pane

## Pull requests

1. Fork the repository and create a branch from `main`, for example `fix/empty-config`.
2. Keep the change focused. One fix or feature per pull request is easier to review.
3. Format your code with Prettier: `npx prettier --write .`
4. Update tests and docs if the change affects behavior.
5. Write commit messages in the [Conventional Commits](https://www.conventionalcommits.org/) style, for example `fix: handle empty config file`.
6. Open the pull request against `main`, fill in the template and link the issue it closes.

Small fixes like typos can go straight to a pull request without an issue.

## Questions

See [SUPPORT.md](SUPPORT.md).
