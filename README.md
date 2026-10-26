# Desigator

**A focused review and assessment workspace for design education.**

Desigator helps schools, universities, studios, and creative programs manage the complete journey from assignment to meaningful feedback. Teachers organize courses and briefs, students submit evolving work, reviewers assess projects against clear criteria, and schools publish results without exposing private student data.

Unlike a generic learning management system, Desigator is built around visual work. Images, PDFs, video, and interactive 3D models can be reviewed in context, so feedback stays connected to the artifact rather than being reduced to a filename in a download folder.

Desigator is open-source software licensed under GPLv3. Run it on your own infrastructure, keep ownership of your data, and adapt the workflow to your institution.

## Why Desigator?

- **Review work, not attachments** — preview images, PDFs, browser-supported video, and GLB 3D models directly in the evaluation workspace.
- **Support the creative process** — separate work-in-progress consultations from final submissions and preserve version history.
- **Make assessment transparent** — use criteria, points, written feedback, multiple evaluators, and auditable point adjustments.
- **Give schools control** — isolate organizations, classes, teachers, students, and grading scales in a multi-school platform.
- **Publish deliberately** — results stay private until released and can be shared through revocable, unlisted links without exposing student names or source files.
- **Own the deployment** — use PostgreSQL and compatible private S3 storage such as MinIO, AWS S3, or Cloudflare R2.

## Who it is for

- Universities and art or design schools
- Graphic, product, industrial, animation, and 3D design programs
- Teachers coordinating project-based courses
- External reviewers and assessment panels
- Students who need structured feedback across multiple iterations

## Product workflow

1. A school creates its organization, classes, subjects, and grading scale.
2. Teachers publish assignments with assessment criteria and deadlines.
3. Students or teachers upload WIP and final versions of the work.
4. Teachers and students discuss WIP submissions in private consultations.
5. Assigned evaluators review final work and provide scores and feedback.
6. Teachers verify and publish results when the assessment is complete.
7. Students see their feedback; schools may optionally share a privacy-conscious result view through an unlisted link.

## Highlights

### Visual review workspace

Reviewers get a focused queue of assigned work, rich previews, criterion-based scoring, written feedback, and clear completion states. Supported previews include images, PDFs, MP4/WebM supported by the browser, and self-contained GLB 2.0 models.

### Versioned submissions and consultations

WIP versions are designed for iteration and discussion. Final versions are used for scored assessment. Every version retains its files, uploader, timestamp, change note, consultation, and evaluation history.

### Multi-school permissions

Desigator supports platform administrators, school administrators, teachers, evaluators, and students. Each user belongs to one home organization, while explicitly assigned evaluators can review work across institutions.

### Controlled result publication

Completed evaluations are not automatically visible to students. Teachers decide when to publish or withdraw results. Optional unlisted result pages use revocable random tokens and expose school IDs instead of student names.

### Historical reporting

Existing assessment archives can be imported into a separate historical model and assigned to a responsible teacher. Current and historical results can be analyzed without creating fake accounts or mixing legacy records with live submissions.

### Self-hosted and storage-independent

The application runs as a Dockerized Next.js service backed by PostgreSQL and private S3-compatible object storage. Persistent database storage makes application upgrades independent from institutional data.

## Technology

- Next.js 16, React 19, and TypeScript
- Tailwind CSS and shadcn/ui
- PostgreSQL and Prisma ORM
- NextAuth.js credentials authentication
- S3-compatible private object storage
- Czech and English localization with next-intl
- Docker deployment with automated production migrations

## Development quick start

Requirements: Node.js 22+, PostgreSQL 16+, and private S3-compatible storage for uploads.

```bash
cp .env.example .env
npm ci
npm run db:generate
npm run db:migrate
npm run dev
```

The application is available at [http://localhost:3000](http://localhost:3000). A fresh database contains no demo users or mock school data unless the development seed is run explicitly.

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Production deployment

The recommended production path is Docker with PostgreSQL and private S3-compatible storage. Database migrations run through `prisma migrate deploy`; production startup does not run the demo seed.

- [General production and backup guidance](DEPLOYMENT.md)
- [Coolify deployment through a GitHub App](COOLIFY-DEPLOY.md)
- [Example Coolify environment](.env.coolify.example)

For Coolify, select `coolify.yml` as the Docker Compose file. PostgreSQL uses a named persistent volume. MinIO is not started by the stack; configure the application to use an existing S3-compatible service.

## Security and privacy

- Original files remain behind authenticated application routes.
- S3 buckets are expected to be private.
- Public result links are unlisted, revocable, and return no student names or evaluator identities.
- Password reset tokens are stored as hashes and expire after 30 minutes.
- Production secrets belong in the deployment platform, never in Git.
- Historical exports containing personal data must be transferred directly to the server and must not be committed.

Please report security issues according to [SECURITY.md](SECURITY.md).

## Contributing

Issues, design discussions, documentation improvements, and focused pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a change.

## License

Desigator is free and open-source software licensed under the [GNU General Public License v3.0](LICENSE).
