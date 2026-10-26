# Deployment to Coolify

Connect the repository through the GitHub App and deploy the default `docker-compose.yml`. Attach the public domain to the `app` service on internal port 3000.

The stack does not publish host ports. Coolify handles routing through its proxy. PostgreSQL uses the persistent `desigator_postgres` volume and Coolify generates a stable database password through `SERVICE_PASSWORD_64_POSTGRES`.

Set the application values shown in `.env.coolify.example` under **Configuration → Environment Variables**. The PostgreSQL password is generated automatically and must not be replaced with a hard-coded value.

MinIO is not part of the stack. Configure the existing server storage through `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`. The bucket must remain private and the application key needs read and write access.

Normal deployment only runs database migrations. It creates no school, accounts, or demo data.

## Optional one-time VUT bootstrap

The VUT-specific bootstrap is isolated in `compose.bootstrap-vut.yml`; Coolify never parses it during a normal build. Keep the historical SQL export outside Git and upload it to the server, for example as `/srv/desigator-import/desigator-export.sql`.

After the main stack is healthy, run once on the server:

```sh
docker compose -f docker-compose.yml -f compose.bootstrap-vut.yml \
  --profile vut-bootstrap run --rm \
  -e LEGACY_IMPORT_FILE=/bootstrap/desigator-export.sql \
  -v /srv/desigator-import/desigator-export.sql:/bootstrap/desigator-export.sql:ro \
  bootstrap-vut
```

This creates the selected organization, administrator, and school teacher, imports the historical archive idempotently, and assigns unowned historical courses to that teacher.

Finally verify `/api/health`, authentication, historical statistics, and an upload to the existing MinIO bucket. Configure backups for both PostgreSQL and the object-storage bucket.
