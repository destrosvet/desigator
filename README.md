# Desigator – prohlížení a hodnocení designérských prací

Desigator je platforma pro prohlížení a hodnocení studentských prací především z oborů designu a vizuální tvorby: obrázků, ilustrací, grafických návrhů, animací, videí a 3D modelů. Předměty jako **Počítačová grafika, Grafický design, Design, Animace nebo 3D modelování** organizují zadání a práce studentů.

Jádrem produktu je **pracovní prostředí hodnotitele**: přehled přiřazených studentských prací, kvalitní prohlížení díla a hodnocení podle kritérií s body a slovní zpětnou vazbou. Prohlížení obrázků, animací a modelů slouží především tomu, aby hodnotitel mohl dílo dobře posoudit. Hlavní tok je: **zadání → přiřazení prací hodnotitelům → prohlížení a hodnocení → výsledky a zpětná vazba**. Součástí cílové definice je přehled jednotlivých hodnocení a jejich autorů u každé práce.

Podrobná [produktová definice a požadavky](DOKUMENTACE.md) rozlišuje cílové chování od současné implementace; pořadí realizace je v [plánu dokončení](PLAN.md). Pracovní galerie hodnotitele a prohlížeč obrázků s hodnocením jsou implementované. Přehrávač videa a interaktivní 3D náhledy patří do dalších etap.

Technologie: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui a PostgreSQL.

## Technologie

- **Framework**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Databáze**: PostgreSQL + Prisma ORM
- **Autentizace**: NextAuth.js (credentials provider)
- **i18n**: next-intl (CS/EN)
- **State**: Zustand (připraveno)
- **Query**: TanStack Query (připraveno)
- **S3**: Vlastní klient (MinIO/AWS S3/R2 kompatibilní)
- **Runtime**: Node.js 22 + npm

## Role uživatelů

| Role | Oprávnění |
|------|-----------|
| **ADMIN** | Plný přístup ke všemu |
| **TEACHER** | Správa předmětů a zadání, prohlížení prací studentů, přiřazování hodnotitelů a přehled výsledků |
| **EVALUATOR** | Prohlížení přiřazených prací, body podle kritérií a slovní hodnocení |
| **STUDENT** | Přístup k zadáním, odevzdávání vlastních prací a přehled vlastních výsledků a zpětné vazby |

## Spuštění

### 1. Lokálně (bez Dockeru)

**Požadavky:**
- Node.js 22+
- PostgreSQL 16+ (běžící lokálně nebo externě)
- S3 kompatibilní úložiště (volitelné)

**Kroky:**

```bash
# 1. Nastav .env (pokud ho nemáš, vytvoř ho z .env.example)
cp .env.example .env

# 2. Nainstaluj závislosti
npm install

# 3. Vygeneruj Prisma klienta
npx prisma generate

# 4. Aplikuj migrace do databáze
npx prisma migrate dev

# 5. Spusť seed (vytvoří admin účet)
npm run db:seed

# 6. Spusť vývojový server
npm run dev
```

Aplikace bude dostupná na: **http://localhost:3000/cs/auth/login**

**Výchozí admin účet:**
- Email: `admin@desigator.cz`
- Heslo: `admin123`

### 2. S Docker Compose (doporučeno)

**Požadavky:**
- Docker Desktop (Windows/Mac) nebo Docker Engine (Linux)

**Kroky:**

```bash
# 1. Spusť všechny služby
docker compose -p desigator up -d

# Migrace se aplikují automaticky při startu app kontejneru.
# Demo data vytvoř z vývojového checkoutu s DATABASE_URL směřující na localhost:5432:
npm ci
npm run db:generate
npm run db:seed
```

Aplikace bude dostupná na: **http://localhost:3000**

Databáze na: `localhost:5432` (user: `desigator`, password: `desigator_password`, db: `desigator_db`)

### 3. Lokální vývoj s MinIO (S3)

Pro lokální testování S3 příloh použij override:

Override používá připnuté [komunitní sestavení MinIO od Coollabs](https://github.com/coollabsio/minio) a vytváří privátní bucket. Pro již existující MinIO nastav vlastní S3 proměnné a použij základní Compose soubor bez lokálního override.

```bash
# Spustí PostgreSQL + app + MinIO
docker compose -p desigator -f docker-compose.yml -f docker-compose.override.yml up -d

# MinIO Console: http://localhost:9001 (minioadmin / minioadmin)
```

## Proměnné prostředí (.env)

```env
# Aplikace
NODE_ENV=development
PORT=3000

# NextAuth (vygeneruj: openssl rand -base64 32)
AUTH_SECRET=tvuj-secret-key
AUTH_URL=http://localhost:3000

# PostgreSQL
DATABASE_URL=postgresql://desigator:desigator_password@localhost:5432/desigator_db

# S3 (volitelné, pro lokální vývoj lze použít docker-compose.override.yml)
S3_ENDPOINT=https://s3.tvuj-provider.com
S3_REGION=eu-central-1
S3_BUCKET=tvuj-bucket
S3_ACCESS_KEY_ID=tvuj-key
S3_SECRET_ACCESS_KEY=tvuj-secret
S3_FORCE_PATH_STYLE=false
S3_PUBLIC_URL=https://cdn.tvuj-provider.com
```

## Skripty

```bash
npm run dev          # Vývojový server
npm run build        # Produční build
npm run start        # Spuštění produkčního buildu
npm run lint         # ESLint kontrola
npm run typecheck    # TypeScript kontrola bez potlačení chyb

# Databáze
npm run db:push      # Push schéma do DB (bez migrací)
npm run db:migrate   # Vytvoření a aplikace migrace
npm run db:generate  # Generování Prisma klienta
npm run db:seed      # Spuštění seed scriptu
npm run db:admin     # Vytvoření admina z ADMIN_EMAIL / ADMIN_PASSWORD
```

## Struktura projektu

```
src/
├── app/[locale]/         # i18n routy
│   ├── auth/login        # Přihlášení
│   ├── auth/register     # Registrace
│   ├── dashboard         # Nástěnka
│   ├── students          # Správa studentů
│   ├── tasks             # Správa zadání
│   ├── classes           # Správa tříd
│   ├── evaluations       # Hodnocení
│   └── settings          # Nastavení
├── app/api/              # API routes
│   ├── auth/[...nextauth]
│   ├── auth/register
│   ├── classes
│   ├── students
│   ├── tasks
│   └── health
├── components/
│   ├── ui/               # shadcn/ui komponenty
│   ├── app-shell.tsx     # Layout s navigací
│   ├── providers.tsx     # Context providers
│   └── navigation.tsx    # i18n Link
├── lib/
│   ├── db.ts             # Prisma client
│   ├── auth.ts           # NextAuth config
│   ├── s3.ts             # S3 klient
│   └── utils.ts          # Pomocné funkce
├── hooks/                # React hooks
└── i18n.ts               # next-intl config

prisma/
├── schema.prisma         # Databázové schéma
└── seed.ts               # Seed script

messages/
├── cs.json               # České překlady
└── en.json               # Anglické překlady
```

## Klíčové funkce

- **Hromadné přidávání studentů** – vložení více emailů najednou
- **Duplikování tasků** – jedním kliknutím vytvořit kopii zadání s kritérii
- **Role-based přístup** – každá role vidí jen své menu a funkce
- **i18n** – plná podpora češtiny a angličtiny
- **S3 přílohy** – upload souborů do MinIO/AWS S3/Cloudflare R2

## Deploy na Coolify

Pro produkci nastav `ADMIN_EMAIL` a `ADMIN_PASSWORD` (alespoň 12 znaků) v prostředí a spusť `npm run db:admin` z checkoutu připojeného k dané databázi. Příkaz nezmění existující účet a nevytváří demo uživatele. Demo seed je v produkci standardně zakázaný. Proměnné s heslem neukládej do repozitáře.

1. Pushni repo na GitHub/GitLab
2. V Coolify vytvoř nový Resource → Git Repository
3. Vyber svůj repozitář
4. Nastav Build Pack na `Dockerfile`
5. Přidej environment variables z `.env`
6. Připoj externí PostgreSQL databázi (Coolify ji umí vytvořit automaticky)
7. Deploy

## Licence

Private
