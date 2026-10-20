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
