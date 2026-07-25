# Rangers of Shadow Deep – Digital Character Sheet

Ein inoffizieller, webbasierter Charakterbogen für *Rangers of Shadow Deep*. Das Tool ist für Smartphone, Tablet und Desktop gedacht und unterstützt die Buchhaltung direkt am Spieltisch.

## Funktionen

- Ranger-Werte, Ausrüstung und Quest-Notizen verwalten
- Heroic Abilities – einschließlich archetypspezifischer Varianten – und Spells auswählen und ihre Nutzung markieren
- Archetypen mit Traits und Einschränkungen anzeigen
- Missionen mit Gegnern, Zielen, Anpassungen und bestätigter XP-Übertragung dokumentieren
- Den Missionsbereich in Edit und Play einklappen, wenn er gerade nicht benötigt wird
- Einen optionalen Gegnerkatalog laden und Gegner samt vorgeschlagenen XP per Dropdown hinzufügen
- Frei wählbare temporäre Ally-Boni und Debuffs direkt an den effektiven Charakterwerten anzeigen
- Poisoned, Diseased sowie gestapeltes Hunger & Thirst als aktive Zustände mit Regelerinnerung festhalten
- Änderungen automatisch im Browser speichern
- Fachliche Änderungen in einer filterbaren, exportierbaren Historie nachvollziehen
- Atmosphärische Rückmeldungen beim Einsetzen von Abilities, Ändern der aktuellen Health und Abschließen einer Mission erhalten
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

Über **History** lässt sich nachvollziehen, wann Charakterwerte, Ausrüstung, Abilities, Conditions oder Missionen geändert wurden. Schnelle Änderungen desselben Bereichs werden zu einem verständlichen Eintrag zusammengefasst. Reine Oberflächenpräferenzen sowie temporäre Ally-Boni und Debuffs werden nicht dauerhaft protokolliert. Die Historie gehört zur Charakterdatei, wird beim Export mitgenommen und auf die 200 neuesten Einträge begrenzt. **Clear history** löscht nur das Protokoll, nicht den aktuellen Charakter.

Ein optionaler Gegnerkatalog wird über **Load Enemy Catalog** separat geladen und ebenfalls nur in diesem Browser gespeichert. Danach lassen sich Gegner in einer Auswahlliste samt vorgeschlagenem XP-Wert zur aktiven Mission hinzufügen. **Add blank enemy** bleibt für eigene oder szenariospezifische Gegner verfügbar. Die vorgeschlagenen Gegner-XP ersetzen nicht die **Outcome and Experience**-Regeln des gespielten Szenarios; Name und Wert bleiben deshalb in jedem Missionsbericht manuell korrigierbar.

In Edit und Play können temporäre Ally-Boni und Debuffs direkt an Movement, Fight, Shoot, Armor, Will, Health und Recruitment gesetzt werden. Ein Tippen auf **Effects ±** öffnet den gemeinsamen Dialog; Bonus und Malus haben getrennte Zahlenfelder mit touchfreundlichen `−/+`-Schritten und können gleichzeitig gelten. Aktive Karten zeigen den effektiven Wert sowie die vollständige Rechnung aus Grundwert, Ally-Bonus und Debuff. Grundwerte und Charakterdatei werden nicht verändert. Einzelne oder alle Effekte lassen sich im selben Dialog entfernen. Die Effekte überleben ein versehentliches Neuladen desselben Tabs, aber keine neue Browser-Sitzung.

Unter **Conditions** lassen sich die allgemeinen Regelzustände **Poisoned**, **Diseased** und **Hunger & Thirst** über **+ Add Condition** aktivieren. Aktive Karten zeigen die wichtigsten Auswirkungen, Dauer beziehungsweise Heilungsmöglichkeit und die Regelbuchseite; Hunger & Thirst besitzt einen eigenen Stufenzähler. Zustände werden mit dem Charakter gespeichert und exportiert, verändern Werte oder Würfe aber bewusst nicht automatisch.

Die Überschrift **Mission** ist in beiden Modi ein Ein-/Ausklappschalter. Das Einklappen blendet lediglich die Oberfläche aus; eine aktive Mission und die Historie bleiben gespeichert. Der gewählte Zustand wird mit dem Charakter gesichert.

Kurze visuelle Effekte bestätigen wichtige Spielaktionen: Eine Ability wird verbraucht oder wieder verfügbar, Current Health sinkt oder steigt, temporäre Boni und Debuffs rasten farblich am Wert ein, neue Conditions werden markiert, und ein abgeschlossener Missionsbericht erhält ein Siegel. Beim Übertragen von Missions-XP werden sowohl der Bericht als auch der Ranger-Wert hervorgehoben. Die Effekte ändern keine Spieldaten und blockieren keine Eingabe. Wenn das Betriebssystem reduzierte Bewegung anfordert, bleiben sie vollständig aus.

## Technik

Die Anwendung besteht aus statischem HTML, CSS und Vanilla JavaScript. `index.html` enthält das Markup, `styles.css` bündelt die Darstellung einschließlich Responsive- und Effektregeln, und `app.js` enthält Zustand, Rendering und Interaktionen. `rules-data.js` stellt die unveränderlichen Auswahlkataloge für Fähigkeiten, Archetypen und Ausrüstung bereit. `persistence.js` kapselt die reine Validierung, Migration und Normalisierung gespeicherter Charakterdaten, während `storage.js` ausschließlich das lokale Character-JSON und dessen Recovery-Kopie verwaltet. Es gibt keine Serverkomponente und keine externen Benutzerkonten.

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
