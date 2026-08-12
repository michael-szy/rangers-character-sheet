# Rangers of Shadow Deep – Digital Character Sheet

Ein inoffizieller, webbasierter Charakterbogen für *Rangers of Shadow Deep*. Das Tool ist für Smartphone, Tablet und Desktop gedacht und unterstützt die Buchhaltung direkt am Spieltisch.

## Funktionen

- Ranger-Werte, Ausrüstung und Quest-Notizen verwalten
- Heroic Abilities – einschließlich archetypspezifischer Varianten – und Spells auswählen und ihre Nutzung markieren
- Archetypen mit Traits und Einschränkungen anzeigen
- Missionen mit direkt auswählbaren Gegnern, Ziel-Presets, Bonus-/Token-Summen und bestätigter XP-Übertragung dokumentieren
- Alle 21 Szenarien der drei Standard Missions und der fünf Missionen aus **A Gathering of Heroes** direkt auswählen und mit Seitenverweis, Kurzbriefing, Gegnerprofilen und Missionsfortschritt verfolgen
- Den aktuellen Zug mit szenariobewussten Ereignis- und Zuglimit-Hinweisen verfolgen
- Den Missionsbereich einklappen, wenn er gerade nicht benötigt wird
- Alle 42 unterstützten Gegnerprofile ohne zusätzliche Katalogdatei direkt als Kill-Zeile hinzufügen
- Frei wählbare temporäre Ally-Boni und Debuffs direkt an den effektiven Charakterwerten anzeigen
- Poisoned, Diseased sowie gestapeltes Hunger & Thirst als aktive Zustände mit Regelerinnerung festhalten
- Conditions über eine kompakte Statusleiste direkt oberhalb des Charakternamens hinzufügen und überblicken
- Die ungetesteten Homebrew-Kampfregeln v0.5 über einen getrennten senfgelben Reiter als Tischreferenz öffnen
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

Der aktuelle Charakter wird ausschließlich im lokalen Browserspeicher (`localStorage`) abgelegt. Browserdaten zu löschen oder einen anderen Browser beziehungsweise ein anderes Gerät zu verwenden, übernimmt diese Daten nicht automatisch. Die optionalen Werkzeuge **Save Character File** und **Restore Character File** liegen deshalb gesammelt unter **Character data & backup**; für Spielauswahlen muss keine Datei geladen werden.

Über **History** lässt sich nachvollziehen, wann Charakterwerte, Ausrüstung, Abilities, Conditions oder Missionen geändert wurden. Schnelle Änderungen desselben Bereichs werden zu einem verständlichen Eintrag zusammengefasst. Reine Oberflächenpräferenzen sowie temporäre Ally-Boni und Debuffs werden nicht dauerhaft protokolliert. Die Historie gehört zur Charakterdatei, wird beim Export mitgenommen und auf die 200 neuesten Einträge begrenzt. **Clear history** löscht nur das Protokoll, nicht den aktuellen Charakter.

Die 42 Gegnerprofile der 21 eingebauten Szenarien sind ohne Import direkt im Kill-Picker verfügbar. Bei einem verknüpften Szenario stehen dessen mögliche Gegner zuerst; darunter bleibt der vollständige Katalog erreichbar. Die Auswahl legt sofort eine Kill-Zeile an, und eine erneute Auswahl desselben Gegners erhöht automatisch dessen Anzahl. **Custom enemy** bleibt für eigene oder szenariospezifische Gegner verfügbar. Wo kein allgemeiner Gegner-XP-Wert vorliegt, startet die Zeile bei `0`; die **Outcome and Experience**-Regeln des Szenarios entscheiden weiterhin, was tatsächlich zählt, und Name sowie Wert bleiben manuell korrigierbar.

Unter **Mission objectives** lassen sich erreichte Haupt-, Bonus- sowie Rettungs-/Eskortziele mit einer Vorauswahl anlegen; freie Ziele bleiben möglich. **Bonuses & tokens** bietet sowohl einzelne Einträge wie Clues, Tokens oder Treasure als auch eine einzige Gesamtsumme für alle Bonusziele beziehungsweise Tokens. Die ausführliche Szenarioreferenz, Gegnerkarten, Missionsnotizen und der Kampagnenfortschritt sind standardmäßig eingeklappt, während Turn Tracker, Kill-Zähler und XP-Summe direkt erreichbar bleiben.

Beim Start einer Mission stehen die acht linearen Standardszenarien aus **The Missing**, **The Beacon Tower** und **Descent into Darkness** sowie alle 13 Szenarien aus **Blood Moon**, **Menagerie**, **Temple of Madness**, **Ghost Stone** und **Incinerator** ohne zusätzlichen Import bereit. Eine Auswahl übernimmt den offiziellen Titel und die Referenz, zeigt die gedruckte Seite im richtigen Buch sowie ein knappes Ziel-, Zeit- und Erinnerungsbriefing. Die Standard Missions teilen sich einen linearen Pfad; die Missionen aus **A Gathering of Heroes** erhalten jeweils ihren eigenen Fortschrittsblock, damit keine falsche Reihenfolge zwischen unabhängigen Missionen entsteht. Darunter stehen alle Gegner, die durch Aufbau, Ereignisse, Suchen, Räume, Notizen oder den Challenge Level vorkommen können, mit Move, Fight, Shoot, Armour, Will, Health, XP, knappen Merkmalen und Quellenverweis. Die Anzeige ersetzt weder Aufbau, Stückzahlen, Ereignisse, vollständige Sonderregeln noch Belohnungen im Regelbuch. **Custom / unlisted scenario** bleibt für eigene Missionen und weitere Kampagnen verfügbar.

Der **Turn Tracker** erscheint bei jedem eingebauten Szenario. Große `−/+`-Tasten ändern den aktuellen Zug; der Hinweis daneben berücksichtigt Ereignisse in jeder Runde, nur in ungeraden Runden, an festen Zügen, beim Öffnen neuer Räume, ab oder bis zu einem bestimmten Zug, bei Bedingungen und gedruckte Ausnahmen. Das Erreichen oder Überschreiten eines Zuglimits wird deutlich markiert, aber nicht blockiert. Der Zugstand wird mit dem Missionsbericht gespeichert und exportiert; der Tracker erinnert nur und führt keine Ereignisse selbst aus.

Temporäre Ally-Boni und Debuffs können direkt an Movement, Fight, Shoot, Armor, Will, Health und Recruitment gesetzt werden. Ein Tippen auf **Effects ±** öffnet den gemeinsamen Dialog; Bonus und Malus haben getrennte Zahlenfelder mit touchfreundlichen `−/+`-Schritten und können gleichzeitig gelten. Aktive Karten zeigen den effektiven Wert sowie die vollständige Rechnung aus Grundwert, Ally-Bonus und Debuff. Grundwerte und Charakterdatei werden nicht verändert. Einzelne oder alle Effekte lassen sich im selben Dialog entfernen. Die Effekte überleben ein versehentliches Neuladen desselben Tabs, aber keine neue Browser-Sitzung.

Die kompakte Statusleiste **Conditions** sitzt direkt oberhalb des Charakternamens und nimmt ohne aktiven Zustand nur eine Zeile ein. Über **+ Condition** lassen sich **Poisoned**, **Diseased** und **Hunger & Thirst** aktivieren; erst dann erscheinen die zugehörigen Warnkarten mit Auswirkung, Dauer beziehungsweise Heilungsmöglichkeit, Regelbuchseite und – bei Hunger & Thirst – eigenem Stufenzähler. Zustände werden mit dem Charakter gespeichert und exportiert, verändern Werte oder Würfe aber bewusst nicht automatisch.

Der abgesetzte senfgelbe Reiter **Homebrew v0.5** öffnet eine eigenständige Kurzreferenz für den derzeitigen ersten Test des Official-Scenario Combat Overlay. Sie fasst die feste Initiative-Unterbrechung, Standard-Attack-Opportunities, deklarierte Techniques, Vicious Opportunity, Adversaries und die wichtigsten Stapelgrenzen zusammen. Der Bereich ist ausdrücklich ungetestetes Homebrew, automatisiert keine Regel und wird nicht mit dem Charakter gespeichert; das offizielle Regelwerk bleibt maßgeblich.

Das Sheet besitzt aktuell bewusst nur eine direkt editierbare Ansicht: Jeder sichtbare Wert kann ohne vorherigen Moduswechsel korrigiert werden. Die Überschrift **Mission** bleibt ein Ein-/Ausklappschalter; das Einklappen blendet lediglich die Oberfläche aus, während aktive Mission und Historie gespeichert bleiben.

Kurze visuelle Effekte bestätigen wichtige Spielaktionen: Eine Ability wird verbraucht oder wieder verfügbar, Current Health sinkt oder steigt, temporäre Boni und Debuffs rasten farblich am Wert ein, neue Conditions werden markiert, und ein abgeschlossener Missionsbericht erhält ein Siegel. Beim Übertragen von Missions-XP werden sowohl der Bericht als auch der Ranger-Wert hervorgehoben. Die Effekte ändern keine Spieldaten und blockieren keine Eingabe. Wenn das Betriebssystem reduzierte Bewegung anfordert, bleiben sie vollständig aus.

## Technik

Die Anwendung besteht aus statischem HTML, CSS und Vanilla JavaScript. `index.html` enthält das Markup, `styles.css` bündelt die Darstellung einschließlich Responsive- und Effektregeln, und `app.js` enthält Zustand, Rendering und Interaktionen. `rules-data.js` stellt die unveränderlichen Auswahlkataloge für Fähigkeiten, Archetypen und Ausrüstung bereit; `scenario-data.js` enthält den ebenfalls unveränderlichen Szenarioindex und `scenario-enemy-data.js` die fest eingebauten, szenariobezogenen Gegnerreferenzen. `persistence.js` kapselt die reine Validierung, Migration und Normalisierung gespeicherter Charakterdaten, während `storage.js` ausschließlich das lokale Character-JSON und dessen Recovery-Kopie verwaltet. Es gibt keine Serverkomponente und keine externen Benutzerkonten.

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
