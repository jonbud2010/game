# language: de
Funktionalität: Spieler-Verwaltung
  Als ein Administrator der Football Trading Card Game Anwendung
  Möchte ich Fußballspieler erstellen, bearbeiten und verwalten können
  Damit die Benutzer Spielerkarten sammeln und Teams bilden können

  Hintergrund:
    Angenommen die Datenbank ist sauber
    Und ich bin als Administrator angemeldet

  Szenario: Neuen Spieler erfolgreich erstellen
    Angenommen ich bin ein Administrator
    Wenn ich einen neuen Spieler erstelle mit folgenden Daten:
      | Name         | Lionel Messi        |
      | Punkte       | 95                  |
      | Position     | RW                  |
      | Farbe        | red                 |
      | Marktpreis   | 500                 |
      | Thema        | Legends             |
      | Prozentsatz  | 0.02                |
    Dann sollte der Spieler erfolgreich erstellt werden
    Und der Spieler sollte in der Datenbank gespeichert werden
    Und der Spieler sollte eine eindeutige ID erhalten
    Und alle Attribute sollten korrekt gespeichert werden

  Szenario: Spieler mit Bildupload erstellen
    Angenommen ich bin ein Administrator
    Und ich habe ein gültiges Spielerbild (JPG/PNG, <5MB)
    Wenn ich einen Spieler mit Bildupload erstelle:
      | Name     | Cristiano Ronaldo |
      | Punkte   | 94                |
      | Position | ST                |
      | Farbe    | blue              |
      | Bild     | ronaldo.jpg       |
    Dann sollte der Spieler erfolgreich erstellt werden
    Und das Bild sollte zu WebP konvertiert werden
    Und das Bild sollte auf 400x400px skaliert werden
    Und die Bild-URL sollte im Spieler gespeichert werden
    Und das Originalbild sollte gelöscht werden

  Szenario: Spieler mit ungültigen Daten erstellen
    Angenommen ich bin ein Administrator
    Wenn ich versuche einen Spieler mit ungültigen Daten zu erstellen:
      | Name         |              |
      | Punkte       | -10          |
      | Position     | INVALID_POS  |
      | Farbe        | rainbow      |
      | Marktpreis   | -50          |
      | Prozentsatz  | 1.5          |
    Dann sollte ich einen 400 Validierungsfehler erhalten
    Und eine detaillierte Fehlermeldung sollte angezeigt werden
    Und kein Spieler sollte erstellt werden

  Szenario: Spieler mit ungültigem Bildformat erstellen
    Angenommen ich bin ein Administrator
    Wenn ich versuche einen Spieler mit einer GIF-Datei zu erstellen
    Dann sollte ich einen 400 Fehler erhalten
    Und die Fehlermeldung sollte "Only JPEG and PNG images are allowed" enthalten
    Und kein Spieler sollte erstellt werden

  Szenario: Spieler mit zu großem Bild erstellen
    Angenommen ich bin ein Administrator
    Und ich habe ein Bild das größer als 5MB ist
    Wenn ich versuche einen Spieler mit diesem Bild zu erstellen
    Dann sollte ich einen 400 Fehler erhalten
    Und die Fehlermeldung sollte die Größenbeschränkung erwähnen

  Szenario: Alle Spieler abrufen
    Angenommen folgende Spieler existieren:
      | Name         | Punkte | Position | Farbe  |
      | Messi        | 95     | RW       | red    |
      | Ronaldo      | 94     | ST       | blue   |
      | Neymar       | 89     | LW       | green  |
      | Mbappé       | 91     | ST       | purple |
    Wenn ich alle Spieler abrufe
    Dann sollte ich eine Liste mit 4 Spielern erhalten
    Und die Spieler sollten nach Punkten absteigend sortiert sein
    Und die Antwort sollte die Gesamtanzahl enthalten

  Szenario: Spieler nach Position filtern
    Angenommen Spieler mit verschiedenen Positionen existieren
    Wenn ich Spieler mit der Position "ST" abrufe
    Dann sollte ich nur Stürmer erhalten
    Und andere Positionsspieler sollten nicht enthalten sein

  Szenario: Spieler nach Farbe filtern
    Angenommen Spieler mit verschiedenen Farben existieren
    Wenn ich Spieler mit der Farbe "red" abrufe
    Dann sollte ich nur rote Spieler erhalten
    Und die Filterung sollte exakt sein

  Szenario: Spieler nach Punktebereich filtern
    Angenommen Spieler mit verschiedenen Punktzahlen existieren
    Wenn ich Spieler mit mindestens 90 und höchstens 95 Punkten abrufe
    Dann sollten nur Spieler in diesem Bereich zurückgegeben werden
    Und Spieler außerhalb des Bereichs sollten ausgeschlossen werden

  Szenario: Spieler nach Preisbereich filtern
    Angenommen Spieler mit verschiedenen Marktpreisen existieren
    Wenn ich Spieler mit einem Preis bis maximal 300 Münzen abrufe
    Dann sollten nur erschwingliche Spieler zurückgegeben werden

  Szenario: Kombination mehrerer Filter
    Angenommen verschiedene Spieler existieren
    Wenn ich Spieler filtere nach:
      | Position    | ST    |
      | Farbe       | blue  |
      | Min Punkte  | 85    |
      | Max Preis   | 400   |
    Dann sollten nur Spieler zurückgegeben werden die alle Kriterien erfüllen

  Szenario: Einzelnen Spieler abrufen
    Angenommen ein Spieler "Karim Benzema" mit der ID "player-123" existiert
    Wenn ich den Spieler mit der ID "player-123" abrufe
    Dann sollte ich die vollständigen Spielerdaten erhalten
    Und die Antwort sollte UserPlayers und PackPlayers Beziehungen enthalten

  Szenario: Nicht existierenden Spieler abrufen
    Angenommen kein Spieler mit der ID "invalid-id" existiert
    Wenn ich versuche den Spieler "invalid-id" abzurufen
    Dann sollte ich einen 404 Fehler erhalten
    Und die Fehlermeldung sollte "Player not found" enthalten

  Szenario: Spieler erfolgreich aktualisieren
    Angenommen ein Spieler "Robert Lewandowski" existiert
    Wenn ich den Spieler aktualisiere mit:
      | Name         | Robert Lewandowski |
      | Punkte       | 93                 |
      | Marktpreis   | 450                |
      | Prozentsatz  | 0.03               |
    Dann sollte der Spieler erfolgreich aktualisiert werden
    Und die neuen Werte sollten gespeichert werden
    Und das Aktualisierungsdatum sollte gesetzt werden

  Szenario: Spieler mit neuem Bild aktualisieren
    Angenommen ein Spieler existiert
    Und ich habe ein neues gültiges Spielerbild
    Wenn ich den Spieler mit dem neuen Bild aktualisiere
    Dann sollte das alte Bild gelöscht werden
    Und das neue Bild sollte verarbeitet und gespeichert werden
    Und die neue Bild-URL sollte im Spieler gespeichert werden

  Szenario: Nicht existierenden Spieler aktualisieren
    Angenommen kein Spieler mit der ID "invalid-player" existiert
    Wenn ich versuche den Spieler "invalid-player" zu aktualisieren
    Dann sollte ich einen 404 Fehler erhalten
    Und keine Änderungen sollten vorgenommen werden

  Szenario: Spieler erfolgreich löschen
    Angenommen ein Spieler "Old Player" existiert
    Und der Spieler ist in keinen Packs oder Teams verwendet
    Wenn ich den Spieler lösche
    Dann sollte der Spieler erfolgreich gelöscht werden
    Und das zugehörige Bild sollte gelöscht werden
    Und der Spieler sollte nicht mehr in der Datenbank existieren

  Szenario: Nicht existierenden Spieler löschen
    Angenommen kein Spieler mit der ID "nonexistent" existiert
    Wenn ich versuche den Spieler "nonexistent" zu löschen
    Dann sollte ich einen 404 Fehler erhalten
    Und die Fehlermeldung sollte "Player not found" enthalten

  Szenario: Spieler-Erstellung ohne Admin-Berechtigung
    Angenommen ich bin als normaler Benutzer (USER) angemeldet
    Wenn ich versuche einen neuen Spieler zu erstellen
    Dann sollte ich einen 403 Fehler erhalten
    Und die Fehlermeldung sollte "Admin access required" enthalten
    Und kein Spieler sollte erstellt werden

  Szenario: Alle gültigen Positionen testen
    Angenommen ich bin ein Administrator
    Wenn ich Spieler mit allen gültigen Positionen erstelle:
      | GK | CB | LB | RB | CDM | CM | CAM | LM | RM | LW | RW | ST | CF | LF | RF |
    Dann sollten alle Spieler erfolgreich erstellt werden
    Und jede Position sollte korrekt validiert werden

  Szenario: Alle gültigen Farben testen
    Angenommen ich bin ein Administrator
    Wenn ich Spieler mit allen gültigen Farben erstelle:
      | red | blue | green | yellow | purple | orange | pink | cyan | lime | indigo |
    Dann sollten alle Spieler erfolgreich erstellt werden
    Und jede Farbe sollte korrekt validiert werden