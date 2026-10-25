# Nasazení Desigatoru

Produkční cesta je Dockerfile (např. Coolify) s PostgreSQL 16 a privátním S3/MinIO. Lokální docker-compose.yml s automatickým override je vývojové prostředí. Pro samostatný produkční kontejner použijte výslovně compose.production.yml.

## Před nasazením

1. Zvolte ověřený commit a sestavte image se stejným tagem; nepoužívejte demo seed na produkčních datech.
2. V prostředí hostingu nastavte hodnoty podle .env.production.example. Skutečné klíče patří pouze do správce tajných hodnot nebo chráněného .env.production mimo Git. APP_URL, AUTH_URL a NEXTAUTH_URL musí mít stejný veřejný HTTPS origin. AUTH_SECRET musí zůstat stabilní mezi restarty. S3 bucket musí být privátní.
3. Ověřte odesílací doménu v Resendu, doplňte RESEND_API_KEY a RESEND_FROM a otestujte doručení obnovy hesla na kontrolovaný účet. Produkční preflight chybějící e-mail odmítne. Lokální loopback provoz lze ověřovat bez e-mailu.
4. Zálohujte DB a objekty S3 ve stejném časovém bodě a ověřte obnovu do odděleného prostředí. Při záloze omezte zápisy aplikace.
5. Ověřte síťový přístup kontejneru k DB a S3; samotný localhost uvnitř kontejneru neukazuje na databázi hostitele. V Coolify použijte adresy služeb ve společné síti.

## Sestavení a start

Spusťte npm ci, npm run db:generate, npm test, npm run typecheck, npm run lint a npm audit --omit=dev --audit-level=high. CI navíc ověřuje migrace a celý prohlížečový průchod na syntetických datech.

Image sestavte příkazem docker build -t desigator:<commit> . . Pro lokální konfiguraci serveru nastavte DESIGATOR_IMAGE v .env.production na tento tag a spusťte docker compose --env-file .env.production -f compose.production.yml up -d. Soubor nevkládá vývojovou databázi ani veřejný MinIO. Port 3000 je vázaný pouze na loopback hostitele; před něj patří HTTPS reverzní proxy.

Kontrolu hodnot lze spustit ještě před startem: docker run --rm --env-file .env.production --entrypoint node desigator:<commit> scripts/check-deployment.mjs . Výpis obsahuje jen názvy chybějících proměnných, nikdy jejich hodnoty.

Entrypoint kontroluje konfiguraci, čeká na DB, kontroluje bezpečnost migračního základu, provede prisma migrate deploy a spustí aplikaci pod neprivilegovaným uživatelem node. Všechny migrace jsou přibalené. Neprovádí seed ani automatické zveřejnění výsledků.

## Existující data a obnova

Používanou databázi s migrační historií nejprve obnovte do testovací DB a aplikujte migrace tam. Databáze bez migrační historie a staré tasks bez subjectId se automaticky nemigrují; start se zastaví s popisem. Pro tento nejstarší stav je nutný řízený převod task_assignments do předmětů nebo import do odděleného historického archivu. Nikdy jej neřešte příkazem db push nebo reset nad produkcí.

Pro PostgreSQL použijte pg_dump ve formátu custom. Connection string předávejte přes chráněnou proměnnou PGDATABASE nebo službu pg_service.conf, nikoli jako argument s heslem. Příklad v shellu po bezpečném načtení prostředí: PGDATABASE="$DATABASE_URL" pg_dump --format=custom --file=database.dump . Soubor patří do šifrované zálohy mimo repozitář.

Pro obnovu do nově vytvořené databáze nastavte chráněné PGHOST, PGPORT, PGUSER, PGPASSWORD a PGDATABASE (pouze název cílové DB) nebo pg_service.conf. Spusťte pg_restore --no-owner --no-privileges --exit-on-error --dbname="$PGDATABASE" database.dump . Heslo zůstává v prostředí, nikoli v argumentech příkazu. Po obnově porovnejte počty záznamů, shodu schématu a skutečné čtení původního souboru přes autorizované API.

Objekty S3 zálohujte a obnovujte do samostatného privátního bucketu, např. pomocí mc mirror s předem nakonfigurovanými aliasy. Zkontrolujte počet, celkovou velikost a kontrolní součty objektů. Původní bucket neměňte ani nemažte.

## První správce

Na čisté DB použijte z ověřeného checkoutu prisma/create-admin.ts přes npm run db:admin. Přístupové údaje dodejte chráněnými proměnnými ADMIN_EMAIL, ADMIN_PASSWORD a případně ADMIN_NAME. Heslo musí mít alespoň 12 znaků a nejvýše 72 UTF-8 bajtů. Příkaz existující účet nepřepíše a heslo nevypisuje. Provede se pouze jednou; nepoužívejte výchozí demo účty.

## Kontrola po startu a návrat

Ověřte /api/health (HTTP 200), přihlášení, rozsah školy, upload a privátní náhled, hodnocení a zveřejnění studentovi, odvolání sdílecího odkazu a doručení obnovy hesla. Anonymní přístup k originálům má být odmítnut. Healthcheck při výpadku DB vrací 503 bez interních přihlašovacích údajů. Sledujte restarty a aplikační chyby v logu.

Pro návrat aplikace nasaďte předchozí ověřený image pouze tehdy, pokud je kompatibilní s aktuálním DB schématem. Migrace nesnižujte automaticky. Pokud je nutná obnova DB, zastavte zápisy, obnovte ověřenou zálohu do nové DB a přepněte DB i odpovídající S3 snapshot společně; počítejte se ztrátou zápisů od času zálohy.
