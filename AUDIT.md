# Audit shody implementace s plánem — 21. 10. 2026

> Aktuální stav je v PLAN.md, souhrn 25. 10. 2026. Toto je historický audit: konzultace WIP, PDF/GLB, zveřejňování, studentské výsledky, editor zadání, účty a nástěnka byly mezitím doplněné.

Statická kontrola zdrojů, Prisma schématu, testů a CI konfigurace. Tento audit neznamená nové spuštění prohlížečových testů, migrací, CI ani audit závislostí. V předchozím vývojovém kroku prošly typy, lint a 22 unit/API testů.

## Závěr

Produktový směr v PLAN.md a DOKUMENTACE.md odpovídá implementaci: předmět → úkol → galerie → dominantní náhled → hodnocení. Kompletní pracovní tok bez zásahů do API zatím dokončený není. Největší překážky jsou tvorba kritérií z UI, studentské výsledky, opakované odevzdání a sjednocení oprávnění.

## Srovnání s plánem

| Oblast | Skutečný stav | Shoda / zbývající práce |
|---|---|---|
| Galerie hodnotitele | Předměty, úkoly s postupem, mřížka, hledání, stav, postupné načítání | Hotový základ; odpovídá doplnění workflow |
| Hodnoticí pracoviště | Obrázky, více souborů, zoom, fullscreen, posuvníky, autosave, šipky, přednačtení sousedů | Implementováno; doplnění workflow není zřetelně vedené samostatnými checkboxy |
| Galerie učitele | V detailu zadání všechna oprávněná odevzdání včetně nepřiřazených, lokální filtry a řazení | Částečně hotovo; chybí širší filtr hodnotitele/předmětu/třídy, stránkování a E2E nové galerie |
| Více hodnotitelů | Učitel v galerii vidí jednotlivé stavy/body a přiřazuje dalšího | Částečně hotovo; chybí pravidlo celkového výsledku a zveřejnění |
| Kritéria a editace zadání | POST přijímá kritéria; formulář je nenabízí. PATCH upraví údaje, ne kritéria; detail nabízí změnu stavu | Otevřený bod plánu je správně. Nové zadání z UI lze vytvořit bez kritérií a nelze je potom dokončeně hodnotit |
| Student a výsledky | API filtruje dokončená hodnocení; studentský detail práci odevzdá, ale výsledky a feedback nezobrazuje | Nedokončeno; middleware navíc blokuje stránky evaluations. Dokončení hodnocení nyní fakticky určuje dostupnost v API, samostatné zveřejnění v modelu chybí |
| Opakované odevzdání | Upsert změní stav na SUBMITTED, přidává přílohy a ponechává původní hodnocení | Chybí verze práce, pravidlo vrácení a návaznost hodnocení na konkrétní verzi |
| Média | JPEG/PNG/WebP/GIF; PDF/ZIP ke stažení; náhledy na vyžádání | Video a 3D chybí v prohlížeči i povolených upload formátech. Persistované náhledy/fronta nejsou hotové |
| Studenti | Seznam, jednotlivé a hromadné vytvoření; externalId se zobrazuje | Chybí detail /students/[id], správa externalId a omezení seznamu na učitelův rozsah |
| Účty | Přihlášení, registrace studenta, profil, seznam učitelů/hodnotitelů přes GET users | Chybí změna/obnova hesla a UI správy učitelů/hodnotitelů. JWT po přihlášení neověřuje aktuální roli/aktivitu |
| Hromadný import prací | Párování podle externalId v názvu a členství ve třídě, limity, výsledek každého souboru, úklid po DB chybě | Základ existuje; chybí běžná správa párovacího ID a ověření kompletního toku |
| Lokalizace a chyby | Infrastruktura CS/EN, ale mnoho pevných českých textů a některé chyby jen v konzoli | README tvrzení o plné podpoře CS/EN je příliš silné |
| CI a testy | Workflow a 5 E2E scénářů ve 3 souborech existují; unit/API sada má 22 testů | Existence CI není potvrzený úspěšný běh. V plánu zůstávají starší počty 12 a 19 a formulace, že E2E teprve přidat |
| Migrace a pilot | Historie migrací, provozní konfigurace a předchozí izolované ověření jsou popsané | Bezpečný upgrade starých dat, obnova DB/S3 a produkční připravenost stále otevřené |

## Konkrétní mezery oprávnění a konzistence

1. GET /api/tasks/[id] stále omezuje přiřazená odevzdání jen pro roli EVALUATOR. Učitel, který cizí úkol vidí díky jednomu přiřazenému hodnocení, může získat další odevzdání a hodnocení. Serverová stránka již používá canManageTask, API zatím ne. Zdroj: src/app/api/tasks/[id]/route.ts oproti src/app/[locale]/tasks/[id]/page.tsx.
2. GET /api/students není omezen vlastnictvím tříd; classId je pouze volitelný filtr. Zdroj: src/app/api/students/route.ts.
3. Aktivita a role se kontrolují při přihlášení, nikoli znovu v JWT/session callbacku. Zdroj: src/lib/auth.ts.
4. Při přiřazení dalšího hodnotitele se nevypočítá nový stav práce; dříve EVALUATED práce může zůstat tak označená s novým PENDING hodnocením. Zdroj: POST src/app/api/evaluations/route.ts oproti PATCH detailu hodnocení.
5. Hromadná tvorba studentů nevaliduje celé pole e-mailů a používá Math.random pro dočasná hesla. Jednotlivý POST už bezpečný výběr polí má, takže část příslušného bodu plánu je zastaralá.

## Pořadí dalších prací

1. Sjednotit UI/API oprávnění a doplnit negativní testy, omezit seznam studentů a řešit změnu role/deaktivaci relace.
2. Dokončit tvorbu a editaci kritérií, pořadí a bodových limitů, termín a přílohy zadání. Ověřit vytvoření hodnotitelného zadání čistě přes UI.
3. Dokončit studentskou stránku výsledků včetně komentářů ke kritériím. Stanovit, zda dokončení rovnou publikuje, kdo vidí identitu hodnotitele a kdo potvrzuje celkový výsledek.
4. Zavést vrácení a verze odevzdání, aby staré body nehodnotily nové soubory. Srovnat stav při novém přiřazení hodnotitele.
5. Rozšířit učitelskou galerii a hromadné přiřazování; doplnit správu externalId a studentský detail.
6. Podle produktového směru doplnit video a 3D; předem určit podporované formáty a limity. Nejde jen o vložení přehrávače: zahrnout upload, autorizované načítání, náhledy a testy.
7. Správa účtů, překlady, chyby UI, E2E zbylých rolí, CI a ověření obnovy před pilotem.

## Možná rozšíření — návrhy, nikoli schválený rozsah

- Šablony hodnoticích kritérií podle disciplíny, aby učitel neopakoval stejné váhy a popisy.
- Hromadné přiřazení hodnotitele vybraným pracím a přehled neodevzdaných prací podle seznamu třídy.
- Anotace přímo do obrázku; později komentáře s časem videa nebo pohledem na 3D model.
- Srovnání verzí práce vedle sebe pro opakované odevzdání.
- Učitelské potvrzení a zveřejnění výsledků po dokončení komise; historie změn bodů a přiřazení.
- Export bodů a komentářů pro školní evidenci, pokud se při pilotu ukáže potřeba.
- Náhled PDF pro prezentace a více stran práce; ukazatel průběhu uploadu a opakování selhaného přenosu.
- Anonymizované hodnocení jako volitelný režim, pokud jej škola požaduje.

Veřejná galerie, AI známkování, notifikace a pokročilé statistiky nejsou podmínkou současného MVP. Tyto návrhy nevycházejí z průzkumu konkurenčních produktů, ale z mezer a návazností současného workflow.


## Upřesnění po auditu 21. 10. 2026

Uživatel určil učitelský hromadný import s kontrolou a ručním párováním před zápisem jako hlavní tok. Projekt je remake systému v `.old`. Toto upřesnění posouvá import před rozšíření video/3D oproti původnímu doporučení výše. Podrobné požadavky a otevřené kroky jsou doplněny v DOKUMENTACE.md a PLAN.md.


## Stav po implementaci importu a historie

Kontrola autorů před potvrzením importu, ruční párování, neměnné WIP/finální verze a historie jsou nyní implementované. Další upload již nepřepisuje původní soubory ani bodování. Podporován je také přehrávač MP4/WebM do 25 MB. Dříve uvedené mezery v těchto oblastech jsou tím částečně uzavřené; správa školních ID, deduplikace opakované dávky, konzultační komentáře, větší videa/převody a 3D zůstávají otevřené. Detaily ověření a migrace obsahuje PLAN.md.


## Aktualizace po dokončení editoru zadání

Editor textů, termínu, kritérií a jejich pořadí je implementovaný; odpadla nutnost zadávat kritéria ručně přes API. Publikace i přiřazení hodnocení kontrolují úplnost bodové škály. Po přiřazení prvního hodnocení je škála uzamčená. Správa příloh zadání zůstává otevřená, stejně jako studentské zobrazení dokončených výsledků. Další prioritou zůstává dokončení studentských výsledků a školních ID.


## Aktualizace — administrační tabulky

Společné tabulky nyní podporují potvrzené jednotlivé a hromadné mazání, výběr aktuální stránky a klávesové otevření řádku. Zadání mají hromadnou změnu stavu. Studenty lze upravovat v dialogu včetně školního ID; tabulka již neodkazuje na neexistující detail. Seznam studentů a mutace jsou omezené učitelovými třídami. Mazání s navázanými pracemi a hodnocením je blokované a atomická dávka se při jediné chybě neprovede. Tyto části předchozího auditu jsou tím uzavřené; bezpečné předávání přihlašovacích údajů, změny aktivních relací a správa dalších rolí zůstávají otevřené.


## Náprava struktury workflow

Historie napříč studenty byla odstraněna z detailu zadání. Zadání nyní slouží třídě a obsahuje souhrn jednotlivých studentů včetně neodevzdaných prací. Vlastní náhled, verze a hodnocení jsou na samostatné adrese práce daného studenta. Studenti na této stránce vidí pouze vlastní dokončená hodnocení a zpětnou vazbu; samostatné řízení zveřejnění výsledků zůstává otevřené. Preview je oddělené od testovacích dat.

## Aktualizace vydání — 25. 10. 2026

Aktuální stav a závěrečné ověření shrnuje sekce Příprava vydání v PLAN.md. Předchozí otevřené body jsou historické: správa školních ID a rolí, editor a přílohy zadání, verze a konzultace, zveřejnění a společné výsledky, obnova dat, GLB/PDF a úplný E2E běh jsou implementované a ověřené. Audit závislostí nyní hlásí 0 zranitelností. Produkční konfiguraci a postup nasazení obsahuje DEPLOYMENT.md; skutečné doručení přes produkční Resend a úplná EN lokalizace nebyly tímto lokálním ověřením potvrzené.
