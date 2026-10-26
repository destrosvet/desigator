# Security Policy

## Reporting a vulnerability

Please do not disclose security vulnerabilities in a public issue. Use GitHub's private vulnerability reporting feature for this repository. Include the affected version, reproduction steps, impact, and any suggested mitigation.

Do not include real student data, credentials, access tokens, database exports, or private uploaded files in a report. Use synthetic examples and redact logs before attaching them.

## Supported version

Security fixes are applied to the current `main` branch. Self-hosted operators are responsible for keeping the application, database, dependencies, TLS termination, backups, and S3-compatible storage updated.

## Deployment expectations

- Keep PostgreSQL and object storage private from the public internet where possible.
- Use unique, randomly generated production secrets and rotate any credential that may have been exposed.
- Keep uploaded objects in a private bucket.
- Back up PostgreSQL and object storage together and test restoration.
- Apply Prisma migrations through the documented production deployment process.
