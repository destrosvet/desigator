# Registrace a vyšší oprávnění

Veřejná registrace vytváří pouze základní účet `USER`, bez organizace a bez oprávnění vyučovat. Založení školy nelze vynutit předáním role nebo názvu organizace registračnímu API.

Registrace vyžaduje nakonfigurované `RESEND_API_KEY`, `RESEND_FROM` a veřejné HTTPS `APP_URL` (případně `NEXTAUTH_URL` nebo `AUTH_URL`). Po registraci se odešle jednorázový ověřovací odkaz platný 24 hodin. Databáze ukládá pouze hash tokenu. Přihlášení a session jsou do ověření adresy zablokované. Neodeslaný e-mail lze zopakovat na stránce ověření; požadavky na registraci, ověření a opětovné odeslání jsou omezené počtem pokusů. Ověření se potvrzuje tlačítkem, takže samotné načtení odkazu poštovním skenerem token nespotřebuje.

Ověřený uživatel v Nastavení → Oprávnění požádá o roli učitele nebo správce školy a uvede zdůvodnění. Administrátor žádosti schvaluje nebo zamítá v Nastavení → Žádosti o oprávnění; odkaz je také v přehledu uživatelů. Žádost ani samotné ověření e-mailu vyšší práva neudělují. Schválení nevytvoří školu automaticky. Schválený uživatel bez domovské organizace ji pak může založit v Nastavení → Moje škola a členové. Studentské účty s historií prací se nepřevádějí na pracovníky školy, aby neztratily přístup ke svým datům.

Migrace ponechává stávající účty funkční a nové veřejné registrace vždy vytváří jako neověřené. Účty vytvořené správcem nebo řízeným importem jsou důvěryhodné a zachovávají dosavadní způsob předání přístupu.

Školní záložka se přepíná bez nové serverové navigace a po prvním otevření si uchovává načtený obsah. Seznam členů se hledá a stránkuje na serveru, standardně po 20 a nejvýše po 100 záznamech. Metadata školy, členové a jejich počet se načítají souběžně. Změna práv v session znovu načte školní kontext.
