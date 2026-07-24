# Rangers of Shadow Deep – Digital Character Sheet

Ein inoffizieller, webbasierter Charakterbogen für *Rangers of Shadow Deep*. Das Tool ist für Smartphone, Tablet und Desktop gedacht und unterstützt die Buchhaltung direkt am Spieltisch.

## Funktionen

- Ranger-Werte, Ausrüstung und Quest-Notizen verwalten
- Heroic Abilities und Spells auswählen und ihre Nutzung markieren
- Archetypen mit Traits und Einschränkungen anzeigen
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

## Technik

Die Anwendung besteht aus statischem HTML, CSS und Vanilla JavaScript. Es gibt keine Serverkomponente und keine externen Benutzerkonten.

## Hinweis zum Spiel

Dies ist ein nicht kommerzielles Fan-Projekt und steht in keiner Verbindung zu Joseph A. McCullough, Modiphius Entertainment oder anderen Rechteinhabern. *Rangers of Shadow Deep* sowie zugehörige Namen und Spielinhalte gehören ihren jeweiligen Rechteinhabern. Zum Spielen wird das offizielle Regelwerk benötigt.

Weitere Informationen zum Spiel gibt es auf der [offiziellen Rangers-of-Shadow-Deep-Seite von Modiphius](https://modiphius.net/en-us/collections/rangers-of-shadow-deep).

## Lizenz

Für den Quellcode wurde noch keine allgemeine Wiederverwendungslizenz festgelegt. Spielnamen, Regeltexte und sonstige Inhalte Dritter sind von einer zukünftigen Code-Lizenz nicht umfasst.
