⚔️ Rangers of Shadow Deep - Digital Character Sheet
Dieses Projekt ist ein interaktiver, webbasierter Charakterbogen für das Tabletop-Spiel Rangers of Shadow Deep. Es wurde entwickelt, um den klassischen Papierbogen durch eine mobile, performante und atmosphärische digitale Lösung zu ersetzen.

📜 Projekt-Kontext & Vision
Das Ziel war es, ein Tool zu schaffen, das:

Geräteunabhängig funktioniert (Smartphone am Spieltisch, Tablet oder PC).

Keine Serverkosten verursacht (Hosting via GitHub Pages).

Atmosphärisch wirkt (Dark-Fantasy-Design in Grün-Türkis mit "Cinzel"-Schriftart).

Regel-Unterstützung bietet, ohne den Spieler zu bevormunden.

🚀 Entwicklung & Evolution
Das Projekt ist organisch gewachsen:

Basis-Sheet: Einfache Eingabefelder für Stats (Move, Fight, etc.).

Persistence: Integration von localStorage für automatisches Speichern im Browser.

Magische Interaktion: Einführung von "runischen Toggles" für Heroic Abilities, um die einmalige Nutzung pro Szenario visuell zu tracken.

Regel-Bibliothek: Integration von Dropdowns für Fähigkeiten und Zauber inklusive dynamischer Regelbeschreibungen.

Archetypen-System: Unterstützung für die Erweiterung A Gathering of Heroes mit aufklappbaren Traits und Limitations.

Data-Portability: Implementierung eines JSON-basierten Export/Import-Systems für Backups und Gerätewechsel.

🛠 Technische Struktur (für KI-Editoren)
Dieser Bogen ist als Single Page Application (SPA) in einer einzigen Datei (index.html) realisiert.

Technologien: HTML5, CSS3 (Flexbox/Grid), Vanilla JavaScript.

Speicherung: Nutzt den STORAGE_KEY = 'rosd_ranger_v_archetypes' im localStorage.

Daten-Format: Exportiert/Importiert JSON-Objekte, die alle id-Werte der save-field-Klasse enthalten.

Erweiterbarkeit:

Abilities/Spells: Können im Objekt ABILITY_LIBRARY (JavaScript-Teil) ergänzt werden.

Archetypen: Neue Klassen können im Objekt ARCHETYPE_LIBRARY mit ihren spezifischen traits und limits hinzugefügt werden.

📖 Benutzung für Spieler
Initialisierung: Name und Stats eingeben. Archetyp wählen, falls vorhanden.

Tracking: Während der Session Lebenspunkte (Current) und verbrauchte Runen bei den Abilities anklicken.

Backup: Nach dem Spiel via "Save Character File" eine .json Datei herunterladen. Der Dateiname wird automatisch aus Name + Zeitstempel generiert (z.B. RoSD_Verus_22-02_1430.json).

Gerätewechsel: JSON auf neuem Gerät via "Load Character File" hochladen.