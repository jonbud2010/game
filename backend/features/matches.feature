# language: de
Funktionalität: Match-System und Liga-Verwaltung
  Als ein Spieler der Football Trading Card Game Anwendung
  Möchte ich an automatisierten Matches und Liga-Wettkämpfen teilnehmen können
  Damit ich gegen andere Spieler antreten und Belohnungen verdienen kann

  Hintergrund:
    Angenommen die Datenbank ist sauber
    Und eine Lobby "Champions Liga" mit 4 Spielern existiert
    Und alle Spieler haben vollständige Teams für alle 3 Spieltage aufgestellt

  Szenario: Liga erfolgreich erstellen
    Angenommen die Lobby "Champions Liga" hat den Status "WAITING"
    Und alle 4 Spieler haben je 3 vollständige Teams
    Wenn die Liga erstellt wird
    Dann sollte die Liga erfolgreich erstellt werden
    Und die Lobby sollte den Status "IN_PROGRESS" erhalten
    Und 18 Matches sollten generiert werden (6 pro Spieltag)
    Und jeder Spieler sollte gegen jeden anderen 3 Mal antreten
    Und alle Matches sollten den Status "PENDING" haben

  Szenario: Liga mit unvollständigen Teams erstellen
    Angenommen ein Spieler hat nur 2 Teams statt 3
    Wenn versucht wird die Liga zu erstellen
    Dann sollte ein 400 Fehler auftreten
    Und die Fehlermeldung sollte "All players must have 3 complete teams" enthalten
    Und keine Liga sollte erstellt werden
    Und die Lobby sollte den Status "WAITING" behalten

  Szenario: Einzelnes Match simulieren
    Angenommen zwei Teams mit folgenden Eigenschaften existieren:
      | Team    | Spieler-Punkte | Chemie-Bonus | Gesamt-Stärke |
      | Team A  | 850           | 98           | 948           |
      | Team B  | 780           | 54           | 834           |
    Wenn das Match zwischen Team A und Team B simuliert wird
    Dann sollte das Match erfolgreich simuliert werden
    Und beide Teams sollten je 100 Torchancen erhalten
    Und Team A sollte eine höhere Torwahrscheinlichkeit haben
    Und ein realistisches Endergebnis sollte generiert werden
    Und das Ergebnis sollte in der Datenbank gespeichert werden

  Szenario: Match mit gleich starken Teams
    Angenommen zwei Teams mit identischer Stärke (900 Punkte) existieren
    Wenn das Match simuliert wird
    Dann sollten beide Teams die gleiche Torwahrscheinlichkeit haben (1%)
    Und das Ergebnis sollte zufällig und ausgeglichen sein
    Und sowohl Siege als auch Unentschieden sollten möglich sein

  Szenario: Match mit extremem Stärke-Unterschied
    Angenommen Team A hat 1200 Punkte und Team B hat 600 Punkte
    Wenn das Match simuliert wird
    Dann sollte Team A eine deutlich höhere Torwahrscheinlichkeit haben
    Und Team A sollte wahrscheinlich das Match gewinnen
    Und das Ergebnis sollte den Stärke-Unterschied widerspiegeln

  Szenario: Kompletten Spieltag simulieren
    Angenommen eine Liga mit 6 Matches für Spieltag 1 existiert
    Wenn Spieltag 1 vollständig simuliert wird
    Dann sollten alle 6 Matches simuliert werden
    Und alle Matches sollten den Status "COMPLETED" haben
    Und die Liga-Tabelle sollte entsprechend aktualisiert werden
    Und alle Spieler sollten 3 Spiele gespielt haben

  Szenario: Gesamte Liga simulieren
    Angenommen eine Liga mit allen 18 Matches existiert
    Wenn die gesamte Liga simuliert wird
    Dann sollten alle 18 Matches simuliert werden
    Und jeder Spieler sollte 9 Spiele gespielt haben
    Und die finale Liga-Tabelle sollte korrekt berechnet werden
    Und die Lobby sollte den Status "FINISHED" erhalten
    Und Belohnungen sollten verteilt werden

  Szenario: Liga-Tabelle korrekt berechnen
    Angenommen folgende Match-Ergebnisse existieren:
      | Spieler A | vs | Spieler B | Ergebnis | Punkte A | Punkte B |
      | Max       | vs | Anna      | 3:1      | 3        | 0        |
      | Max       | vs | Tom       | 1:1      | 1        | 1        |
      | Anna      | vs | Lisa      | 0:2      | 0        | 3        |
      | Tom       | vs | Lisa      | 2:0      | 3        | 0        |
    Wenn die Liga-Tabelle berechnet wird
    Dann sollte die Tabelle folgendermaßen sortiert sein:
      | Platz | Spieler | Punkte | Spiele | Tore | Gegentore | Differenz |
      | 1     | Max     | 4      | 2      | 4    | 2         | +2        |
      | 2     | Lisa    | 3      | 2      | 2    | 2         | 0         |
      | 3     | Tom     | 4      | 2      | 3    | 1         | +2        |
      | 4     | Anna    | 0      | 2      | 1    | 5         | -4        |

  Szenario: Liga-Tabelle bei Punktgleichheit
    Angenommen mehrere Spieler haben die gleiche Punktzahl
    Wenn die Liga-Tabelle berechnet wird
    Dann sollte zuerst nach Punkten sortiert werden
    Und bei Gleichstand nach Torverhältnis
    Und bei weiterem Gleichstand nach geschossenen Toren
    Und die Sortierung sollte korrekt und konsistent sein

  Szenario: Belohnungen nach Liga-Ende verteilen
    Angenommen eine Liga ist beendet
    Und die finale Tabelle steht fest
    Wenn die Belohnungen verteilt werden
    Dann sollte der 1. Platz 250 Münzen erhalten
    Und der 2. Platz sollte 200 Münzen erhalten
    Und der 3. Platz sollte 150 Münzen erhalten
    Und der 4. Platz sollte 100 Münzen erhalten
    Und die Münzen sollten zu den Benutzer-Konten hinzugefügt werden

  Szenario: Liga-Status und Fortschritt abrufen
    Angenommen eine Liga ist teilweise abgeschlossen
    Und 12 von 18 Matches wurden gespielt
    Wenn der Liga-Status abgerufen wird
    Dann sollte der aktuelle Fortschritt angezeigt werden
    Und die aktuelle Tabelle sollte verfügbar sein
    Und die verbleibenden Matches sollten aufgelistet werden
    Und der nächste zu spielende Spieltag sollte identifiziert werden

  Szenario: Match-Details mit Simulation abrufen
    Angenommen ein abgeschlossenes Match existiert
    Wenn die Match-Details abgerufen werden
    Dann sollten folgende Informationen enthalten sein:
      | Information           |
      | Team-Aufstellungen    |
      | Team-Stärken          |
      | Endergebnis           |
      | Torchancen-Verteilung |
      | Tor-Events            |
      | Match-Statistiken     |

  Szenario: Liga-Übersicht für Spieler
    Angenommen ich bin Teilnehmer einer laufenden Liga
    Wenn ich die Liga-Übersicht abrufe
    Dann sollte ich die aktuelle Tabelle sehen
    Und meine eigene Position sollte hervorgehoben sein
    Und die nächsten anstehenden Matches sollten angezeigt werden
    Und meine bisherigen Ergebnisse sollten aufgelistet werden

  Szenario: Match-Verlauf und Ereignisse
    Angenommen ein Match wurde mit detaillierter Simulation durchgeführt
    Wenn ich den Match-Verlauf abrufe
    Dann sollte ich eine chronologische Liste der Ereignisse sehen
    Und jedes Tor sollte mit Torschütze und Minute angezeigt werden
    Und die Chancen-Verteilung sollte visualisiert werden
    Und kritische Spielmomente sollten hervorgehoben werden

  Szenario: Liga ohne ausreichende Spieler starten
    Angenommen eine Lobby hat nur 3 Spieler
    Wenn versucht wird eine Liga zu starten
    Dann sollte ein 400 Fehler auftreten
    Und die Fehlermeldung sollte "Lobby must have exactly 4 players" enthalten
    Und keine Liga sollte erstellt werden

  Szenario: Liga-Neustart nach Abbruch
    Angenommen eine Liga wurde abgebrochen
    Und alle Teams sind noch verfügbar
    Wenn die Liga neu gestartet wird
    Dann sollten alle vorherigen Matches gelöscht werden
    Und neue 18 Matches sollten generiert werden
    Und die Liga-Tabelle sollte zurückgesetzt werden
    Und der Lobby-Status sollte auf "IN_PROGRESS" gesetzt werden

  Szenario: Concurrent Match-Simulation
    Angenommen mehrere Matches sollen gleichzeitig simuliert werden
    Wenn 6 Matches parallel simuliert werden
    Dann sollten alle Simulationen erfolgreich abgeschlossen werden
    Und es sollten keine Datenkonflikte auftreten
    Und die Liga-Tabelle sollte konsistent aktualisiert werden
    Und alle Ergebnisse sollten korrekt gespeichert werden

  Szenario: Liga-Performance mit großen Datenmengen
    Angenommen eine Liga mit komplexen Team-Aufstellungen existiert
    Und jedes Team hat maximale Chemie-Boni
    Wenn die gesamte Liga simuliert wird
    Dann sollte die Simulation in akzeptabler Zeit abgeschlossen werden
    Und alle Berechnungen sollten mathematisch korrekt sein
    Und die Datenbankoperationen sollten effizient durchgeführt werden

  Szenario: Liga-Statistiken und Analysen
    Angenommen eine abgeschlossene Liga existiert
    Wenn Liga-Statistiken abgerufen werden
    Dann sollten folgende Daten verfügbar sein:
      | Statistik                |
      | Durchschnittliche Tore   |
      | Häufigste Ergebnisse     |
      | Beste Offensive          |
      | Beste Defensive          |
      | Team-Stärken-Verteilung  |
      | Chemie-Bonus-Auswirkung  |