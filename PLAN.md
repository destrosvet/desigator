# Plán dokončení Desigatoru

## Přesun studentů mezi třídami — 26. 10. 2026

- [x] Stránka Studenti a správa studentů v detailu třídy používají společnou komponentu StudentList. Detail má pevný filtr classId; původní samostatný výpis a výběr z až 500 kandidátů jsou odstraněné.
- [x] Hromadný přesun vybraných studentů i přesun jednoho studenta z menu řádku. Při aktivním filtru třídy je původní skupina předvybraná; jinak se volí společná původní skupina. Potvrzovací dialog ukazuje studenty a obě skupiny, má CS/EN a zachová výběr při chybě.
- [x] Server kontroluje správu obou aktivních skupin a jejich stejnou školu. Celá dávka 1–200 studentů se přesune v transakci se zámky a bez duplicit cílového členství. Změněné členství nebo neplatný student odmítne celou dávku.
- [x] Účty, ostatní členství, práce, hodnocení a korekce zůstávají zachované. Historické práce zůstávají při původních zadáních a předmětech; nepřevádějí se do jiné výuky.
- [x] Odebrání v detailu třídy ruší pouze členství, jednotlivě i hromadně. Mazání účtů je nadále samostatná akce hlavního seznamu. Import i změna členství obnovují společnou tabulku.
- Ověřeno: 311 unit/API testů (včetně 26 nových kontrol přesunu a odebrání), TypeScript, cílený lint a produkční build. Lokální Chromium se synteticky nahrazenými API ověřilo desktop/mobil, zrušení, konflikt, opakování, odeslanou dávku a obnovení seznamu bez chyb stránky.
- Přidaný databázový E2E scénář tests/e2e/student-transfer.spec.ts je součástí standardní CI sady; lokálně nebyl spuštěn, protože Docker/PostgreSQL není dostupný. Produkční data ani Coolify nebyly touto úpravou změněny. Migrace schématu není potřeba.

## Aktuální stav — 25. 10. 2026

Tento souhrn nahrazuje starší priority a checkboxy níže. Historické záznamy jsou ponechané jako evidence vývoje.

- [x] Hlavní tok předmět → zadání → import / odevzdání → neměnné WIP/finální verze → hodnocení → výslovné zveřejnění výsledků.
- [x] Školy, školní ID, CSV/XLSX import studentů, šablony, přílohy zadání, účty a hesla, statistiky a soukromé / sdílené výsledky s korekcemi.
- [x] Konzultační diskuse studenta a správce zadání ke konkrétní WIP verzi; historie, stránkování, CS/EN, validace a limit zpráv. Konzultace nejsou součástí bodování ani veřejných výsledků.
- [x] Privátní náhledy obrázků, MP4/WebM, PDF a samostatných GLB 2.0 modelů; 3D otáčení, zoom, volba animace, pauza, opakování a časová osa.
- [x] Validace GLB před zápisem: bez externích URI a bez Draco/Meshopt/KTX2; ostatní zdrojové formáty předávat v ZIPu.
- [x] Nástěnka se skutečnými dostupnými zadáními a posledními odevzdáními; počty podle role. Nedokončená hodnocení zahrnují i rozpracovaná.
- [x] Bezpečnostní aktualizace Next.js / NextAuth / next-intl / Zod / Sharp a odstranění nepoužívaných editorů. Kritické nálezy odstraněny.
- [x] Všech 16 migrací prošlo od prázdné izolované DB; výsledné schéma odpovídá Prisma modelu bez rozdílů.

### Co ještě vyžaduje další krok

- [ ] Produkční Resend: doplnit klíč, ověřit doménu a skutečné doručení. Přístupy nejsou součástí repozitáře.
- [ ] Produkční nasazení, záloha/obnova a samostatně ověřený převod nejstaršího schématu s task_assignments. Původní databáze a soubory nebyly při této etapě měněny.
- [ ] Dokončení starších pevných českých textů napříč celou aplikací; nová nástěnka, konzultace a 3D ovládání mají CS/EN.
- [ ] Persistované náhledy, fronta a převody velkých médií při větším objemu dat. Současné náhledy fungují v popsaných limitech bez transkódování.
- [ ] Dořešit zbývající auditní nálezy závislostí; nepoužívat neověřený major upgrade Prisma ani plošný audit fix --force.

Aktuální ověření a přesný počet E2E scénářů jsou v záznamu 25. 10. 2026 na konci souboru.

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
- [x] Doplnit správu kritérií, jejich pořadí a bodových limitů z uživatelského rozhraní; sladit součet kritérií s maximem zadání. Doplnit editaci textů zadání a termínu.
- [x] Doplnit správu příloh zadání z uživatelského rozhraní: upload, stahování a potvrzené jednotlivé/hromadné mazání.
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


## Pokračování 21. 10. 2026 — učitelská galerie odevzdání

- Detail zadání nově zobrazuje galerii všech odevzdání včetně prací bez hodnotitele, privátních obrázkových náhledů a odkazů na originály.
- Přidáno hledání podle jména/e-mailu, filtry stavu hodnocení a přítomnosti obrázku, řazení podle času či studenta a počet nepřiřazených prací.
- U každé práce jsou jednotliví hodnotitelé, jejich stav a dokončené bodové výsledky; společný průměr se nepočítá. Správce zadání může přiřadit další hodnocení.
- Rozsah celé galerie a správcovské akce jsou omezeny pomocí canManageTask; přizvaný hodnotitel včetně učitele vidí pouze vlastní přiřazená odevzdání a hodnocení.
- Filtry jsou zatím lokální v rámci jednoho zadání. Přehled napříč zadáními, serverové stránkování a prohlížečové ověření této galerie zbývají, proto širší bod plánu zůstává otevřený.


## Audit shody 21. 10. 2026

Podrobné porovnání implementace, zbývajících funkcí a návrhů rozšíření je v [AUDIT.md](AUDIT.md). Jde o statickou kontrolu, nikoli nové integrační ověření. Nejbližší pořadí: sjednotit oprávnění UI/API → editor kritérií a zadání → studentské výsledky a pravidla zveřejnění → vrácení/verze práce → širší galerie → video/3D → účty a příprava pilotu. Návrhy rozšíření nejsou automaticky schválený rozsah.

## Učitelský import — doplnění uživatele 21. 10. 2026

Projekt je remake systému v `.old`. Hromadné nahrávání učitelem za studenty je hlavní pracovní tok. Podrobné zadání je v DOKUMENTACE.md, sekce „Upřesnění 21. 10. 2026 — remake a učitelský import“.

- [ ] Projít původní import a organizaci ročníků v `.old`; odlišit studijní ročník od akademického roku.
- [x] Zpřístupnit import z detailu zadání a výběr odpovídající skupiny žáků.
- [ ] Doplnit správu externalId a jednoznačné párování názvů souborů.
- [x] Rozdělit import na výběr → návrh párování → ruční kontrolu/výběr žáka → potvrzení → upload a zápis DB.
- [x] Přidat náhledy, vyhledávání žáků, změnu autora, vyřazení souboru a souhrn dávky.
- [x] Před zápisem/uploadem validovat celou potvrzenou mapu na serveru včetně oprávnění a členství.
- [ ] Řešit více pohledů, duplicity, existující hodnocené práce a opakování selhaných položek bez duplicit.
- [ ] Ověřit UI/API včetně zrušení před potvrzením a neplatného přiřazení bez jakéhokoli zápisu či uploadu.

Hotovo, když učitel nahraje sadu prací bez účasti studentů, před uložením vidí a opraví autory a až po potvrzení vzniknou správná odevzdání. Tato etapa má přednost před video/3D rozšířením.

Upřesnění názvů a zdroje: primární tok je síťový disk → výběr souborů učitelem → kontrola párování → import k zadání. Příklad `4464341_02.jpg`: externalId `4464341`, suffix `_02` rozlišuje soubor. Nestandardní příponu označit k opravě. Studentský upload zůstává podporovanou alternativou s autorem podle přihlášeného účtu.


## Historie a WIP — rozšíření 21. 10. 2026

- [x] Přidat neměnné verze práce v rámci stejného zadání a studenta se stavy Rozpracováno/Finální, časem, autorem uploadu a popisem změn.
- [x] Umožnit WIP a nové verze v učitelském importu i studentském uploadu; zachovat staré přílohy.
- [x] Doplnit historii a přepínání verzí, označení WIP v galerii a návaznost hodnocení na konkrétní verzi.
- [ ] Upřesnit průběžnou konzultaci a případné bodování WIP; ověřit ochranu již hodnocené verze.


## Implementováno a ověřeno 21. 10. 2026 — import, historie a WIP

- Import nabízí místní obrázkové náhledy bez uploadu, přesný návrh podle školního ID před suffixem, ruční výběr autora ve třídě vybraného zadání, vyhledávání, vyřazení a explicitní potvrzení. Změna výběru nebo zadání ruší potvrzení.
- Server před uploadem ověří oprávnění a všechny autory; jedna DB transakce ukládá celou dávku a při selhání se nahrané soubory uklidí. Opakovaný úspěšný import vytváří novou verzi, nepozmění starou práci. Automatická detekce opakovaně importované stejné dávky a uživatelská správa externalId ještě zbývají.
- Každá verze má samostatné ID, pořadí v rámci zadání/studenta, WIP/FINAL, datum, ID autora uploadu a volitelný popis. Hodnocení a přílohy zůstávají u dané verze. Student i učitel mají přepínač historie. Galerie označuje WIP a verzi.
- Dočasné výchozí pravidlo: WIP je viditelný učiteli k prohlížení; nové bodové hodnocení lze přiřadit finální verzi. Samostatné konzultační komentáře zatím nejsou implementované.
- Přidán upload a HTML přehrávač MP4/WebM: pauza, posun v čase, opakování, zvuk podle souboru, chráněné inline načítání a byte-range odpovědi. Přehratelnost konkrétního kodeku závisí na prohlížeči; při chybě lze stáhnout originál. Převody, video náhledy, větší soubory a 3D zatím nejsou hotové.
- Limity: učitelská dávka 20 souborů / 100 MB celkem / 25 MB na soubor, studentská verze 5 souborů / 25 MB na soubor.
- Migrace 20261021130000_submission_versions zachovává původní odevzdání jako finální verzi 1 a mění unikátní klíč na zadání/student/verze. Na nové izolované PostgreSQL prošly všechny čtyři migrace, porovnání schématu bez rozdílů a demo seed. Do používané DB migrace aplikovaná nebyla.
- TypeScript (včetně buildu), ESLint, 35 unit/API testů a produkční build prošly. Prošlo všech 6 E2E včetně rozšířeného scénáře s reálným WebM, který ověřil učitelský import, ruční párování, WIP → finální → další studentský WIP, zachované body a historii v mobilním rozložení.
- Opraven rozdíl oprávnění mezi API detailu zadání a serverovou stránkou. Referenční .old je vyřazen z ESLintu a Docker kontextu.
- Testovací náhled: http://127.0.0.1:3104/cs/auth/login, kontejnery desigator-versions-postgres (54329) a desigator-versions-minio (19000), privátní bucket desigator-audit. Existující databáze a úložiště se neměnily.


Upřesnění 21. 10. 2026: MP4 nyní může mít až 100 MB v učitelském i studentském uploadu. Ostatní formáty včetně WebM zůstávají na 25 MB. Celkový limit učitelské dávky zůstává 100 MB. Uživatel potvrdil pravidlo: WIP pro průběžnou konzultaci, finální verze pro bodové hodnocení.


## Editor zadání a kritérií — 21. 10. 2026

- Detail zadání má učitelský editor názvu, popisu, pokynů, termínu, maxima a kritérií (název, popis, celé kladné body, přidání, odebrání, přesun nahoru/dolů). Termín se zadává v čase zařízení a ukládá jako UTC; prázdné pole jej odstraní.
- API validuje jedinečná jména/ID kritérií, vlastnictví ID, bodové limity a součet. Koncept lze vytvořit bez kritérií; publikace a přiřazení hodnocení vyžadují neprázdná kritéria s přesným součtem.
- Po prvním přiřazeném hodnocení se kritéria i změna maxima uzamknou. Texty a termín lze dál upravit. Editor a přiřazení hodnotitele používají společný zámek řádku zadání v transakci; uložená skóre a ID kritérií zůstávají zachovaná. Jiná škála vyžaduje kopii zadání.
- Při přiřazení dalšího hodnotitele se přepočítá stav verze na UNDER_REVIEW; původní dokončená hodnocení se nemění.
- Správa příloh zadání zůstává otevřená. Tento krok nevyžaduje novou DB migraci.

Ověření editoru: TypeScript, ESLint, všech 44 unit/API testů a produkční build prošly. Všech 7 E2E scénářů prošlo na izolované DB/MinIO včetně vytvoření zadání přes UI, pořadí kritérií, publikace, bodování a odmítnutí pozdější změny maxima. Náhled na portu 3104 běží s aktuálním buildem včetně MP4 limitu 100 MB.


## Jednotné administrační tabulky — 21. 10. 2026

- [x] Společný DataTable: řádek otevře editor/detail, klávesnice, koš vpravo, potvrzení, výběr stránky, hromadné mazání, zprávy o výsledku.
- [x] Zapojit studenty, předměty, zadání i zadání v detailu předmětu. Opravit nefunkční kliknutí na studenta pomocí editoru a doplnit správu externalId.
- [x] Doplnit potvrzené hromadné změny stavu zadání. Publikace všech vybraných zadání validuje jejich kritéria.
- [x] Serverové mazání a hromadné změny jsou atomické, kontrolují všechna ID a chrání navázané práce/hodnocení před kaskádovým odstraněním.
- [x] Omezit seznam a editaci studentů na učitelovy třídy; u hromadné operace odmítnout výběr obsahující cizí ID.

Přesné společné pravidlo pro další tabulky je zapsané v DOKUMENTACE.md. Tato etapa nevyžaduje novou DB migraci.

Ověření tabulek: lint, produkční build včetně TypeScriptu, všech 55 unit/API testů a všech 8 E2E scénářů prošly. Ověřeno zrušení potvrzení bez smazání, hromadná publikace/smazání, klávesové otevření editoru studenta a uložení školního ID. Opravena smyčka filtrů: změny se předávají při uživatelské akci, nikoli efektem při každém renderu. Náhled na portu 3104 běží s aktuálním buildem a izolovanými daty.


## Logické oddělení úkolu a práce studenta — 21. 10. 2026

- [x] Zadání představuje úkol pro třídu: třída, předmět, termín, popis, kritéria a organizační přehled.
- [x] Přehled odevzdání má jeden řádek na studenta, zahrnuje neodevzdané práce a nezaměňuje počet verzí s počtem studentů.
- [x] Přesunout prohlížení a historii na samostatný detail studentské práce s jednoznačným zadáním a autorem.
- [x] Studentský upload a výsledky zobrazit v Moje práce; koncepty hodnocení studentovi neposílat.
- [x] Zachovat omezení hodnotitele na přiřazené verze a odmítat přístup studenta k práci spolužáka.
- [x] Oddělit demo od automatických E2E dat. Preview 3104 používá desigator_preview / bucket desigator-preview; E2E 3105 používá desigator_audit / bucket desigator-audit. Původní DB je zachovaná.

Tato změna rozhraní nevyžaduje novou DB migraci. Demo znovu používá stejné výchozí přihlašovací účty; oddělená relace může vyžadovat nové přihlášení.

Ověření nového workflow: lint, produkční build včetně TypeScriptu a všech 57 unit/API testů prošly. Ověřeno všech 8 E2E scénářů (po opravě směrování studenta a odstranění kolize testu se souběžným přidáváním studentů). Nový scénář ověřuje jednoho studenta na řádek, neodevzdané práce, historii pouze daného studenta, zákaz cizí práce a zachování původních výsledků po novém WIP. Samostatná čtecí kontrola čistého preview ověřila seznam zadání s třídou, detail zadání bez smíšené historie a detail konkrétní studentské práce.


## Hodnotit práce přímo ze zadání — 21. 10. 2026

- [x] V sekci Studenti a odevzdání je tlačítko Hodnotit práce; učitel přechází přímo do první nedokončené práce s náhledem a pokračuje frontou daného zadání.
- [x] Endpoint review-start doplní chybějící vlastní přiřazení pouze posledním finálním verzím studentů; starší finální verzi pod novějším WIP nevybere. Existující body a dokončená hodnocení nepřepisuje. WIP se neboduje.
- [x] Do lokálního preview přidáno 8 ukázkových studentů, 2 designérská zadání s mock pracemi, 44 PNG souborů a 14 finálních prací přiřazených teacher@desigator.cz. Každá práce má WIP historii, poslední student zatím jen WIP. Seed je opakovatelný bez přepisování hodnocení a blokuje jiné než lokální preview DB/bucket.

Pro přímé vyzkoušení: zadání Digitální ilustrace – geometrická kompozice nebo Vizuální identita kulturní akce → Studenti a odevzdání → Hodnotit práce.

Ověření přímého hodnocení: všech 60 unit/API testů, 8 E2E scénářů, lint a produkční build prošly. V čistém preview ověřeno kliknutí na Hodnotit práce a skutečné načtení privátního obrázkového návrhu v hodnoticím pracovišti učitele, bez uložení bodů.


### 21. 10. 2026 — Osobní šablony zadání a ovládání obrázků

- Správa učitelových šablon je v Nastavení → Moje šablony zadání; sidebar se nerozšiřuje. Kliknutí na řádek otevře editor, popelnice a hromadné mazání vyžadují potvrzení.
- Šablona obsahuje název, popis, pokyny a uspořádaná kritéria s bodovým maximem. Součet kritérií musí odpovídat maximu. Šablony jsou osobní i pro administrátora.
- V Novém zadání lze vybrat šablonu. Vznikne samostatný koncept s novými kritérii; předmět/třída se vybírá zvlášť a termín se nepřenáší. Úprava či smazání šablony nemění vytvořená zadání.
- Samostatná tabulka assignment_templates, migrace 20261021190000_assignment_templates; API /api/task-templates vždy omezuje čtení i změny na vlastníka. Starý příznak Task.isTemplate se pro osobní šablony nepoužívá.
- Prohlížeč obrázků: kolečko zoomuje k pozici kurzoru (50–800 %), tažení prostředním tlačítkem posouvá obrázek, obnovení vrací 100 %. Nativní přehrávání videí zůstává funkční.
- Ověření: lint, produkční build, 60 unit/API testů a 9 E2E testů; E2E zahrnuje soukromí a nezávislost šablon, potvrzení smazání a skutečné pohyby myši pro zoom/pan. Migrace ověřena na oddělených lokálních databázích náhledu a testů.


### 21. 10. 2026 — Škola nebo instituce v profilu

- Učitel a administrátor mohou v Nastavení → Profil vyplnit nebo vymazat volitelný název školy či instituce (nejvýše 300 znaků).
- User.institution je pouze údaj o působišti, nikoli organizační hranice pro oprávnění. API /api/profile čte a mění pouze profil přihlášeného uživatele a nepřijímá ID ani další profilová pole.
- Migrace 20261021200000_user_institution ověřena na lokálním náhledu i testovací databázi. Ověření: lint, build, 60 unit/API testů a cílený E2E pro trvalé uložení, normalizaci, vymazání, validaci a odmítnutí studentského zápisu.


### 21. 10. 2026 — Jednotné řazení a výběr sloupců

- Všech šest tabulkových přehledů používá DataTable: studenti, předměty, zadání, zadání v předmětu, studenti a odevzdání v zadání, osobní šablony. Záhlaví přepíná vzestupně → sestupně → výchozí pořadí, změna řazení resetuje stránku a výběr řádků.
- Nabídka Sloupce umožňuje skrýt/zobrazit datové sloupce a obnovit všechny. Nejméně jeden datový sloupec zůstává viditelný; akce a hromadný výběr se neschovávají. Viditelnost se ukládá v tomto prohlížeči odděleně podle účtu a typu tabulky.
- Stránkované API přijímá pouze povolené klíče řazení. Skalární a jednotlivé relační hodnoty řadí databáze se stabilním ID jako druhým klíčem. Více tříd studenta a počet různých studentů, kteří odevzdali, se seřadí nad celým oprávněným výsledkem před stránkováním (u velmi velkých seznamů lze později přesunout tyto agregace do SQL).
- Kompletní lokální seznamy předává volající do DataTable bez předchozího stránkování; komponenta nejprve řadí a potom stránkuje. Čísla se porovnávají numericky, text česky s přirozeným pořadím čísel, prázdné lokální hodnoty jsou poslední.
- Ověřeno: lint, produkční build, 63 unit/API testů; původní E2E workflow i dva nové průchody řazením přes 22 položek, všemi serverovými klíči a směry a zapamatováním sloupců mezi obnoveními/účty. Cílené testy prošly po zpřesnění čekání na odhlášení v testu.


### 21. 10. 2026 — Import studentů CSV/XLSX a přílohy zadání

- Detail třídy → Importovat studenty z CSV / Excelu. Podporuje CSV (UTF-8/Windows-1250, automatický nebo ruční oddělovač) a XLSX s výběrem listu a řádku záhlaví. Vstup do 5 MB, max. 20 listů × 1000 řádků × 50 sloupců; dávka importu do 200 studentů. Starší XLS je nutné převést na XLSX/CSV.
- Učitel ručně přiřadí celé jméno nebo samostatné jméno/příjmení, povinný e-mail a volitelné školní ID. Náhled využívá DataTable; řádky lze vynechat. Kontrola ani načtení souboru neprovádějí databázové zápisy.
- Před zápisem je nutný platný náhled a výslovné potvrzení; server jej opět ověřuje proti aktuálním účtům a členství. Duplicity a konfliktní ID/e-mail blokují dávku. Existující aktivní studentské účty se přidávají do třídy, existující členové se přeskočí; chybějící školní ID lze doplnit, jméno, role ani heslo existujících účtů se nepřepisují.
- Nové účty mají náhodné individuální heslo z crypto.randomBytes, uložené pomocí bcrypt. Po úspěchu se vracejí pouze nová přihlašovací data s Cache-Control no-store; učitel je může jednorázově stáhnout do CSV a bezpečně předat. Všechny DB zápisy dávky jsou v jedné transakci. Není třeba měnit DB schéma.
- API: POST /api/classes/[id]/students/import-file načte soubor bez ukládání; POST /api/classes/[id]/students/import provede kontrolu nebo potvrzenou dávku. Obě API vyžadují správu konkrétní třídy.
- Přílohy zadání: učitel nahraje až 5 obrázků/PDF/ZIP/MP4/WebM najednou (MP4 100 MB, ostatní 25 MB, dávka 100 MB). Podklady jsou v detailu zadání a v sekci pokynů hodnoticího pracoviště. Autorizované stahování využívá privátní S3. Správa má sdílenou tabulku, řazení, sloupce a potvrzené hromadné mazání. Po selhání DB se uploady uklidí; cizí ID zablokuje celou dávku mazání.
- Ověření: 73 unit/API testů a všech 14 E2E scénářů, lint, typy i build. Reálný průchod CSV mapováním a vynecháním chyby, zrušení/potvrzení importu, zachování vedoucích nul ID, opakovaný import beze změn, přihlášení novým účtem, stažení přístupů a parsování dvoulistového XLSX. Přílohy ověřeny v privátním MinIO včetně zákazu studentského zápisu/čtení konceptu a atomického odmítnutí cizího ID.
- Rozšířené E2E sdílejí pro nové průchody jednou vytvořený testovací stav učitele v ignorovaném .next/e2e-auth; tím zbytečně nespotřebovávají limit přihlášení. Původní testy přihlášení zůstávají zachované.


### 21. 10. 2026 — Modernizovaný vzhled a tmavý režim

- Společné barevné tokeny: šedomodré neutrální plochy, tyrkysový akcent, tmavá paleta s odlišeným pozadím/kartami a odpovídajícími stavovými štítky. Sjednoceny tabulky, typografie, navigace, profilová část a kontextové záhlaví; obsah médií nemá barevný filtr.
- Globální next-themes provider, světlý/tmavý/systémový režim. Volba se ukládá v prohlížeči pod desigator-theme; systémová volba reaguje na změnu preferencí zařízení. Přepínač Vzhled je ve spodní části navigace a plný výběr v Nastavení. Další položka sidebaru se nepřidává.
- Zachována kompaktní varianta hodnoticího pracoviště; desktopová navigace je sticky, mobilní má popisek otevíracího tlačítka. Aktivní položka navigace používá přesný prefix trasy a aria-current. Omezené animace respektují prefers-reduced-motion.
- Ověřeno: TypeScript, lint, produkční build a všech 15 E2E scénářů. Nový test pokrývá přepnutí režimů, obnovení stránky, reakci na změnu systému, explicitní přepsání systémové volby a mobilní navigaci. Vizuálně zkontrolovány snímky předmětů ve světlém/tmavém režimu i mobilu. Souběžnost E2E je omezena na 4 lokálně a 2 v CI kvůli náročnosti současných bcrypt přihlášení.


### 21. 10. 2026 — Grafitová a oranžová paleta

Na přání uživatele nahrazena původní tyrkysová primární paleta neutrální grafitovou/šedou s oranžovým akcentem. Světlý režim používá tmavší pálenou oranžovou s bílým textem, tmavý teplou světlejší oranžovou s tmavým textem. Jemné gradienty jsou v logu, hlavních akcích, aktivní navigaci a decentním pozadí. Sémantické barvy stavů se zachovávají. Ověřeno lintem, buildem včetně typů a cíleným E2E světlého/tmavého/systémového režimu i mobilu; snímky obou režimů vizuálně zkontrolovány.


### 21. 10. 2026 — Přepínač vzhledu v záhlaví

Na přání uživatele odstraněn přepínač Vzhled ze spodní části sidebaru. Vpravo nahoře je pouze ikona měsíce/slunce; kliknutí přímo střídá světlý a tmavý režim. Systémová volba zůstává v Nastavení. Ověřeno lintem, buildem a cíleným E2E pro desktop i mobil.


## Školy jako platforma — 21. 10. 2026

- [x] Organizace a jedna domovská škola na účet; hodnocení napříč školami přes přiřazení konkrétní práce.
- [x] Kombinovatelná oprávnění správce školy, učitel a hodnotitel; oddělení od globálního správce platformy.
- [x] Založení školy v Nastavení, pozvánky s jednorázovým odkazem a správa oprávnění členů.
- [x] Serverové omezení tříd, předmětů, zadání, studentů a příloh na oprávněný rozsah; ochrana školního ID v rámci organizace.
- [x] Migrace existujících dat ověřena na izolované kopii náhledu: zachováno 14 uživatelů, 1 třída a 15 hodnocení.
- [ ] Aplikovat migraci na původní lokální náhled po schválení: automatické schválení ji odmítlo kvůli změně existujících uložených dat. Původní databáze zůstává beze změn.
- [ ] Navázat statistikami a opraveným převodem historických hodnocení v kontextu organizace.

Ověření organizační etapy: 81 unit/API testů, produkční build a lint prošly. Samostatný E2E scénář dvou škol prošel včetně založení přes UI, pozvánek, změn oprávnění bez nového přihlášení, izolace dat, shodného školního ID v různých školách, externího hodnocení a jeho odebrání. Na migrované kopii původního náhledu prošlo dalších 15 E2E scénářů (importy, soubory, historie verzí, hodnocení, tabulky, šablony, profil a vzhled). Porovnání migrovaného schématu s Prisma modelem: bez rozdílů. Náhled na http://127.0.0.1:3104 používá desigator_organizations_preview_test, původní desigator_preview zůstává beze změn. Původní testovací proces na portu 3105 byl během obnovy klienta ukončen; pro tuto etapu jej nahradil oddělený test na portu 3110.


### 21. 10. 2026 — Strukturované Nastavení a registr organizací

- Nastavení rozděleno do samostatných záložek s přímými odkazy ?section=organizations|school|templates|profile|appearance. Administrátor začíná registry organizací, ostatní profilem. Záložka organizací je dostupná pouze správci platformy; sidebar se nerozšiřuje.
- Přehled organizací ukazuje název, počty členů/tříd a datum založení; souhrnné karty zobrazují velikost platformy. DataTable poskytuje hledání, stránkování, řazení a volbu sloupců. Kliknutí otevře dialog úpravy názvu. API GET/PATCH /api/admin/organizations kontroluje platformovou roli ADMIN; změna názvu nezasahuje členství ani oprávnění.
- Moje škola a členové odděluje školní správu od registru platformy. Členové jsou ve společné tabulce; oprávnění se upravují v dialogu, pozvánka se otevře tlačítkem Pozvat člena, přejmenování školy samostatným dialogem. Dosavadní ochrana cizí školy a posledního správce zůstává v původních API.
- Osobní profil, šablony a vzhled mají vlastní obsahové panely. Přijetí školní pozvánky vede přímo do školní záložky. Původní testy upraveny na přímé odkazy podle nového členění.
- Ověřeno: 86 unit/API testů, typy, lint a produkční build. E2E pro administrátorský přehled, přejmenování organizace, zamítnutí přístupu učiteli, dialogy členů/pozvánek, zachování vybrané záložky po reloadu a mobilní zobrazení prošel. Souhrnná sada 17 scénářů prošla v 15 případech; dva regresní scénáře následně prošly cíleně po zpřesnění výběru konkrétního přihlášeného hodnotitele a obnovení testovací relace. Školní izolační E2E včetně kombinovaných rolí a pozvánek prošel. Vizuálně zkontrolován desktop i mobil.
- Pro lokální ověření byla aplikována již existující migrace 20261021210000_organizations na oddělené preview/audit DB; samotné členění Nastavení nepřidává další schéma ani migraci.


### Oprava pohledu správce platformy — 21. 10. 2026

Čistý administrátor vidí všechny organizace bez automatického školního členství. Ze seznamu může spravovat členy vybrané školy; API chrání cílovou organizaci. Kombinovaný administrátor se školními rolemi má navíc Působení ve škole a osobní šablony. Migrace 20261021220000_platform_admin_membership aplikována jen na oddělenou testovací kopii. Ověření: 93 unit/API testů, typy, lint a produkční build; tři cílené E2E scénáře pro čistého administrátora, kombinovaná oprávnění a hodnocení napříč školami prošly. Náhled obnoven na portu 3104 nad desigator_organizations_preview_test.


## Import historie a statistiky — 21. 10. 2026

- [x] Atomický import SQL exportu do odděleného historického archivu bez vytváření účtů, starých hesel nebo fiktivních odevzdání.
- [x] Importováno 10 328 hodnocení, 140 zadání a 49 předmětů do desigator_organizations_preview_test. Opakované spuštění nevytváří duplicity; jiný obsah téhož pojmenovaného zdroje je odmítnut.
- [x] Zachována chybějící ID a vazby; audit odhalil 305 hodnocení s nedohledaným studentem, 3 předměty bez roku a 16 zadání bez dohledaného předmětu.
- [x] Statistiky s filtry školy, roku, předmětu a zdroje. Rozložení procentních výsledků, srovnání předmětů, období a hodnotitelů. Průměr počítá jednotlivá hodnocení vůči jejich maximům.
- [x] Učitel vlastní předměty; správce školy vlastní školu; správce platformy vše. Archivní předměty přiděluje oprávněný správce učiteli stejné školy.
- [x] Ověřena poslední finální verze, odlišení WIP a nedokončených hodnocení, nulové skóre a neplatné škály.
- [x] Prošlo 107 unit/API testů, lint, typy a produkční build. Dva E2E scénáře ověřily celou statistickou stránku, filtry, desktop/mobil, skutečné přiřazení archivního předmětu přes UI, zachování hledání při změně učitele, omezení přístupů a historii verzí. Migrované schéma odpovídá Prisma modelu bez rozdílů.

Historický přehled: 2 539 prací, 33 hodnotitelů, průměrné procentní skóre 71,8 %. Pro ukázku v náhledu byl jeden archivní předmět explicitně přiřazen demonstračnímu účtu teacher@desigator.cz; přiřazení není odvozené ze zdrojových dat. Původní databáze se nezměnila. Náhled: http://127.0.0.1:3104/cs/statistics.


### Hledání ve statistikách — 21. 10. 2026

Výběry školy, předmětu a učitele nahrazeny serverovým hledáním s nejvýše 20 výsledky, zpožděním dotazu a rušením předchozího hledání. Předměty lze hledat kombinací názvu/kódu a roku; metadata statistik už neposílají kompletní seznamy výběrů. Krátké výběry zdroje a roku zůstávají. Ověření: 112 unit/API testů, lint, typy a build; dva prohlížečové scénáře zahrnují hledání školy, nenalezený předmět, výběr předmětu klávesnicí, vymazání filtru a přiřazení učitele vyhledáváním. Náhled obnoven na portu 3104, původní databáze nezměněna.


## Hesla a opakování importů — 21. 10. 2026

- [x] Staré studentské API: validace celé dávky, normalizace a deduplikace adres, kryptografická hesla, atomická tvorba a no-store přihlašovacích údajů. Konflikt při souběžné tvorbě vrací 409 bez částečných údajů.
- [x] Import prací: obsahový otisk dávky, uložený výsledek v téže transakci, kontrola po zámku zadání, úklid souběžně nahraných kopií; UI vysvětluje opakování bez nové verze.
- [x] Změna hesla se současným heslem a obnova přes jednorázový 30minutový token. Verze relace zneplatní stará JWT, změna/obnova odstraní všechny resetovací tokeny.
- [x] Resend serverové API, český/anglický e-mail a formuláře, explicitní konfigurace APP_URL/RESEND_FROM/RESEND_API_KEY, kontroly původu vůči veřejné URL a limity pokusů.
- [x] Nová aditivní migrace prošla od čisté DB desigator_passwords_check; všech 10 migrací a porovnání schématu bez rozdílu. Privátní testovací bucket desigator-passwords-check. Původní preview a databáze zůstaly zachované.
- [ ] V produkčním prostředí vložit RESEND_API_KEY, ověřit desigator.cz v Resendu a otestovat doručení. Výchozí odesílatel Desigator <noreply@desigator.cz>, veřejná URL https://desigator.cz.

Technické a provozní podrobnosti v README. Nová evidence dávek se vztahuje na importy provedené po nasazení této etapy, bez zpětného hashování historických souborů.

Ověření etapy: 153 unit/API testů, lint, TypeScript a produkční build v odděleném výstupu prošly. Šest E2E scénářů prošlo: hesla a relace na dvou zařízeních, souběžné/opakované importy, historie WIP/finální práce, studentské tabulky, CSV import a profil. Formuláře vizuálně zkontrolované na desktopu a mobilu. Nové E2E jsou zapnuté i v CI, jeho vzdálený běh zde nebyl spuštěn. Resend požadavek je ověřený jednotkově bez skutečného odeslání e-mailu.

Lokální náhled na http://127.0.0.1:3104 byl po obnově buildových souborů přepnut na novou kopii desigator_passwords_preview_test a nový privátní bucket desigator-passwords-preview. Zdrojová desigator_organizations_preview_test i původní bucket zůstaly beze změn; kopie zachovává 455 uživatelů a 51 příloh. Ověřeno skutečné přihlášení, formulář změny hesla, čtení původního obrázku a API statistik. Runtime je v ignorovaném local-passwords-preview mimo .next, takže jej další build nemaže. Testovací server 3112 byl ukončen.


## Samostatné zveřejňování výsledků — 22. 10. 2026

- [x] Výslovné zveřejnění konkrétní finální verze po dokončení všech přiřazených hodnocení; potvrzení akce v UI, datum a aktér zveřejnění.
- [x] Stažení výsledků ze zveřejnění s potvrzením, zachováním bodů a možností opravy a opětovného zveřejnění.
- [x] Nezveřejněné výsledky se studentovi nevracejí na stránce práce, v detailu zadání, v seznamu ani detailu hodnocení API. Odpovědi s výsledky mají no-store hlavičky.
- [x] Zveřejněné hodnocení je chráněné i proti přímému zápisu a přiřazení hodnotitele přes API. Automatické zahájení hodnocení zveřejněné práce přeskočí. Při přepínání studentů se editor přizpůsobí stavu aktuální práce.
- [x] Zápis bodů a zveřejnění používají společný zámek odevzdání; souběh v E2E prokazuje, že nelze současně zveřejnit výsledek a změnit jej na koncept.
- [x] Migrace se všemi 11 kroky prošly na nové DB desigator_publication_test. Upgrade ověřen na samostatné kopii desigator_publication_upgrade_test: zachováno 455 účtů a 22 hodnocení, žádné automaticky zveřejněné výsledky, schéma bez rozdílů. Zdrojové DB nebyly změněny.
- [x] 178 unit/API testů a pět E2E scénářů včetně média a hlavního workflow prošlo; produkční build prošel v .next/publication-check. Nový scénář je zapojený do CI. Vizuálně ověřen desktop učitele a studentský mobil.

Migrace ponechá i dříve dokončené výsledky neveřejné, dokud je učitel výslovně nezveřejní. Automatický převod starší viditelnosti byl vyřazen po odmítnutí automatickou kontrolou. Výpočet společného výsledku více hodnotitelů a konzultační WIP komentáře zůstávají samostatné otevřené kroky. Resend stále vyžaduje doplnění API klíče a ověření odesílací domény.

Závěrečné ověření 22. 10. 2026: lint a TypeScript prošly. Náhled na 3104 používá novou kopii desigator_publication_upgrade_test a nový privátní bucket desigator-publication-preview; runtime je v ignorovaném local-publication-preview. Čtecím průchodem ověřeno přihlášení, ovládání zveřejnění finální verze, původní obrázek, nastavení hesla a API statistik. Původní zdrojové DB a buckety zůstaly beze změn. Dočasný testovací server na 3113 byl ukončen.


### 22. 10. 2026 – veřejné výsledky a školní známkování

- [x] Veřejný přehled results bez přihlášení: třída, předmět/rok, pouze školní ID, průměry bodů, součet a výsledná známka.
- [x] Náhledy obrázků u bodů; soukromé soubory a nezveřejněné verze se veřejně neposkytují.
- [x] Výslovné zapnutí a vypnutí veřejného sdílení v detailu třídy, sdílecí odkaz a upozornění na chybějící ID.
- [x] Stupnice per škola v administraci: ECTS A–F nebo 1–5, vlastní sestupné procentní hranice, oprávnění školního/platformového správce.

- [x] Sdílení výsledků pouze náhodným odvolatelným odkazem, bez veřejného seznamu; výměna klíče ruší starou stránku i obrázky.

- [x] Učitelský a vlastní studentský přehled po předmětech, dvě desetinná místa a vzdálenosti od hranic známek.
- [x] Bodové korekce se zdůvodněním, historií, stornem, ochranou před duplicitou a volbou viditelnosti přihlášenému studentovi.


## Závěrečné ověření — 25. 10. 2026

- 273 unit/API testů (40 souborů), TypeScript a lint prošly. Produkční build prošel s Next.js 16.4.3.
- 23 prohlížečových scénářů prošlo v souhrnném běhu; 4 specializované scénáře organizací / historických statistik nebyly pro tuto novou DB zapnuté. Cíleně následně prošel posílený test konzultací a médií v plném Chromiu včetně ověření barevných pixelů skutečně vykresleného PDF. Headless-shell PDF prohlížeč neobsahuje, proto se pro tento test používá channel chromium.
- E2E ověřuje vloženou GLB animaci, kameru, časovou osu z klávesnice, zprávy studenta/učitele, vykreslení textu jako textu, izolaci cizího studenta, privátní PDF a zachování konzultace u původní verze. Další nový scénář ověřuje nástěnku v CS/EN, studentovi skryté koncepty, funkční odkazy a mobilní zobrazení.
- Všech 16 migrací prošlo na prázdné DB; shoda schématu bez rozdílů. Upgrade kopie dosavadního náhledu také prošel bez rozdílů.
- Aktualizovaný náhled: http://127.0.0.1:3104/cs/dashboard, samostatný runtime local-completion-preview, DB desigator_completion_preview a privátní bucket desigator-completion-preview. Čtecím průchodem ověřeno přihlášení, nástěnka, profil, health a statistiky, bez page errors.
- Zdrojová desigator_public_results_preview i původní bucket zůstaly zachované. Porovnání před/po: 462 uživatelů, 43 hodnocení, 57 příloh, 10 328 archivních hodnocení v obou databázích.
- Audit všech závislostí: 0 critical, 4 high a 1 low. Produkční audit: 0 critical a 3 high z jedné závislostní větve prisma → @prisma/config → deepmerge-ts. Vývojová větev má navíc js-yaml a esbuild. Kompatibilní audit fix tyto zbývající položky neodstranil; major upgrade / override nebyl naslepo proveden. Opravené minimální verze Next.js, NextAuth, next-intl, Zod a UUID jsou zvýšené i v package.json.
- Původní historické checkboxy pod aktuálním souhrnem se nepovažují za seznam chyb současné aplikace. Produkční Resend, bezpečný převod úplně nejstarší DB, obnova ze zálohy a zbývající celoplošné překlady stále vyžadují samostatnou práci před plným produkčním nasazením.


### 25. 10. 2026 — uživatelské menu a priorita hodnocení

Profil a odhlášení jsou v uživatelském dropdownu vpravo nahoře, spolu s volbou světlého/tmavého/systémového režimu. Na desktopu je jméno a role, na mobilu avatar; menu je dostupné z klávesnice a lokalizované CS/EN. Původní profilový blok v sidebaru je odstraněný.

Hodnotit práce je hlavní akce v záhlaví zadání pro učitele i přiřazeného hodnotitele. Hromadný upload je obrysová akce v sekci Studenti a odevzdání. Publikováno má samostatnou jemnou zelenou; výchozí badge jsou neutrální. Nahrání referenčních příloh je také vedlejší obrysová akce. Oranžovou řídí --primary v :root a .dark v src/app/globals.css; gradienty, navigace, jemné akcenty a focus ring se od ní odvozují. Stavová zelená má vlastní --status-success a --status-success-foreground.

Ověřeno pěti E2E scénáři: uživatelské menu, profil/odhlášení, učitel i hodnotitel, import a editor zadání; produkční build, typy a lint prošly. Pro standalone balík jsou výslovně přibalené i nativní knihovny Sharp.


### 25. 10. 2026 — přímé hodnocení z nástěnky

Nedávná odevzdání mají akci Ohodnotit pro vlastní přiřazené PENDING/IN_PROGRESS hodnocení finální nezveřejněné verze. Odkaz vede přímo na konkrétní hodnoticí pracoviště. Dokončená hodnocení, cizí přiřazení a studentský pohled akci nenabízejí. Zachovaný je samostatný odkaz na historii práce. CS/EN a mobil; dva E2E scénáře nástěnky a produkční build s typy prošly.

## Příprava vydání — 25. 10. 2026

Tento souhrn nahrazuje starší počty testů a auditní nálezy výše.

- Prošlo všech 285 unit/API testů ve 42 souborech a všech 29 E2E scénářů bez přeskočení. Do souhrnného běhu jsou zahrnuté organizace, platformové role i historické statistiky se syntetickou sadou 10 328 hodnocení.
- TypeScript, lint, produkční Next.js build a Docker build prošly. Audit všech i produkčních závislostí hlásí 0 zranitelností. Opravené transitive závislosti jsou uzamčené v package-lock.json; Prisma generate a migrace s nimi prošly.
- Produkční kontejner běží jako node (UID 1000), neobsahuje lokální .env ani privátní exporty a má funkční healthcheck. Docker kontext vylučuje lokální runtime, databázové zálohy i klíče.
- Na prázdné DB prošlo všech 16 migrací. Na odděleně obnovené kopii zůstalo 462 uživatelů, 43 hodnocení, 57 příloh a 10 328 archivních hodnocení. Kopie 57 S3 objektů souhlasí klíčem, velikostí a ETag. Přihlášení, profil, statistiky a privátní obrázek z obnoveného bucketu prošly přes produkční kontejner bez chyb stránky.
- Start kontroluje produkční URL, klíče a e-mailovou konfiguraci. Ochrana migrací odmítá staré tasks bez subjectId i tabulky vlastněné jiným DB účtem; negativní test zachoval původní testovací řádek beze změny. Nejstarší historická DB potřebuje řízený převod a není cílem automatického upgradu.
- CI používá produkční standalone server, všech 29 scénářů a bezpečnostní audit. Vzdálený běh GitHub Actions bude ověřen po pushi.
- Postup pro Docker/Coolify, produkční proměnné, zálohu, obnovu a rollback je v DEPLOYMENT.md. Skutečné nasazení vyžaduje serverové DB/S3 přístupy, HTTPS doménu a ověřeného Resend odesílatele; lokální test neověřuje doručení produkčního e-mailu. Zbývající celoplošné překlady mimo již lokalizované části jsou samostatné rozšíření anglické verze, nikoli ověřené dokončení celé EN aplikace.
