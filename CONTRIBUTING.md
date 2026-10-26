# Contributing to Desigator

Thank you for helping improve Desigator.

## Before opening a pull request

1. Create a focused branch from `main`.
2. Keep changes small enough to review and explain the user-facing reason for them.
3. Add or update tests for changed behavior.
4. Run the project checks:

```bash
npm ci
npm run db:generate
npm test
npm run typecheck
npm run lint
npm run build
```

## Data and security

Never commit credentials, `.env` files, database dumps, SQLite databases, student work, personal data, production logs, or object-storage exports. Test fixtures must be synthetic.

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), not through a public issue.

## Database changes

Schema changes require a reviewed Prisma migration. Production deployments use `prisma migrate deploy`; do not recommend `db push`, reset, or destructive migrations for existing installations.

## License

By contributing, you agree that your contribution is distributed under the repository's GNU GPLv3 license.
