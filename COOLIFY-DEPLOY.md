# Nasazení do Coolify

Připojte repozitář přes GitHub App, zvolte Docker Compose a nastavte `coolify.yml`. Doménu připojte ke službě `app` na portu 3000 a vložte proměnné podle `.env.coolify.example`.

Běžné nasazení je univerzální: provede pouze databázové migrace a ponechá aplikaci bez školy, uživatelů a ukázkových dat. PostgreSQL používá persistentní volume `desigator_postgres`, takže redeploy data nemaže.

MinIO není součástí Compose. Aplikace používá existující serverové MinIO přes `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` a `S3_SECRET_ACCESS_KEY`. Bucket musí být neveřejný, dostupný z aplikačního kontejneru a přístupový klíč musí mít právo číst i zapisovat objekty. Zálohujte databázi i tento bucket.

## Jednorázová inicializace této VUT instance

Služba `bootstrap-vut` má Compose profil a při běžném deployi se nespouští. Historický SQL export zůstává mimo Git. Nahrajte jej ručně na server, například do `/srv/desigator-import/desigator-export.sql`, s přístupem pouze pro správce.

Po prvním startu databáze spusťte na serveru jednorázově:

```sh
docker compose -f coolify.yml --profile vut-bootstrap run --rm \
  -e LEGACY_IMPORT_FILE=/bootstrap/desigator-export.sql \
  -v /srv/desigator-import/desigator-export.sql:/bootstrap/desigator-export.sql:ro \
  bootstrap-vut
```

Skript idempotentně vytvoří organizaci FSI VUT / Odbor průmyslového designu, administrátora a školního správce/učitele, importuje historický archiv a přiřadí historické předměty učiteli. Po úspěšném importu serverovou kopii bezpečně archivujte nebo odstraňte podle pravidel pro osobní údaje.

Nakonec ověřte `/api/health`, přihlášení, historické statistiky a testovací upload do existujícího MinIO bucketu.
