# Rangers of Shadow Deep – Digital Character Sheet

Ein inoffizieller, webbasierter Charakterbogen für *Rangers of Shadow Deep*. Das Tool ist für Smartphone, Tablet und Desktop gedacht und unterstützt die Buchhaltung direkt am Spieltisch.

## Funktionen

- Ranger-Werte, Ausrüstung und Quest-Notizen verwalten
- Heroic Abilities und Spells auswählen und ihre Nutzung markieren
- Archetypen mit Traits und Einschränkungen anzeigen
- Missionen mit Gegnern, Zielen, Anpassungen und bestätigter XP-Übertragung dokumentieren
- Den Missionsbereich in Edit und Play einklappen, wenn er gerade nicht benötigt wird
- Einen optionalen Gegnerkatalog laden und Gegner samt vorgeschlagenen XP per Dropdown hinzufügen
- Frei wählbare temporäre Ally-Boni und Debuffs direkt an den effektiven Charakterwerten anzeigen
- Änderungen automatisch im Browser speichern
- Charaktere als JSON-Datei sichern und auf einem anderen Gerät laden
- Ohne Konto, Backend oder Installation verwenden

## Verwendung

Öffne `index.html` direkt in einem modernen Browser. Für die lokale Entwicklung kann alternativ ein kleiner Webserver gestartet werden:

```bash
python3 -m http.server 5500
```

Anschließend ist der Charakterbogen unter `http://localhost:5500` erreichbar.

## Daten und Backups

Der aktuelle Charakter wird ausschließlich im lokalen Browserspeicher (`localStorage`) abgelegt. Browserdaten zu löschen oder einen anderen Browser beziehungsweise ein anderes Gerät zu verwenden, übernimmt diese Daten nicht automatisch. Nutze deshalb regelmäßig **Save Character File** und stelle Sicherungen mit **Load Character File** wieder her.

Ein optionaler Gegnerkatalog wird über **Load Enemy Catalog** separat geladen und ebenfalls nur in diesem Browser gespeichert. Danach lassen sich Gegner in einer Auswahlliste samt vorgeschlagenem XP-Wert zur aktiven Mission hinzufügen. **Add blank enemy** bleibt für eigene oder szenariospezifische Gegner verfügbar. Die vorgeschlagenen Gegner-XP ersetzen nicht die **Outcome and Experience**-Regeln des gespielten Szenarios; Name und Wert bleiben deshalb in jedem Missionsbericht manuell korrigierbar.

In Edit und Play können temporäre Ally-Boni und Debuffs direkt an Movement, Fight, Shoot, Armor, Will, Health und Recruitment gesetzt werden. Ein Tippen auf **Effects ±** öffnet den gemeinsamen Dialog; Bonus und Malus haben getrennte Zahlenfelder mit touchfreundlichen `−/+`-Schritten und können gleichzeitig gelten. Aktive Karten zeigen den effektiven Wert sowie die vollständige Rechnung aus Grundwert, Ally-Bonus und Debuff. Grundwerte und Charakterdatei werden nicht verändert. Einzelne oder alle Effekte lassen sich im selben Dialog entfernen. Die Effekte überleben ein versehentliches Neuladen desselben Tabs, aber keine neue Browser-Sitzung.

Die Überschrift **Mission** ist in beiden Modi ein Ein-/Ausklappschalter. Das Einklappen blendet lediglich die Oberfläche aus; eine aktive Mission und die Historie bleiben gespeichert. Der gewählte Zustand wird mit dem Charakter gesichert.

## Technik

Die Anwendung besteht aus statischem HTML, CSS und Vanilla JavaScript. Es gibt keine Serverkomponente und keine externen Benutzerkonten.

Für die Browser-Regressionsprüfungen werden Node.js 22 oder neuer und ein Chromium-basierter Browser benötigt:

```bash
node tests/run.mjs
```

Der Testläufer verwendet keine npm-Abhängigkeiten und startet Webserver, Browser und ein isoliertes Browserprofil selbstständig.

## Hinweis zum Spiel

Dies ist ein nicht kommerzielles Fan-Projekt und steht in keiner Verbindung zu Joseph A. McCullough, Modiphius Entertainment oder anderen Rechteinhabern. *Rangers of Shadow Deep* sowie zugehörige Namen und Spielinhalte gehören ihren jeweiligen Rechteinhabern. Zum Spielen wird das offizielle Regelwerk benötigt.

Weitere Informationen zum Spiel gibt es auf der [offiziellen Rangers-of-Shadow-Deep-Seite von Modiphius](https://modiphius.net/en-us/collections/rangers-of-shadow-deep).

## Lizenz

Für den Quellcode wurde noch keine allgemeine Wiederverwendungslizenz festgelegt. Spielnamen, Regeltexte und sonstige Inhalte Dritter sind von einer zukünftigen Code-Lizenz nicht umfasst.
