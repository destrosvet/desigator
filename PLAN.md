# Plán dokončení Desigatoru

Stav prověřen 20. 10. 2026 statickou kontrolou zdrojů a lokálními kontrolami. Desigator je rozpracovaná platforma pro prohlížení a hodnocení studentských designérských prací: obrázků, grafických návrhů, animací a 3D modelů. Produktové požadavky jsou rozepsané v DOKUMENTACE.md; tento soubor určuje pořadí jejich realizace a eviduje ověření.

## Produktový směr upřesněný uživatelem

Jádrem je pracovní prostředí hodnotitele. Prohlížení studentského díla je prostředek ke kvalitnímu hodnocení: hodnotitel má společně dostupné dílo, zadání, kritéria a formulář hodnocení. Galerie představuje především přehled prací k hodnocení. Třídy, předměty a zadání poskytují organizační kontext. Předměty mají odpovídat oboru: Počítačová grafika, Grafický design, Design, Animace, 3D modelování a související ateliéry.

Hlavní tok: **zadání → galerie studentských prací → detail a prohlížení díla → hodnocení podle kritérií → výsledky a zpětná vazba**.

### Nejbližší produktová etapa — galerie a hodnocení

- [x] Sjednotit demo seed s designérským zaměřením: grafické a designové předměty, zadání ilustrace/vizuální identity/animace/modelu a kritéria vizuálního i technického provedení. Původní data zůstávají zachovaná.
- [x] Vytvořit pracovní galerii přiřazených hodnocení s náhledy, autorem, názvem předmětu, počtem souborů, stavem hodnocení a filtrováním. Hodnotitel vidí jen přiřazené práce.
- [x] Doplnit detail pro hodnocení obrázků: velký náhled, více souborů jednoho díla, přepínání, zoom a celá obrazovka. Zadání a kritéria jsou součástí stejného pracovního prostředí.
- [x] Ověřit skutečný upload a autorizované prohlížení obrázků v privátním testovacím MinIO. Generovat zmenšené WebP na vyžádání a zachovat originál ke stažení; ošetřit načítání a chybu náhledu.
- [ ] Doplnit přehled všech odevzdaných prací pro učitele včetně dosud nepřiřazených hodnocení a filtrování podle dalších parametrů. Současná galerie je přehledem hodnocení, nikoli všech odevzdání.
- [ ] Při větším objemu dat doplnit persistované náhledy a zpracování na pozadí se stavem zpracování.
- [ ] Přidat přehrávání podporovaných animací a videí, ovládání času a opakování. Přesné formáty, limity a případné převody stanovit před implementací.
- [ ] Přidat náhled 3D modelů s otáčením, přiblížením a případným přehráním animace modelu. Vybrat podporovaný náhledový formát a určit postup pro zdrojové soubory bez webového náhledu.
- [x] Propojit prohlížeč obrázků s bodováním kritérií, slovním komentářem, uložením konceptu a dokončením. Ověřit úplnost a jedinečnost kritérií, bodové limity a stav práce s více hodnotiteli.
- [ ] Zobrazit u práce jednotlivé hodnotitele, stav a výsledek jejich hodnocení. Určit pravidlo celkového výsledku při více hodnotitelích; nezavádět automaticky neodsouhlasený průměr.
- [ ] Dokončit studentský pohled na vlastní práci, publikované výsledky a zpětnou vazbu; rozpracovaná hodnocení od výsledků jasně oddělit.
- [x] Rozšířit E2E na skutečný obrázek v pracovním přehledu a jeho hodnocení včetně privátního S3, desktopu, celé obrazovky a mobilního rozložení.
- [ ] Po implementaci rozšířit E2E o podporovanou animaci/video a 3D model.

**Hotovo, když:** hodnotitel otevře přiřazené dílo z galerie, přímo si je prohlédne/přehraje v podporovaném formátu, uloží hodnocení a student u vlastní práce uvidí zveřejněný výsledek. Nepodporovaný zdrojový formát má čitelný stav a možnost stažení originálu.

## Dokončené opravy a ověření (20. 10. 2026)

- TypeScript i ESLint nyní procházejí bez chyb. Build již nepotlačuje chyby typů; příklady a pomocné skills jsou vyřazeny z rozsahu kontroly aplikace, generované E2E reporty z ESLintu.
- Prošlo 19 unit/API testů a všech 5 prohlížečových scénářů včetně skutečného obrázkového odevzdání, náhledů a hodnocení v odděleném privátním MinIO. Původní textové scénáře zůstávají zachované.
- Nová migrace doplňuje importní a párovací pole. Na izolovaném PostgreSQL 16 prošly všechny 3 migrace, demo seed a porovnání schématu bez rozdílů.
- Lokální produkční build i Docker build prošly. Docker entrypoint používá přibalené Prisma CLI, omezené čekání na DB a dostupné migrace. Ověřen start i `/api/health`; kontejner je healthy.
- Sjednocena jazyková konfigurace navigace a middleware; URL mají prefix `/cs` nebo `/en`. Opravena smyčka přihlášení a ztráta jazyka anonymního přesměrování.
- Formulář tvorby zadání nyní vyžaduje výběr předmětu a zobrazuje chyby. Hodnotitel vidí pouze přiřazené tasky, odevzdání a vlastní hodnocení v API i serverové stránce. Opravena viditelnost příloh konceptů a příloh zadání pro přiřazeného hodnotitele.
- Studentské API při jednotlivé tvorbě již nevrací hash hesla. `.env` je vyřazen z Git indexu a lokálně zachován; přidán bezpečný `.env.example`. Historie Gitu tím není přepsána.
- Demo seed oddělen od produkčního vytvoření administrátora (`npm run db:admin`); produkční demo seed je standardně blokovaný. Lokální inicializace MinIO výslovně zachovává privátní bucket.
- Připravena `.github/workflows/ci.yml` pro migrace, shodu schématu, seed, typecheck, lint, unit/API testy, build a E2E. Běh na GitHubu zatím nebyl spuštěn.

### Testovací prostředí

- Aplikace: http://localhost:3102/cs/auth/login (`desigator-audit-app`, image `desigator:audit`).
- Oddělená DB: `desigator-audit-postgres`, lokální port 54329, databáze `desigator_audit` s demo daty.
- Demo přihlášení: `teacher@desigator.cz` / `teacher123`, `student1@desigator.cz` / `student123`, `evaluator@desigator.cz` / `evaluator123`.
- Pomocný Node server na portu 3100 byl po testech ukončen. Běžící Docker náhled a testovací DB jsou ponechány pro kontrolu.
- Opraven S3 podpis (binární odvozování HMAC klíčů, UTC čas se Z, podepisovaný host a URL adresování bucketu); změna ověřena reálným uploadem a stažením přes MinIO.
- Existující databáze a používaný MinIO bucket nebyly měněny. Upload/download a chráněné náhledy byly ověřeny v samostatném `desigator-audit-minio` na portu 19000 s privátním bucketem `desigator-audit`.
- Upgrade naplněné staré DB přes migraci rušící `task_assignments` stále vyžaduje samostatný bezpečný převod a ověření. Neprovádět jej naslepo na existujících datech.
- Instalace produkčních závislostí oznámila 17 auditních nálezů včetně 2 critical. Je potřeba samostatně vyhodnotit dotčené balíčky a jejich dosažitelnost; automatický major upgrade nebyl proveden.

## Co již existuje

- Přihlášení přes NextAuth, registrace studentů, role ADMIN / TEACHER / EVALUATOR / STUDENT a základní omezení četnosti požadavků.
- Model tříd, členství, předmětů, zadání, kritérií, odevzdání, hodnocení a příloh v Prisma.
- Obrazovky nástěnky, studentů, tříd, předmětů, zadání, hodnocení a profilu.
- API pro členství ve třídách, duplikování zadání, odevzdávání, hromadný upload a hodnocení; autorizované stahování příloh.
- České a anglické překlady a konfigurace Docker / PostgreSQL / MinIO.
- Základ testů: 4 soubory s 12 unit/API testy prošly. Dva scénáře Playwright existují, při tomto průzkumu nebyly spuštěny.

Existence implementace neznamená ověřenou funkčnost celé aplikace s databází a úložištěm.

## Výchozí výsledky průzkumu (před opravami)

- Uložený aktuální realizační plán nebyl v prohledaných projektových souborech nalezen. DOKUMENTACE.md popisuje mnohem starší stav; README.md naopak některé možnosti prezentuje jako dokončené.
- Git obsahuje mnoho změn a nesledovaných souborů včetně podstatných částí aplikace. Počet změn sám neurčuje rozsah skutečné práce; zvlášť je nutné odlišit obsahové změny od formátování a pomocných skills.
- `npm test`: 12/12 prošlo; API testy používají mock databáze, neověřují migrace ani skutečné S3.
- `npx tsc --noEmit`: neprošlo. Chyby jsou v seed skriptech, subjects/page.tsx, students API, i18n i v příkladech a pomocných skills. Konfigurace Next.js má `typescript.ignoreBuildErrors: true`, takže samotný build není dokladem typové správnosti.
- `npm run lint`: neprošlo; 9 chyb a 1 varování (zejména React hooks a komponenty vytvářené při renderování).
- Produkční build, běh v prohlížeči, dostupnost DB/S3 ani skutečné nasazení nebyly ověřeny. Nebyly spouštěny migrace, seed ani import existujících dat.

## Doplnění po ověření Docker Desktopu

- Docker engine je dostupný. V seznamu kontejnerů nebyly nalezeny služby Desigatoru; Docker Desktop samotný tedy neznamená spuštěný projekt.
- Existuje jiný Compose projekt se jménem `web`. Pro Desigator používat explicitní jméno projektu (např. `docker compose -p desigator ...`) a explicitní soubory, aby nedošlo ke kolizi.
- Podle potvrzení uživatele je používaný MinIO bucket privátní (Community Edition) a nebyl měněn. Původní lokální override obsahoval zveřejnění; to je opravené na `mc anonymous set none`. Lokální override i CI používají připnuté komunitní sestavení MinIO od Coollabs; původní registry při ověření odmítly stažení.
- Při tomto ověření nebyly spuštěny služby, migrace ani seed.

## 1. P0 — Stabilní základ a reprodukovatelná databáze

- [ ] Udělat přehled pracovních změn, zachovat existující práci a připravit logické commity. Prověřit sledované `.env` a případně odstranit tajné hodnoty z verzování; připravit bezpečný `.env.example`. Obsah tajných hodnot nevypisovat.
- [x] Srovnat `prisma/schema.prisma` a migrační historii: migrace neobsahují současné `User.externalId`, `User.legacyId`, `Task.legacyId` ani `Subject.code`.
- [x] Ověřit migrace na nové izolované databázi a shodu výsledného schématu s Prisma modelem.
- [ ] Pro upgrade starých dat připravit převod přiřazení tasků do předmětů: existující migrace ruší `task_assignments` a přidává povinné `subjectId` bez doplnění dat.
- [x] Opravit TypeScript chyby aplikace a seedů. Upravit rozsah tsconfig/ESLint tak, aby přibalené příklady a skills neblokovaly kontroly aplikace; netlumit tím chyby vlastního kódu.
- [x] Vypnout `ignoreBuildErrors` a získat úspěšný typecheck, lint a produkční build.
- [x] Ověřit Docker start: nahradit nedeklarované `pg` přibaleným Prisma CLI a doplnit omezené čekání na DB. Demo seed a vytvoření admina dokumentovat jako příkazy z vývojového checkoutu.
- [x] Sjednotit README se skutečnými příkazy: doporučené `prisma db seed` nemá zjevnou konfiguraci seedu, zatímco existuje `npm run db:seed`. Oddělit demo seed s výchozími hesly od produkční inicializace.

**Hotovo, když:** čistý checkout lze podle dokumentace nainstalovat, migrovat, sestavit a spustit s prázdnou testovací DB; upgrade dat má samostatně ověřený postup bez ztráty vazeb.

## 2. P0 — Sjednocení oprávnění a ochrany dat

- [x] Omezit `GET /api/tasks` pro hodnotitele na skutečně přiřazené práce. Nyní vrací všechna publikovaná zadání.
- [x] Omezit odevzdání v detailu tasku pro hodnotitele: oprávnění k jednomu hodnocení nyní dovolí načíst všechna odevzdání daného tasku.
- [x] Sjednotit oprávnění příloh s viditelností zadání a přiřazením hodnotitele; `canReadAttachment` nekontroluje publikování zadání u členů třídy a neřeší hodnotitele příloh zadání stejně jako `canViewTask`.
- [ ] Definovat a prosadit rozsah seznamu studentů pro učitele; nyní není omezen vlastnictvím třídy. Prověřit seznamy, detaily i přímé API požadavky napříč rolemi.
- [ ] U studentského POST vracet jen bezpečný výběr polí: současná jednotlivá tvorba vrací celý model včetně hashe hesla. Doplnit validaci hromadného vstupu a bezpečné předání přístupových údajů.
- [ ] Vyřešit změnu role/deaktivaci již přihlášeného uživatele: role je nyní zapsaná v JWT při přihlášení bez následného ověřování aktuálního stavu účtu.
- [ ] Přidat negativní testy cizí třídy, nepřiřazeného hodnotitele, konceptu zadání a cizí přílohy.

**Hotovo, když:** každá role přes UI i přímé API získá pouze dovolená data; testy pokrývají i pokusy o přístup přes cizí ID.

## 3. P1 — Dokončení hlavního pracovního toku

- [x] Doplnit výběr předmětu do formuláře tvorby zadání (`tasks/page.tsx`): `subjectId` zůstává prázdné a formulář pro něj nemá ovládací prvek, přestože API vyžaduje platný předmět.
- [ ] Doplnit správu kritérií, jejich pořadí a bodových limitů z uživatelského rozhraní; sladit součet kritérií s maximem zadání. Ověřit také editaci zadání, termínu a případných příloh zadání.
- [ ] Opravit odkaz `/students/[id]`: seznam na něj odkazuje, odpovídající stránka v projektu chybí. Zvolit implementaci detailu nebo odstranění nefunkční akce.
- [ ] Doplnit správu školního `externalId` studentů, které potřebuje párování hromadného uploadu; v jednotlivém studentském API chybí jeho zadání.
- [ ] Dokončit životní cyklus hodnocení: úplnost a jedinečnost kritérií, celkový limit bodů, pravidla více hodnotitelů, vrácení práce a opakované odevzdání po hodnocení. Nyní opětovné odevzdání mění stav práce, ale ponechává původní hodnocení.
- [ ] Rozhodnout a sjednotit přístup studenta k výsledkům: middleware blokuje `/evaluations`, ale detailové API studentský přístup umožňuje. Prověřit výsledky přímo v detailu zadání i dostupnost uzavřených zadání.
- [ ] Nastavení nyní jen zobrazuje profil. Doplnit změnu hesla a potřebnou správu účtu; pro provoz vyřešit obnovu přístupu a vytváření učitelů/hodnotitelů bez ručních zásahů do DB.

**Hotovo, když:** učitel založí třídu, přidá studenta, vytvoří předmět a publikované zadání s kritérii; student odevzdá; přiřazený hodnotitel ohodnotí; student uvidí výsledek. Vše bez ručních změn databáze.

## 4. P1 — Uživatelské rozhraní a lokalizace

- [ ] Doplnit zobrazení chyb API a potvrzení úspěšných akcí; řada klientských operací pouze zapisuje chybu do konzole nebo kontroluje `res.ok` bez vysvětlení uživateli.
- [ ] Dokončit CS/EN texty: řada stránek má natvrdo české popisky. Prověřit přesměrování a navigaci zachovávající jazyk, zejména přihlášení.
- [x] Opravit konfiguraci next-intl a bezpečnou výchozí locale; aktuální typecheck ukazuje možnost `undefined`.
- [ ] Sjednotit validaci stránkování, sortování, stavů, termínů a bodových hodnot v API; odmítat neplatné požadavky jako 400 místo chyb DB.
- [ ] Prověřit prázdné stavy, načítání, mobilní navigaci a formuláře z klávesnice.

**Hotovo, když:** hlavní tok funguje v obou jazycích, chyby jsou čitelné a žádná nabízená akce nekončí slepým odkazem.

## 5. P1 — Ověření a příprava pilotu

- [ ] Spustit existující Playwright scénáře a přidat hlavní tok pro učitele, studenta a hodnotitele na izolované DB a MinIO.
- [ ] Ověřit upload, stažení, zamítnutí nepovolených souborů, termín odevzdání a úklid po selhání; ověřit i hromadné párování souborů.
- [ ] Zprovoznit CI: testy, typecheck, lint, build a test migrací na čisté DB.
- [ ] Ověřit produkční konfiguraci, zálohu a obnovu DB/S3, bezpečné inicializační účty a healthcheck.
- [ ] Aktualizovat README a DOKUMENTACE.md podle skutečně ověřeného stavu.

**Hotovo, když:** automatické kontroly projdou a pilot lze obnovit ze zálohy; všechny čtyři role mají ověřené hlavní scénáře.

## Doporučené pořadí

1. Zachytit pracovní stav → opravit migrační historii a kontroly.
2. Zavřít mezery oprávnění a citlivých odpovědí.
3. Dokončit galerii studentských prací a vizuální detail obrázků s navázaným hodnocením; upravit demo předměty a zadání pro designéry.
4. Rozšířit prohlížení o animace/video a 3D modely, včetně odpovídajících formátů, náhledů a ověření.
5. Dokončit správu účtů, chyby UI a překlady.
6. Integrační ověření, CI, dokumentace a pilot.

Zustand, TanStack Query ani DnD nejsou samy o sobě chybějící produktové funkce. Jejich zavedení není podmínkou MVP. Rozšíření typu notifikací, exportů či pokročilých statistik naplánovat až podle potřeb po ověření hlavního toku.







## Hodnoticí workflow – upřesnění 20. 10. 2026

Hodnotitel začíná přehledem předmětů. Po výběru předmětu vidí úkoly s postupem hodnocení, po výběru úkolu mřížku všech přiřazených studentských prací. Jednotlivé práce se v úvodním přehledu napříč úkoly nemíchají.

Detail upřednostňuje velký náhled a posuvníky kritérií přímo pod obrázkem. Více pohledů práce je dostupných v pásu náhledů. Studenti se přepínají tlačítky nebo klávesami ← → v rámci stejného úkolu a hodnotitele. Sousední práce se přednačítají. Komentáře a zadání jsou ve sbalených volitelných sekcích.

Změny bodů se automaticky ukládají jako koncept. Při přechodu na dalšího studenta se hodnocení s explicitně vyplněnými všemi kritérii dokončí; neúplné zůstane rozpracované. Výchozí poloha posuvníku na nule se nepovažuje za přidělenou známku. Chyba ukládání zastaví přechod a ponechá změny ve formuláři.
