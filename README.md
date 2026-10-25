# Desigator – prohlížení a hodnocení designérských prací

Aktuální postup produkčního nasazení: [DEPLOYMENT.md](DEPLOYMENT.md).

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


## Import a historie prací

V detailu zadání otevře učitel „Hromadně nahrát práce“. Název `4464341_02.jpg` navrhne autora podle školního ID `4464341`; každý návrh lze před potvrzením opravit nebo soubor vyřadit. Upload a zápis začnou až po kontrole autorů.

Učitelský import i vlastní upload studenta vytvářejí verze označené WIP nebo Finální. Historie zachová soubory, čas, autora uploadu, popis změn a hodnocení každé verze. WIP slouží k prohlížení, nové bodování se přiřazuje finální verzi. Obrázky a MP4/WebM lze prohlížet přímo v aplikaci (video podle podpory kodeku prohlížečem, bez převodu); PDF se nyní také zobrazuje přímo v aplikaci; ZIP je ke stažení (aktualizace 25. 10. 2026). Limity jsou 25 MB na soubor, 20 souborů/100 MB v učitelské dávce a 5 souborů ve studentské verzi.

Nové schéma vyžaduje migraci `20261021130000_submission_versions`. Před upgradem používané databáze postupujte podle plánu a ověřte zálohu; vývojové ověření migrací proběhlo na oddělené testovací DB.


Upřesnění 21. 10. 2026: MP4 nyní může mít až 100 MB v učitelském i studentském uploadu. Ostatní formáty včetně WebM zůstávají na 25 MB. Celkový limit učitelské dávky zůstává 100 MB. Uživatel potvrdil pravidlo: WIP pro průběžnou konzultaci, finální verze pro bodové hodnocení.

### Více škol a oprávnění

V Nastavení → Moje škola lze založit organizaci. Zakladatel je zároveň správcem školy, učitelem a hodnotitelem. Školní správce pozve další uživatele odkazem a zvolí kombinaci oprávnění. Uživatel má jednu domovskou školu; přiřazené práce může hodnotit i v jiných školách. Globální správce platformy je samostatné oprávnění. Migrace existujících instalací je v prisma/migrations/20261021210000_organizations; podrobnosti a ověření jsou v DOKUMENTACE.md a PLAN.md.


## Hesla, Resend a opakování importu (21. 10. 2026)

Změna hesla je v Nastavení → Můj profil pro všechny role. Vyžaduje současné heslo a odhlásí všechny dosavadní relace. Obnova je na přihlašovací stránce přes „Zapomněli jste heslo?“. Odkaz je jednorázový, platí 30 minut a v DB se uchovává pouze hash tokenu. Nové heslo při změně, obnově a jednotlivé tvorbě studenta musí mít alespoň 12 znaků a nejvýše 72 UTF-8 bajtů; dosavadní hesla se při přihlášení nemění.

Transakční e-maily odesílá server přímo přes Resend. Produkční nastavení:

```env
RESEND_API_KEY=<vložit tajný API klíč pouze do prostředí>
RESEND_FROM="Desigator <noreply@desigator.cz>"
APP_URL=https://desigator.cz
```

Ověřte odesílací doménu v Resendu. APP_URL musí odpovídat veřejné adrese aplikace, používá se i pro kontrolu původu požadavků za proxy. Pro lokální vývoj ji změňte na lokální URL; v produkci je pro e-mailové odkazy povinné HTTPS. Docker Compose tyto proměnné předává aplikaci. API klíč se nepřidává do klientského JavaScriptu. Bez nastavení je obnova viditelně nedostupná (503); při žádosti se nezveřejňuje existence účtu. Chyba doručení se loguje bez adresy/tokenu a právě vytvořený token se odstraní. Limity pokusů používají stávající paměťový limiter, tedy platí pro jeden běžící proces. Referenční API: [Resend Send Email](https://resend.com/docs/api-reference/emails/send-email).

Migrace `20261022000000_passwords_and_import_retries` přidává verzi relace, resetovací tokeny a záznamy importních dávek. V nasazení aplikujte migrace před spuštěním nové verze aplikace. Ověření této etapy proběhlo v oddělené DB; používané databáze se tímto krokem nemění.

Hromadný import prací ukládá obsahový SHA-256 otisk celé dávky v rámci zadání: autoři, názvy, MIME typy, obsah souborů a WIP/FINAL. Změna pořadí souborů či poznámky nevytváří novou dávku. Stejná dávka vrací výsledek s `replayed: true` bez nových verzí; souběžné požadavky se kontrolují znovu po zámku zadání. Změněný obsah nebo přechod WIP → FINAL vytvoří novou verzi. Ochrana eviduje dávky importované touto verzí; historické importy bez záznamu dávky se zpětně neidentifikují.

Starší POST /api/students s polem e-mailů validuje celou dávku (1–200 adres), normalizuje e-maily, odmítá duplicity a vytváří účty atomicky. Existující adresy přeskočí bez změny jejich účtů. Nová hesla generuje crypto.randomBytes; přihlašovací údaje vrací pouze pro nové účty s Cache-Control: no-store.

Pro izolované ověření nových E2E nastavte E2E_PASSWORDS=true a E2E_PASSWORDS_DATABASE_URL na dedikovanou databázi desigator_passwords_check nebo desigator_passwords_test. Testy mění pouze dočasný účet; importní scénář potřebuje také privátní testovací S3. V CI jsou oba scénáře zapnuté proti desigator_ci. Alternativní NEXT_BUILD_DIR umožňuje sestavit aplikaci mimo soubory běžícího lokálního náhledu; výchozí výstup zůstává .next.

Aktuální lokální náhled: http://127.0.0.1:3104, kopie DB desigator_public_results_preview a privátní bucket desigator-publication-preview. Spouštěcí runtime je mimo .next v ignorovaném local-public-results-preview. Původní databáze ani úložiště nebyly při převodu náhledu měněny.


## Zveřejňování výsledků (22. 10. 2026)

Dokončení hodnocení připraví výsledek pro učitele. Učitel v detailu konkrétní finální verze zvolí **Zveřejnit výsledky** a potvrdí dialog. Zveřejnit lze práci s alespoň jedním hodnocením, až všichni přiřazení hodnotitelé dokončí své hodnocení a mají platný celkový počet bodů. Platné je i výslovně přidělené nulové skóre. Zadání musí být publikované nebo uzavřené.

Student potom u této verze vidí jednotlivá hodnocení, jména hodnotitelů, body a komentáře. Nezveřejněná hodnocení jsou skrytá i v detailu a seznamu API. Každá verze má vlastní zveřejnění; nové WIP/finální odevzdání nezačne automaticky zobrazovat výsledky starší verze.

Zveřejnění uzamkne body i přiřazování hodnotitelů dané verze. Pro opravu učitel zvolí **Stáhnout ze zveřejnění** a potvrdí dialog. Student přestane vidět výsledky, body zůstanou uložené. Po opravě je lze znovu zveřejnit. Přehled zadání ukazuje stav zveřejnění u poslední verze každého studenta.

Migrace `20261022100000_result_publication` přidává datum zveřejnění a ID zveřejňujícího uživatele. **Žádné starší výsledky nezveřejňuje: po nasazení musí učitel výslovně zveřejnit i dříve dokončené výsledky.** Před spuštěním nové aplikace je nutné aplikovat migraci. Nezavádí se výpočet společné známky; publikují se jednotlivá dokončená hodnocení.

Testy E2E používají E2E_PUBLICATION=true a E2E_PUBLICATION_DATABASE_URL s izolovanou DB desigator_publication_test (v CI desigator_ci). Ověřují i souběžné zveřejnění a změnu bodů, nulové body, skrytí přes API, odebrání zveřejnění a nové verze.


## Veřejné výsledky a stupnice školy (22. 10. 2026)

Veřejný přehled je na /cs/results (anglicky /en/results), odkaz je také na přihlašovací stránce. Učitel v detailu třídy zapne **Veřejné sdílení výsledků** a získá odkaz na konkrétní třídu. Výchozí stav všech tříd je vypnutý. Vypnutí znepřístupní stránku, API i náhledy při následujícím požadavku.

Přehled odděluje předměty a roky. Studenti se zobrazují pouze školním ID; jména, e-maily, interní ID uživatelů, původní názvy souborů, komentáře hodnotitelů ani připojovací kód třídy se veřejně neposílají. Aktivní student bez školního ID je vynechán; detail třídy na chybějící ID upozorňuje. Zobrazení lze filtrovat podle ID.

Za každý úkol se bere poslední zveřejněná finální verze a průměr bodů všech dokončených hodnocení. Novější soukromé finální verze ani WIP se neukážou. Body za úkoly se sčítají, celkový součet se zaokrouhluje na dvě desetinná místa. Nezveřejněné výsledky mají pomlčku a přispívají nulou; známka je v tom případě označena hvězdičkou jako průběžná. Při nulovém maximálním součtu se známka nepočítá.

Nad body lze myší, klávesnicí nebo klepnutím otevřít náhled obrázků. Veřejná cesta poskytuje zmenšené WebP bez původních metadat a po každém požadavku ověřuje oprávněnost zveřejnění. Původní soubory zůstávají za přihlášením; videosoubory a ostatní přílohy se anonymně neposkytují. Odpovědi veřejného API a náhledů mají Cache-Control: no-store.

**Nastavení → Moje škola a členové → Klasifikační stupnice školy** umožňuje správci školy zvolit ECTS A–F (výchozí minima 90/80/70/60/50 %) nebo číselné známky 1–5 (výchozí minima 90/75/60/50 %). Procentní hranice lze upravit; musí být v rozsahu 0–100 a přísně sestupné. Správce platformy může stupnici upravit také ve správě vybrané organizace. Učitel bez oprávnění správce školy nastavení měnit nesmí. Každá škola má vlastní stupnici; její změna ihned přepočítá veřejné známky, uložené body a jednotlivá hodnocení se nemění. Platná pravidla jsou uvedena pod veřejnou tabulkou. Bodový výchozí převod ECTS odpovídá stupnici VUT (https://dokumentace.favu.vut.cz/is/zapocet.html); ECTS samo nestanovuje univerzální procentní hranice pro všechny školy.

Před nasazením aplikovat migrace 20261022120000_public_results a 20261022130000_school_grading. Existující třídy se nezveřejňují automaticky, existující školy dostanou výchozí ECTS. E2E veřejného přehledu a nastavení školy vyžaduje E2E_PUBLIC_RESULTS=true a E2E_PUBLIC_RESULTS_DATABASE_URL na izolovanou DB desigator_public_results_test (v CI desigator_ci).

Ověření: 226 unit/API testů, typecheck, lint, produkční build a 3 prohlížečové scénáře (anonymní přehled, školní konfigurace a odvolání přístupu včetně obrázků, přihlašovací ochrana). Upgrade na oddělené kopii zachoval 455 uživatelů a 22 hodnocení; veřejné sdílení zůstalo u všech tříd vypnuté. Lokální náhled běží na http://127.0.0.1:3104 s DB desigator_public_results_preview, privátním bucketem desigator-publication-preview a runtime local-public-results-preview.


### Sdílení výsledků neveřejným odkazem (22. 10. 2026)

Přehled /cs/results již nevypisuje žádné třídy; obsahuje pouze pokyn otevřít odkaz od učitele. Anonymní index API vrací prázdný seznam. Při zapnutí sdílení se vytvoří náhodný 256bitový klíč a URL /cs/results/<klíč>. Pouhé ID třídy nestačí ke čtení stránky, výsledků ani obrázků. Odkaz se ukazuje pouze oprávněnému správci třídy; nepřidává se do běžných odpovědí tříd pro studenty. Stránky mají noindex, nofollow a no-referrer. Kdokoli s předaným odkazem může výsledky číst bez přihlášení.

V detailu třídy lze odkaz kopírovat, vypnout nebo zvolit Vygenerovat nový odkaz. Výměna zneplatní starý klíč včetně náhledů. Vypnutí odstraní klíč; nové zapnutí vytvoří jiný. Souběžné změny sdílení se serializují zámkem třídy. Migrace 20261022140000_unlisted_results přidává samostatnou tabulku results_shares; původní URL přes ID třídy přestanou poskytovat data. Pro existující zapnutou třídu bez klíče zvolte Vygenerovat nový odkaz.

Lokální ukázka používá samostatnou třídu, tři fiktivní školní ID DEMO-001 až DEMO-003, dva úkoly a syntetické obrázky. Původní studentská hodnocení se tímto nezveřejňují.

Ověřeno po zavedení odkazů: 228 unit/API testů, typy, lint, produkční build a 3 E2E scénáře včetně výměny a odvolání klíče. Lokální náhled 3104 používá runtime local-unlisted-results-preview. Ukázka byla ověřena anonymně v prohlížeči včetně náhledů obrázků; sdílecí URL je dostupná oprávněnému učiteli v detailu ukázkové třídy.


### Vzhled výsledků a komentáře (22. 10. 2026)

Veřejný přehled má samostatnou hlavičku s přihlašovacím tlačítkem, jediný název předmětu s rokem, souhrn počtu studentů/úkolů a tabulku s barevnými známkami. Přepínání předmětů se zobrazuje pouze při více možnostech. Legenda výpočtu je rozbalovací.

Náhled u bodů poskytuje obrázky i textové komentáře ze zveřejněných dokončených hodnocení včetně komentářů ke kritériím. Jména hodnotitelů ani jejich interní ID se neposílají. Pokud obrázek chybí, samotný komentář lze otevřít přes ikonu u bodů. Sekce bez komentářů se nevykreslí. Text se vykresluje jako běžný text, nikoli HTML. Komentáře novějších nezveřejněných verzí se nesdílejí. Popis sdílení v detailu třídy výslovně uvádí, že držitel odkazu vidí zveřejněné komentáře.


### Učitelský přehled a desetinné korekce (22. 10. 2026)

Z detailu předmětu nebo třídy lze otevřít Přehled výsledků a známek (/cs/subjects/<id>/results). Učitel předmětu, školní správce a správce platformy vidí jména, školní ID, body na dvě desetinná místa, součty a vzdálenost od vyšší i nižší známky podle stupnice školy. Přehled pracuje s poslední finální verzí; nezveřejněné výsledky jsou označené. Veřejný a studentský přehled nadále vycházejí jen ze zveřejněných verzí.

Korekce se ukládají odděleně od hodnocení úkolů jako celočíselné setiny bodu. Např. 89,80 + 0,20 dává přesně 90,00 a A při výchozí stupnici ECTS. Povinný důvod, autor, datum a záznam storna tvoří historii. Opakovaný stejný požadavek nepřidá body dvakrát. Při uložení se výsledný součet okamžitě změní; formulář ukazuje náhled. Storno ponechá záznam a odečte jeho dopad.

Volba Zobrazit studentovi zpřístupňuje samostatný záznam a důvod pouze přihlášenému příslušnému studentovi v jeho výsledcích. Vypnutá volba důvod ani položku neposílá klientovi studenta. Viditelnost lze později změnit v historii. Skrytá i zobrazená korekce se počítají do celkových bodů a známky. Anonymní sdílecí odkaz dostává jen přepočtený součet/známku; nikdy žádné důvody korekcí ani jejich samostatné záznamy. Před spuštěním aplikovat migraci 20261022160000_point_adjustments.

Ověření učitelského přehledu: 257 unit/API testů, typy, lint, produkční build a 4 prohlížečové scénáře. Testuje se přesný přechod 89,80 + 0,20 na A, idempotence, zobrazení/skrytí jen přihlášenému vlastnímu studentovi, izolace jiného studenta, zachování soukromí v anonymním odkazu a storno s historií. Náhled 3104 používá runtime local-teacher-results-preview. V ukázkové třídě přibyl syntetický předmět Hraniční hodnocení – ukázka; žádná korekce nebyla do ukázky automaticky uložena.


## Konzultace, média a nástěnka — 25. 10. 2026

U každé WIP verze je samostatná diskuse studenta a správce zadání. Zpráva má 1–5000 znaků; server určuje autora i verzi a vrací pouze jméno/ID autora. Čte se posledních 50 zpráv s možností načíst starší; tlačítko Obnovit diskusi načte nové odpovědi. Při chybě odeslání zůstane text zachovaný. Nová finální verze diskusi nepřebírá; staré zprávy zůstávají u původní WIP verze. Externí hodnotitel a cizí student přístup nemají. Konzultace se nezveřejňují ve sdílených výsledcích. API používá private, no-store a limit 30 zpráv za minutu na účet v jednom procesu.

Před spuštěním nové verze aplikovat aditivní migraci 20261025100000_wip_consultations a vygenerovat Prisma klienta. Přidává pouze tabulku konzultací a vazby, nemění existující hodnocení, soubory ani zveřejnění.

PDF se zobrazuje vestavěným prohlížečem v privátním náhledu s podporou byte ranges. Ovládání stránek a zoomu poskytuje prohlížeč; pro zařízení bez PDF náhledu zůstává stažení originálu. Rámování náhledu je povolené jen ze stejného původu. Ostatní stránky zachovávají zákaz rámování.

3D náhled podporuje samostatný GLB 2.0 do 25 MB s vloženou geometrií/texturami a případnou animací. Podporuje otáčení, zoom, obnovení kamery, volbu animace, přehrání, pauzu, opakování a časovou osu. Knihovna se načítá až při otevření modelu. Server kontroluje GLB hlavičku/chunky a odmítá externí URI, SVG data a Draco/Meshopt/KTX2 komprese vyžadující další dekodéry. Zdrojové .blend/.fbx a vícesouborové projekty přiložte jako ZIP. Modely se anonymně nesdílejí. Implementace vychází z [model-viewer dokumentace](https://modelviewer.dev/docs/).

Nástěnka ukazuje skutečná dostupná zadání a poslední dostupná odevzdání s funkčními odkazy. Student vidí počty verzí, dostupných zadání, zveřejněných výsledků a vlastních tříd. Hodnotitel má počty přiřazených, nedokončených a dokončených hodnocení. Učitel přehled studentů, zadání, nedokončených hodnocení a tříd. Nová nástěnka, konzultace a 3D ovládání mají CS/EN texty.

Bezpečnostní aktualizace: Next.js 16.4.3, NextAuth 4.24.15, next-intl, Zod a Sharp 0.35.5; odstraněny dva nepoužívané editory. Startovací npm příkaz funguje také na Windows.


## Závěrečné ověření — 25. 10. 2026

- 273 unit/API testů (40 souborů), TypeScript a lint prošly. Produkční build prošel s Next.js 16.4.3.
- 23 prohlížečových scénářů prošlo v souhrnném běhu; 4 specializované scénáře organizací / historických statistik nebyly pro tuto novou DB zapnuté. Cíleně následně prošel posílený test konzultací a médií v plném Chromiu včetně ověření barevných pixelů skutečně vykresleného PDF. Headless-shell PDF prohlížeč neobsahuje, proto se pro tento test používá channel chromium.
- E2E ověřuje vloženou GLB animaci, kameru, časovou osu z klávesnice, zprávy studenta/učitele, vykreslení textu jako textu, izolaci cizího studenta, privátní PDF a zachování konzultace u původní verze. Další nový scénář ověřuje nástěnku v CS/EN, studentovi skryté koncepty, funkční odkazy a mobilní zobrazení.
- Všech 16 migrací prošlo na prázdné DB; shoda schématu bez rozdílů. Upgrade kopie dosavadního náhledu také prošel bez rozdílů.
- Aktualizovaný náhled: http://127.0.0.1:3104/cs/dashboard, samostatný runtime local-completion-preview, DB desigator_completion_preview a privátní bucket desigator-completion-preview. Čtecím průchodem ověřeno přihlášení, nástěnka, profil, health a statistiky, bez page errors.
- Zdrojová desigator_public_results_preview i původní bucket zůstaly zachované. Porovnání před/po: 462 uživatelů, 43 hodnocení, 57 příloh, 10 328 archivních hodnocení v obou databázích.
- Audit všech závislostí: 0 critical, 4 high a 1 low. Produkční audit: 0 critical a 3 high z jedné závislostní větve prisma → @prisma/config → deepmerge-ts. Vývojová větev má navíc js-yaml a esbuild. Kompatibilní audit fix tyto zbývající položky neodstranil; major upgrade / override nebyl naslepo proveden. Opravené minimální verze Next.js, NextAuth, next-intl, Zod a UUID jsou zvýšené i v package.json.
- Původní historické checkboxy pod aktuálním souhrnem se nepovažují za seznam chyb současné aplikace. Produkční Resend, bezpečný převod úplně nejstarší DB, obnova ze zálohy a zbývající celoplošné překlady stále vyžadují samostatnou práci před plným produkčním nasazením.
