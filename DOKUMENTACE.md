# Desigator – produktová definice

Upřesněno 20. 10. 2026 podle zadání uživatele. Tento dokument popisuje cílový produkt; stav realizace a pořadí prací eviduje PLAN.md.

## Účel a hlavní uživatelé

**Souhrn projektu:** Desigator je systém pro hodnocení studentských designérských prací. Učitel organizuje předměty a zadání, určuje hodnoticí kritéria a přiděluje práce hodnotitelům. Student odevzdává obrázky, grafické návrhy, animace, modely a související soubory. Hodnotitel má pracovní prostředí, ve kterém si přiřazené dílo pohodlně prohlédne, posoudí jeho kvalitu a zapíše body a slovní zpětnou vazbu. Učitel sleduje průběh a výsledky hodnocení; student získává výsledky a zpětnou vazbu ke své práci.

**Primárním uživatelem prohlížeče prací je hodnotitel.** Galerie, náhledy, přehrávač animací a prohlížeč modelů mají především umožnit kvalitní a efektivní hodnocení. Návrh rozhraní proto vychází z hodnotitelského pracoviště: dílo, zadání, kritéria a formulář hodnocení jsou dostupné společně. Prezentační nebo veřejná galerie není hlavním cílem projektu.

Desigator slouží k prohlížení a hodnocení studentských prací především z oborů designu a vizuální tvorby. Hodnoceným dílem může být obrázek, ilustrace, grafický návrh, série obrazů, animace, video, 3D model nebo související prezentace a zdrojové soubory.

Základní jednotkou hodnocení je konkrétní práce studenta odevzdaná k zadání. Práce může obsahovat více souborů, například finální obrázek, detaily a zdrojový projekt nebo model, textury a ukázku animace. Aplikace musí umožnit dílo pohodlně prohlédnout a spojit s ním hodnocení a zpětnou vazbu.

Hlavní tok: **zadání → galerie studentských prací → detail a prohlížení díla → hodnocení hodnotitelů → výsledky a zpětná vazba**.

## Předměty a zadání

Předměty organizují výuku a zadání podle designérské disciplíny. Příklady:

- Počítačová grafika – rastrová a vektorová tvorba, digitální ilustrace, kompozice.
- Grafický design / Design – vizuální identita, plakát, typografie, sazba a návrhové koncepty.
- Animace / Motion design – krátké animace, pohyblivá grafika a audiovizuální výstupy.
- 3D modelování – modely, materiály, textury, vizualizace a animované modely.
- Fotografie nebo další ateliérové předměty podle skutečné výuky.

Příklady zadání: návrh vizuální identity značky, série ilustrací, animovaný plakát nebo vytvoření a prezentace 3D modelu. Zadání obsahuje popis, požadované výstupy, termín, přílohy a hodnoticí kritéria. Kritéria odpovídají dílu: splnění zadání, vizuální zpracování, kompozice, práce s typografií, originalita nebo technické provedení. Konkrétní kritéria a bodové váhy určuje učitel.

## Galerie studentských prací

Galerie slouží zejména jako pracovní přehled přiřazených děl pro hodnotitele. Z tohoto přehledu otevírá práce k hodnocení, navazuje na rozpracované hodnocení a přechází k dalšímu dílu. Každá položka ukazuje náhled práce, autora, typ média a stav odevzdání a hodnocení. Učitel může práce filtrovat podle předmětu, zadání, třídy, studenta, hodnotitele a stavu hodnocení. Hodnotitel potřebuje přehled přidělených prací a rozlišení neohodnocených, rozpracovaných a dokončených hodnocení.

Přechod mezi pracemi stejného zadání má být rychlý a má zachovat kontext prohlížení a hodnocení. Náhled zastupuje dílo, jeho originál zůstává dostupný v detailu podle oprávnění.

Přístup ke galerii respektuje role. Učitel má přehled prací ve svém oprávněném rozsahu, hodnotitel pouze přidělené práce. Student má přístup ke svým pracím a výsledkům. Zobrazení prací spolužákům nebo veřejnosti není automatickým důsledkem existence galerie; případné sdílení vyžaduje samostatně definované pravidlo.

## Prohlížení díla

Detail práce spojuje samotné dílo, zadání, autora a hodnocení. Prohlížená práce má být dominantní částí obrazovky. Hodnotitel musí mít během prohlížení dostupná kritéria a možnost zapisovat hodnocení.

| Typ práce | Požadované prohlížení |
|-----------|-----------------------|
| Obrázky a grafické návrhy | Velký náhled, zoom, zobrazení na celé obrazovce a přepínání souborů či stránek jednoho díla. |
| Animace a video | Přehrávání přímo v aplikaci, pauza, posun v čase, opakování a zvuk, pokud je součástí díla. |
| 3D modely | Interaktivní otáčení, přiblížení a prohlížení modelu; u podporovaných animovaných modelů také přehrávání animace. |
| Prezentace, zdrojové soubory a další podklady | Náhled, kde je podporovaný; vždy jasný seznam souborů a autorizované stažení originálu. |

Zdrojový soubor a náhled pro web mohou být odlišné soubory. Například editovatelný projekt může vyžadovat odevzdání obrázku, videa nebo modelu v podporovaném náhledovém formátu. Přesný seznam formátů, velikostní limity, generování náhledů a případné převody jsou implementační rozhodnutí, která je potřeba stanovit pro jednotlivé typy médií.

Rozhraní rozlišuje nahrávání, zpracování náhledu, připravený náhled, nepodporovaný formát a chybu. Nepodporovaný náhled nesmí působit jako chybějící práce. Originály i náhledy mají stejnou ochranu přístupu; privátní MinIO bucket zůstává privátní.

## Hodnocení hodnotitelů

Hodnotitel si otevře přiřazenou práci, prohlédne její soubory a vyplní body a komentáře podle kritérií zadání. Hodnocení zahrnuje celkové body, slovní zpětnou vazbu, autora hodnocení, stav a čas dokončení. Rozpracované hodnocení lze uložit a později dokončit.

Jednu práci může hodnotit více přiřazených hodnotitelů. Každé hodnocení zůstává samostatné a musí být dohledatelné, kdo je vytvořil. Přehled práce zobrazuje stav hodnocení a jednotlivé výsledky. Pravidlo případného souhrnného výsledku, například průměr nebo učitelem potvrzená známka, je potřeba samostatně určit; samotná existence více hodnocení automaticky neznamená průměrování.

Učitel potřebuje přehled odevzdaných prací, přiřazení hodnotitelů, dokončenosti hodnocení a výsledků v rámci zadání, předmětu a studenta. Student u vlastní práce vidí zveřejněné výsledky a slovní zpětnou vazbu. Zveřejnění výsledků a viditelnost identity hodnotitele pro studenta musí mít jasné pravidlo; koncept hodnocení se nesmí omylem prezentovat jako konečný výsledek.

## Role

| Role | Hlavní odpovědnost |
|------|-------------------|
| Administrátor | Správa aplikace, účtů a přístupů. |
| Učitel | Organizace předmětů, tříd a zadání; kritéria, prohlížení studentských prací, přiřazování hodnotitelů a přehled výsledků. |
| Hodnotitel | Prohlížení přiřazených děl a tvorba vlastního bodového a slovního hodnocení. |
| Student | Přístup k zadáním, odevzdání a prohlížení vlastních prací, výsledků a zpětné vazby. |

## Současná implementace a chybějící části

Implementovaný základ zahrnuje přihlášení, role, třídy, předměty, zadání, odevzdání, přiřazování hodnotitelů, kritéria a bodová hodnocení. Data již umožňují více souborů u práce a více hodnocení různých hodnotitelů. Existuje privátní přístup k přílohám přes aplikační API a S3 kompatibilní úložiště.

Je implementovaný pracovní přehled přiřazených hodnocení s obrazovými náhledy, vyhledáváním a filtrem stavu. Detail spojuje prohlížeč obrázků, přepínání více souborů, zoom, celou obrazovku, pokyny zadání a formulář hodnocení. Hodnotitel ukládá koncept nebo dokončené hodnocení; neuložené změny jsou označené a odchod je chráněný potvrzením. Duplicitní a neúplná kritéria ani překročení bodových limitů nelze dokončit. Při více hodnotitelích zůstává práce rozpracovaná, dokud nejsou dokončená všechna přiřazená hodnocení. Student získává z API pouze dokončené výsledky.

Prohlížeč podporuje JPEG, PNG, WebP a GIF. Náhledy galerie vznikají na vyžádání jako zmenšené WebP, originál zůstává zachovaný. Originál i náhled jsou dostupné přes stejné autorizované API s privátními cache hlavičkami; MinIO bucket není veřejný. PDF, ZIP a další nepodporované formáty mají možnost stažení, video přehrávač ani 3D prohlížeč zatím nejsou implementované. Persistované náhledy a zpracování na pozadí zůstávají dalším rozšířením.

Demo seed nyní vytváří Počítačovou grafiku, Grafický design a 3D modelování a animaci s odpovídajícími zadáními a kritérii. Již existující data seed nemaže. E2E test se skutečnými PNG ověřuje upload do odděleného privátního MinIO, náhledy, zoom, přepínání souborů, celou obrazovku, mobilní rozložení, koncept i dokončení hodnocení. Ověřuje také zamítnutí přímého anonymního přístupu, cizího studenta a nepřiřazeného hodnotitele. Animace/video, 3D modely a dokončení studentského rozhraní výsledků zůstávají v plánu.

## Kritéria produktového dokončení

1. Učitel vytvoří designérské zadání v odpovídajícím předmětu a nastaví kritéria.
2. Student odevzdá dílo s požadovanými soubory; práce je přiřazená správnému autorovi i při hromadném nahrání učitelem.
3. Oprávněný uživatel najde práci v galerii a přímo si ji prohlédne v podporovaném formátu.
4. Přiřazený hodnotitel dílo zhodnotí podle kritérií a uloží rozpracovaný či dokončený výsledek.
5. Učitel má přehled jednotlivých hodnocení a student u vlastní práce vidí zveřejněný výsledek a zpětnou vazbu.
6. Celý tok je ověřen se skutečným obrázkem, následně s podporovanou animací a 3D modelem, včetně ochrany přístupu k originálům a náhledům.


## Hodnoticí workflow – upřesnění 20. 10. 2026

Hodnotitel začíná přehledem předmětů. Po výběru předmětu vidí úkoly s postupem hodnocení, po výběru úkolu mřížku všech přiřazených studentských prací. Jednotlivé práce se v úvodním přehledu napříč úkoly nemíchají.

Detail upřednostňuje velký náhled a posuvníky kritérií přímo pod obrázkem. Více pohledů práce je dostupných v pásu náhledů. Studenti se přepínají tlačítky nebo klávesami ← → v rámci stejného úkolu a hodnotitele. Sousední práce se přednačítají. Komentáře a zadání jsou ve sbalených volitelných sekcích.

Změny bodů se automaticky ukládají jako koncept. Při přechodu na dalšího studenta se hodnocení s explicitně vyplněnými všemi kritérii dokončí; neúplné zůstane rozpracované. Výchozí poloha posuvníku na nule se nepovažuje za přidělenou známku. Chyba ukládání zastaví přechod a ponechá změny ve formuláři.

## Upřesnění 21. 10. 2026 — remake a učitelský import

Desigator je remake starého systému, jehož zdroje jsou v adresáři `.old` v kořeni projektu. Původní systém slouží jako reference pracovních postupů, ročníků, importu, galerie a hodnocení. Před nahrazováním těchto toků je potřeba prohlédnout původní implementaci; její technické a bezpečnostní nedostatky se automaticky nepřebírají.

**Hromadné nahrání učitelem za studenty je běžný hlavní tok.** Využití systému nesmí vyžadovat samostatné odevzdávání studenty.

Požadovaný postup:

1. Učitel vybere předmět, zadání a odpovídající ročník/třídu. Studijní ročník se nesmí zaměnit za akademický či kalendářní rok; samotné Subject.year jej nenahrazuje.
2. Vybere více souborů. Název bez přípony představuje školní ID (externalId), například S001.jpg. Pro více pohledů lze definovat jednoznačnou příponu, například S001_detail.jpg. Nepoužívat podobnost nebo částečnou shodu ID; neplést externalId s interním ID či legacyId.
3. Před zápisem do DB se zobrazí kontrolní tabulka: soubor, náhled podporovaného média, rozpoznané ID, navržený žák, třída/ročník a stav párování. Samotný výběr a návrh nevytvářejí odevzdání ani přílohy.
4. U každého souboru lze kliknutím vybrat či změnit žáka z vyhledávatelného seznamu příslušného ročníku/třídy nebo soubor vyřadit. Neznámé a nejednoznačné ID vyžaduje ruční přiřazení či vyřazení, nikoli tiché přeskočení.
5. Více různých souborů jednoho žáka tvoří jednu práci. Opakovaný stejný soubor a již existující odevzdání se viditelně označí. Import nesmí tiše změnit ohodnocenou práci; pravidlo musí navazovat na verze odevzdání.
6. Učitel zkontroluje souhrn počtu souborů, žáků a vyřazených položek. Až po vyřešení všech zbývajících přiřazení stiskne „Potvrdit párování a nahrát“. Změna zadání/skupiny zneplatní předchozí párování a potvrzení.
7. Server při potvrzení znovu ověří celou mapu soubor → žák, oprávnění k zadání, členství ve třídě a souborové limity, a to před prvním zápisem odevzdání/příloh a před uploadem do úložiště. Nestačí důvěřovat kontrole v prohlížeči.
8. Import zobrazí výsledek každé položky a umožní opakování selhaných položek bez duplikování úspěšných. Zrušení před potvrzením neprovádí trvalý zápis ani upload.

Součástí je správa školního externalId a dostupný vstup do importu z detailu zadání. Testy musí pokrýt automatické i ruční přiřazení, neznámé/nejednoznačné ID, více pohledů, cizího žáka, změnu skupiny, zrušení před potvrzením a selhání uploadu. U nevalidní/nepotvrzené dávky ověřit, že nedojde k zápisu DB ani uploadu.

Stav po implementaci 21. 10. 2026: kontrolní krok, ruční výběr autora a potvrzení před zápisem jsou implementované. Opakovaný import vytváří novou neměnnou verzi. Správa externalId a detekce opakovaného importu stejné dávky zbývají. Tento požadavek má v další produktové etapě přednost před rozšiřováním médií.

## Upřesnění původního způsobu odevzdávání

Student běžně uloží práci na školní síťový disk pod svým školním ID, například `4464341_02.jpg`: `4464341` identifikuje studenta, `_02` rozlišuje soubor/pohled jeho práce. Uživatel uvedl i zápis `4464341_02,jpg`; nestandardní přípona se má v kontrole importu označit a nabídnout opravu, nikoli vést k chybnému párování autora. Význam pořadového suffixu nad rámec rozlišení souboru se nemá automaticky odvozovat.

Učitel následně vybere soubory ze síťového disku a hromadně je nahraje k vybranému zadání. Automatický návrh páruje přesně školní ID před oddělovačem s externalId žáka v odpovídající skupině; suffix ani přípona nejsou součástí ID. Více souborů téhož studenta zůstává součástí jedné práce pro toto zadání. Před uložením proběhne kontrola a možnost ručního přiřazení podle výše uvedeného postupu.

Výběr souborů z dostupného síťového disku neznamená požadavek na automatické sledování disku ani serverové připojení SMB. Primární tok je učitelský import. Samostatný upload přihlášeného studenta je žádoucí a zachovává se jako plnohodnotná alternativa; autor se v něm určuje přihlášeným účtem, nikoli názvem souboru.


## Historie práce a Work in Progress — požadavek 21. 10. 2026

Ke stejnému zadání a studentovi musí být možné postupně odevzdávat neměnné verze práce označené „Rozpracováno“ (WIP) nebo „Finální“. Každá verze zachová datum, autora uploadu, popis změn a své soubory; nová verze nenahrazuje staré soubory ani obsah, ke kterému již existuje hodnocení. Učitel vidí postup práce před dokončením a může otevřít starší verze. Požadavek platí pro import učitelem i vlastní upload studenta a pro všechny podporované typy médií, včetně budoucího videa/3D. WIP práce musí být v galerii rozlišena od finální práce a od rozpracovaného hodnocení. Hodnocení musí jednoznačně identifikovat verzi, kterou posuzuje. Bodové hodnocení WIP versus pouze konzultační zpětná vazba je otázka k produktovému upřesnění.


## Aktuální implementace historie a videa (21. 10. 2026)

Učitelský import i studentský upload vytvářejí neměnné verze se stavem Rozpracováno/Finální, popisem změn, datem a ID autora uploadu. Starší soubory i hodnocení zůstávají u své verze a lze je otevřít z historie v detailu zadání. WIP je zatím pro prohlížení učitelem, přiřazení bodového hodnocení vyžaduje finální verzi; samostatné konzultační komentáře zbývají.

Vedle obrázků jsou podporovány MP4/WebM do 25 MB na soubor, přehrávání ovládá nativní přehrávač prohlížeče včetně pauzy, času, opakování a zvuku. Chrání jej stejné oprávnění jako originály, včetně rozsahových HTTP odpovědí. Konkrétní kodek musí podporovat prohlížeč; automatický převod, video náhledy, rozsáhlejší video uploady a 3D zůstávají další etapou. PDF/ZIP lze stáhnout.


Upřesnění 21. 10. 2026: MP4 nyní může mít až 100 MB v učitelském i studentském uploadu. Ostatní formáty včetně WebM zůstávají na 25 MB. Celkový limit učitelské dávky zůstává 100 MB. Uživatel potvrdil pravidlo: WIP pro průběžnou konzultaci, finální verze pro bodové hodnocení.


## Editor zadání a ochrana kritérií — implementováno 21. 10. 2026

Učitel v detailu upravuje název, popis, pokyny a termín. Kritéria lze přidat, odstranit a seřadit tlačítky nahoru/dolů; každé má název, popis a kladný celočíselný bodový limit. Součet musí odpovídat maximu zadání. Koncept smí být bez kritérií, publikované a hodnotitelné zadání je mít musí.

Po přiřazení prvního hodnocení se kritéria a bodové maximum uzamknou v UI i API. Tím se zachová význam existujících skóre; pro změnu škály slouží duplikace zadání. Texty a termín zůstávají upravitelné. Přílohy zadání se tímto editorem zatím nespravují.

## Jednotné pravidlo administračních tabulek — 21. 10. 2026

Všechny administrační tabulky mají sdílet komponentu DataTable a následující chování:

- Kliknutí na datovou část řádku otevře detail nebo editor záznamu. Stejná akce je dostupná klávesami Enter/mezerník. Kliknutí na checkbox, menu nebo koš neotevírá řádek.
- Vpravo je samostatné tlačítko koše s jednoznačným přístupným názvem. Smazání vždy vyžaduje potvrzení se seznamem dotčených záznamů a jejich počtem; zavření/zrušení nic nemění.
- Checkboxy umožňují výběr jednotlivých řádků a všech řádků aktuální stránky. Výběr se při změně stránky, hledání nebo filtru ruší. Výběr všech znamená pouze viditelnou stránku, nikoli celou databázi.
- Nad tabulkou je počet vybraných položek a hromadné akce, minimálně hromadné mazání. Další hromadné úpravy se přidávají podle entity; zadání nyní podporují publikaci, uzavření a návrat do konceptu.
- Hromadné změny vyžadují potvrzení a server znovu ověří oprávnění ke každému ID. Operace je atomická: neplatný či nepovolený záznam nebo navázaná data zamítnou celou dávku.
- Běžné mazání nesmí kaskádově zrušit odevzdané práce a hodnocení. Zadání s odevzdáním/přílohou, předmět se zadáními a student s odevzdáním se nezmažou; zobrazí se důvod. Učitel také nemůže odstranit účet sdílený třídou jiného učitele.
- Akce, chyby a úspěšné výsledky jsou viditelné v rozhraní. Neoprávněné role mají pouze povolené čtecí akce.

Implementace zahrnuje seznam studentů, seznam předmětů, seznam zadání a tabulku zadání v detailu předmětu. Studentský řádek otevírá editor jména, e-mailu a školního ID, které slouží párování importu. Učitel vidí v seznamu studentů pouze členy svých tříd. Kartové galerie a přehled tříd nejsou tabulky a toto sjednocení nemění jejich způsob zobrazení.

## Rozdělení obrazovek — zadání pro třídu a práce studenta (21. 10. 2026)

Hlavní učitelský tok je **zadání pro třídu → konkrétní student → jeho práce a verze → hodnocení vybrané finální verze**.

- Seznam Zadání zobrazuje úkoly v předmětech a třídách, termíny, stav a počet studentů s nahranou prací. Počet verzí není počet odevzdávajících studentů. Výběr předmětu při tvorbě jasně uvádí jeho třídu a akademický rok; zadání lze filtrovat podle třídy.
- Detail zadání obsahuje popis požadovaných výstupů, pokyny, kritéria, termín, správu zadání a vstup do hromadného importu. Učitel vidí jeden řádek za studenta včetně těch, kteří ještě neodevzdali, a stav jeho poslední verze. Na této obrazovce se nepřehrávají soubory a nevybírají se verze různých studentů.
- Detail práce /tasks/[taskId]/students/[studentId] patří právě jednomu studentovi a zadání. Obsahuje náhledy, text práce, WIP/finální verze, historii, autora a čas uploadu, výsledky a přiřazování hodnotitele k vybrané finální verzi. Odkaz na zadání zachovává kontext třídy a předmětu.
- Student otevře ze zadání Moji práci a až tam odevzdává novou verzi nebo prohlíží své výsledky. Má přístup pouze ke své práci. Hodnotitel vidí pouze verze, ke kterým má přiřazené hodnocení. Práce bývalého člena třídy zůstává učiteli dohledatelná v přehledu zadání.
- Automatická testovací data se nemají objevovat v demonstračním náhledu pro uživatele. Preview a E2E běží na oddělených databázích/bucketech.


## Přímé hodnocení ze zadání

Učitel má v sekci Studenti a odevzdání tlačítko Hodnotit práce. Otevře první jeho nedokončené hodnocení poslední finální verze v daném zadání, přednostně s přiloženými soubory. Chybějící vlastní přiřazení se doplní při kliknutí. Existující body se neruší; WIP ani starší finální verze pod novějším WIP se tímto hromadným vstupem nevybírá. Pokud učitel potřebuje hodnotit historickou finální verzi, otevře konkrétní studentskou práci a její historii.

Demonstrační data pro učitelské hodnocení vytváří scripts/seed-review-mockups.ts, omezený na lokální desigator_preview a privátní desigator-preview bucket. Obsahuje různorodé ilustrační, typografické a designérské obrázky a jejich detaily, WIP a finální verze.


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


## Školy a kombinovatelná oprávnění (21. 10. 2026)

Desigator nově podporuje oddělené organizace. Účet má nejvýše jednu domovskou školu; externí hodnocení získává konkrétním přiřazením práce i z jiné školy. Uživatelská oprávnění jsou samostatná: SCHOOL_ADMIN (správce školy), TEACHER (učitel), EVALUATOR (hodnotitel), STUDENT (student). Správce platformy ADMIN zůstává globální a nelze jej udělit školní pozvánkou. Studentské oprávnění se nekombinuje s oprávněními pracovníků školy.

- Nastavení → Moje škola: založení školy, přejmenování, pozvánky a správa oprávnění členů. Zakladatel získá SCHOOL_ADMIN + TEACHER + EVALUATOR; školní správce může fungovat i samostatně bez výuky nebo hodnocení.
- Pozvánka obsahuje ověřovaný e-mail, zvolená oprávnění a jednorázový token platný 7 dní. Databáze ukládá pouze hash tokenu. Odkaz předává správce ručně; aplikace neposílá e-mail. Přihlášení nebo registrace zachovává návrat na pozvánku.
- Učitel spravuje vlastní předměty a zadání uvnitř své školy. Školní správce má správu celé vlastní školy. Hodnotitel otevírá jen přiřazené práce; učitel s oprávněním EVALUATOR vidí i externí přiřazení. Zapisuje vlastní hodnocení; správa školy sama právo hodnotit nezakládá.
- Třídy mají povinnou organizaci; předměty, zadání a práce ji dědí vazbami. Připojení do třídy, ruční přidání studenta a import nepovolují členství z jiné školy. Školní externalId je jedinečné uvnitř organizace, e-mail účtu zůstává jedinečný v platformě.
- Session/JWT obnovuje oprávnění z DB; změny platí i pro přihlášené účty. Změny správců školy jsou serializované a nelze odebrat posledního aktivního správce. Převod mezi studentským a zaměstnaneckým účtem ani přesun mezi školami se tímto editorem neprovádí.
- Textové User.institution zůstává volitelným profilem a neurčuje přístupová práva. User.role slouží pro kompatibilní navigaci; skutečná oprávnění obsahuje User.roles.

Migrace 20261021210000_organizations zachovává existující záznamy, vytváří původní organizaci a přiřazuje do ní původní správce platformy, učitele a studenty. Původní učitelé dostávají také EVALUATOR. Historická data se automaticky nepřepisují na jiné učitele. Spuštění migrace nad stávající databází vyžaduje samostatné schválení; ověření probíhá na izolovaných databázích a kopii lokálního náhledu.

Statistiky a oprava historického importu nadále zůstávají samostatnou navazující etapou; hranicí školních statistik je organizace, učitelských statistik vlastní předměty.


### 21. 10. 2026 — Strukturované Nastavení a registr organizací

- Nastavení rozděleno do samostatných záložek s přímými odkazy ?section=organizations|school|templates|profile|appearance. Administrátor začíná registry organizací, ostatní profilem. Záložka organizací je dostupná pouze správci platformy; sidebar se nerozšiřuje.
- Přehled organizací ukazuje název, počty členů/tříd a datum založení; souhrnné karty zobrazují velikost platformy. DataTable poskytuje hledání, stránkování, řazení a volbu sloupců. Kliknutí otevře dialog úpravy názvu. API GET/PATCH /api/admin/organizations kontroluje platformovou roli ADMIN; změna názvu nezasahuje členství ani oprávnění.
- Moje škola a členové odděluje školní správu od registru platformy. Členové jsou ve společné tabulce; oprávnění se upravují v dialogu, pozvánka se otevře tlačítkem Pozvat člena, přejmenování školy samostatným dialogem. Dosavadní ochrana cizí školy a posledního správce zůstává v původních API.
- Osobní profil, šablony a vzhled mají vlastní obsahové panely. Přijetí školní pozvánky vede přímo do školní záložky. Původní testy upraveny na přímé odkazy podle nového členění.
- Ověřeno: 86 unit/API testů, typy, lint a produkční build. E2E pro administrátorský přehled, přejmenování organizace, zamítnutí přístupu učiteli, dialogy členů/pozvánek, zachování vybrané záložky po reloadu a mobilní zobrazení prošel. Souhrnná sada 17 scénářů prošla v 15 případech; dva regresní scénáře následně prošly cíleně po zpřesnění výběru konkrétního přihlášeného hodnotitele a obnovení testovací relace. Školní izolační E2E včetně kombinovaných rolí a pozvánek prošel. Vizuálně zkontrolován desktop i mobil.
- Pro lokální ověření byla aplikována již existující migrace 20261021210000_organizations na oddělené preview/audit DB; samotné členění Nastavení nepřidává další schéma ani migraci.


### Správce platformy a volitelné působení ve škole (21. 10. 2026)

Čistý ADMIN nemá automatickou domovskou školu. V Nastavení vidí Organizace (všechny školy), profil a vzhled. Ze seznamu organizací může přes Spravovat členy otevřít správu vybrané školy bez přijetí členství. Parametr organizationId na školních API je autorizovaný na serveru: správce platformy smí vybrat libovolnou školu, školní správce pouze svou.

Účet může současně obsahovat ADMIN + SCHOOL_ADMIN + TEACHER + EVALUATOR a mít jednu skutečnou školní příslušnost. Tehdy se navíc zobrazí Působení ve škole a osobní šablony. Globální administrace zůstává globální, školní oprávnění nevytvářejí další automatická členství. Školní editor ani pozvánky nemohou přidělit ADMIN a při úpravě kombinovaného účtu se existující ADMIN zachovává.

Migrace 20261021220000_platform_admin_membership odstraňuje pouze automatické členství legacy u účtů se samotným oprávněním ADMIN; účty s explicitně kombinovanými rolemi zachovává. Změna se ověřuje na desigator_organizations_preview_test, nikoli na původní databázi.


## Historický archiv a statistiky hodnocení (21. 10. 2026)

Položka Statistiky je dostupná učitelům, správcům škol a správci platformy. Učitel má přístup ke svým současným a explicitně přiřazeným archivním předmětům, školní správce k celé své škole a správce platformy ke všem školám. Samostatný hodnotitel ani student statistiky školy neotevře. Filtry zahrnují zdroj (současný/historický/oba), školu, rok předmětu a konkrétní předmět.

Historický export db/desigator-export.sql byl načten datovým parserem, který SQL nikdy nespouští. Skutečný obsah: 10 328 hodnocení, 140 zadání, 49 předmětů a 476 zdrojových uživatelů. Dřívější legacy-data.json obsahoval chybně 141 zadání kvůli regulárnímu parsování textů. Nový import zachovává původní ID studentů a hodnotitelů, body, komentář a původní datum změny záznamu. Nevytváří přihlašovací účty, nepřebírá hesla ani globální oprávnění a nevytváří fiktivní odevzdání nebo přílohy. Historické osoby nejsou automaticky slučovány s nynějšími účty.

- Audit exportu: 305 hodnocení odkazuje na nedohledaného studenta, 3 předměty nemají uvedený rok a 16 zadání nemá dohledaný předmět. Žádné hodnocení se neztratilo. Chybějící vazby zůstávají označené a předměty se nepřiřazují náhodně; rok 0000 se nepřepisuje na 2012.
- Zdroj neobsahuje spolehlivé vlastnictví předmětů učiteli. Administrátor nebo školní správce může v dolní tabulce statistik přiřadit archivní předmět aktivnímu učiteli stejné školy. Teprve tím mu zpřístupní jeho historické statistiky. Učitel sám rozsah nezmění.
- Přehled počítá jednotlivá dokončená hodnocení a rozlišuje počet hodnocení od počtu prací. Procentní skóre každého hodnocení = body / maximum zadání; celkový průměr je průměrem těchto procent, nikoli výslednou známkou studenta. Neznámé/nulové maximum nebo body mimo rozsah zůstávají v počtech, ale ne v průměru. Nula bodů při platné škále se započítává.
- Současné statistiky zahrnují dokončená hodnocení pouze poslední finální verze práce. Novější neohodnocená finální verze vyřadí starší výsledek; novější WIP poslední finální výsledek nenahrazuje. Historická data verze neobsahují.
- Historický archiv celkem obsahuje 2 539 dvojic student/zadání, 33 hodnotitelů a průměrné procentní skóre 71,8 %. Přehled zahrnuje rozložení výsledků, srovnání roků, předmětů a hodnotitelů; srovnání hodnotitelů závisí na přidělených pracích.

Import: npx tsx scripts/import-legacy-ratings.ts --organization-id <ID školy> provede pouze audit; zápis vyžaduje --apply. Volitelné --file určuje export a --source-name identitu zdroje. Zápis je atomický, uzamkne cílovou organizaci a kontroluje otisk zdroje. Stejný soubor se nepřidá znovu; jiný obsah stejného pojmenovaného zdroje vyžaduje samostatné řešení aktualizace. Starý prisma/seed-legacy.ts přesměrovává na tento bezpečný import.

Migrace 20261021230000_historical_archive a skutečný import byly provedeny pouze na oddělené desigator_organizations_preview_test. Opakované spuštění zachovalo přesně 10 328 záznamů. Původní databáze zůstává beze změn. Náhled je na http://127.0.0.1:3104/cs/statistics.


### Vyhledávání ve filtrech statistik

Škola, předmět a učitel archivního předmětu používají serverové hledání místo dlouhého seznamu. Hledání vrací nejvýše 20 možností a při větším počtu vyzve k upřesnění; dotazy se odkládají o 200 ms a předchozí se ruší. U předmětů lze kombinovat název/kód a rok, např. YPG 2013. Rozsah školy a vlastnictví předmětů ověřuje API, včetně hledání. Školní správce ani učitel nemůže hledat v cizí škole. Metadata statistik už neposílají celé seznamy předmětů, škol a učitelů pro výběrová pole. Zdroj dat a rok zůstávají krátkými výběry.


### Historické studentské účty

`npx tsx scripts/import-legacy-students.ts --organization-id legacy` ověří import studentů z přesně stejného SQL souboru jako již importovaný archiv hodnocení. `--apply` zapíše účty do cílové školy. Import je atomický a opakovatelný; identita má stabilní ID `<historicalImport.id>-student-<user_id>` a původní `legacyId`. Vazba k hodnocením je dvojice konkrétního importu a `studentLegacyId`, nikoli jméno. Nevytváří současné třídy ani neodhaduje učitele historických kurzů.

Importuje pouze původní roli student (2). Účty jsou neaktivní s náhodným nepoužitelným heslem, původní hesla se nepřebírají. Chybějící, duplicitní nebo obsazené e-maily dostávají technickou adresu `@archive.invalid`; existující účty se automaticky neslučují. Školní ID se převezme pouze, pokud je kladné, jednoznačné a volné. Studentské účty s historickým ID jsou chráněné před smazáním v administraci.

Ověřeno 21. 10. 2026 v `desigator_organizations_preview_test`: importováno 435 studentů do školy `legacy`, 2 technické e-maily, 9 635 hodnocení odpovídá jejich původním ID. Opakované spuštění: 0 nových účtů. Administrátorské API `/api/students` vrací celkem 449 studentů včetně původních demo účtů. Původní databáze `desigator_preview` nebyla změněna. Archiv obsahuje i hodnocení osob, které nemají ve zdroji studentskou roli nebo mají chybějící uživatelský záznam; tyto účty se nevymýšlejí.

### Import historických předmětů a zadání do běžných seznamů

Na výslovné přání uživatele jsou všechny historické předměty přiřazeny existujícímu učiteli `teacher@desigator.cz` (Pan Učitel), nikoli odhadnutému původnímu autorovi. Příkaz `npx tsx scripts/import-legacy-teaching.ts --organization-id legacy --teacher-email teacher@desigator.cz` nejprve provede kontrolu; `--apply` zapíše data. Vyžaduje přesně odpovídající import archivu a aktivního učitele cílové školy.

V testovací kopii bylo doplněno 49 původních předmětů, 1 pomocný archivní předmět pro 16 zadání bez zdrojové vazby, všech 140 uzavřených zadání a 1 043 unikátních členství studentů ve skupinách (původní zápisy a doložená hodnocení). Historické skupiny a předměty jsou neaktivní; neznámý rok je v běžném modelu uložen jako 0 a vysvětlen v popisu, v původním archivu zůstává null. Popisy a podmínky zadání se přenášejí; soubory odevzdání ani přílohy tento SQL zdroj neposkytuje. Hodnocení zůstávají v historickém archivu; nevytvářejí se jejich druhé kopie v současných evaluacích, takže statistiky nejsou zdvojené.

Import používá stabilní ID podle konkrétního archivního importu a původních ID. Opakování vytvořilo 0 dalších předmětů a zadání. Existující záznamy nepřepisuje. Ověřena typová kontrola, lint a API seznamů z pohledu administrátora a učitele. Původní databáze nebyla změněna.


## Aktualizace 21. 10. 2026 — hesla, Resend a importní dávky

Změna a obnova hesla jsou implementované včetně jednorázových tokenů a zneplatnění dosavadních relací. Staré studentské API vytváří dávky atomicky s kryptografickými hesly. Import prací má persistentní ochranu proti opakování stejné dávky i souběžnému zápisu. Resend je napojen na serverové odesílání obnovy hesla; skutečné doručení vyžaduje API klíč a ověřenou doménu desigator.cz. Nastavení, migrace a přesná pravidla deduplikace jsou v README.md. Starší odstavce označující změnu hesla, obnovu nebo aktualizaci oprávnění relací za chybějící jsou tímto překonané.


## Aktualizace 22. 10. 2026 — zveřejnění výsledků

Dokončené hodnocení se nově studentovi zobrazí až po výslovném zveřejnění finální verze učitelem. Podmínkou je dokončení všech přiřazených hodnocení. Učitel může výsledek stáhnout ze zveřejnění, opravit a znovu zveřejnit; body a komentáře se při stažení nemažou. Zveřejněná hodnocení mají zámek v UI i API, včetně automatického ukládání a přiřazování hodnotitelů. Každá verze práce má samostatné zveřejnění. Studentské API neposkytuje nezveřejněné výsledky ani při znalosti přímého ID. Datum a ID zveřejňujícího uživatele jsou u odevzdání. Migrační a provozní pravidla obsahuje README; starší dokončené výsledky se automaticky nezveřejňují.


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


### 25. 10. 2026 — uživatelské menu a priorita hodnocení

Profil a odhlášení jsou v uživatelském dropdownu vpravo nahoře, spolu s volbou světlého/tmavého/systémového režimu. Na desktopu je jméno a role, na mobilu avatar; menu je dostupné z klávesnice a lokalizované CS/EN. Původní profilový blok v sidebaru je odstraněný.

Hodnotit práce je hlavní akce v záhlaví zadání pro učitele i přiřazeného hodnotitele. Hromadný upload je obrysová akce v sekci Studenti a odevzdání. Publikováno má samostatnou jemnou zelenou; výchozí badge jsou neutrální. Nahrání referenčních příloh je také vedlejší obrysová akce. Oranžovou řídí --primary v :root a .dark v src/app/globals.css; gradienty, navigace, jemné akcenty a focus ring se od ní odvozují. Stavová zelená má vlastní --status-success a --status-success-foreground.

Ověřeno pěti E2E scénáři: uživatelské menu, profil/odhlášení, učitel i hodnotitel, import a editor zadání; produkční build, typy a lint prošly. Pro standalone balík jsou výslovně přibalené i nativní knihovny Sharp.
