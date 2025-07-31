# language: de
Funktionalität: Lobby-Verwaltung
  Als ein Spieler der Football Trading Card Game Anwendung
  Möchte ich Lobbies erstellen und beitreten können
  Damit ich mit genau 3 anderen Spielern eine Liga spielen kann

  Hintergrund:
    Angenommen die Datenbank ist sauber
    Und ich bin als Benutzer angemeldet

  Szenario: Neue Lobby erstellen
    Angenommen ich bin ein angemeldeter Benutzer
    Wenn ich eine neue Lobby erstelle mit folgenden Daten:
      | Name        | Bundesliga Champions |
      | Max Spieler | 4                    |
    Dann sollte die Lobby erfolgreich erstellt werden
    Und ich sollte automatisch der Lobby beitreten
    Und die Lobby sollte den Status "WAITING" haben
    Und ich sollte der einzige Spieler in der Lobby sein
    Und die Lobby sollte in der Lobbyliste erscheinen

  Szenario: Lobby mit ungültigem Namen erstellen
    Angenommen ich bin ein angemeldeter Benutzer
    Wenn ich versuche eine Lobby mit leerem Namen zu erstellen
    Dann sollte ich einen 400 Validierungsfehler erhalten
    Und eine entsprechende Fehlermeldung sollte angezeigt werden
    Und keine Lobby sollte erstellt werden

  Szenario: Lobby mit falscher Spielerzahl erstellen
    Angenommen ich bin ein angemeldeter Benutzer
    Wenn ich versuche eine Lobby mit 3 maximalen Spielern zu erstellen
    Dann sollte ich einen 400 Validierungsfehler erhalten
    Und die Fehlermeldung sollte "Max players must be exactly 4" enthalten

  Szenario: Erfolgreicher Beitritt zu einer Lobby
    Angenommen eine Lobby "Premiere League" mit 1 Spieler existiert
    Und die Lobby hat den Status "WAITING"
    Wenn ich der Lobby beitrete
    Dann sollte ich erfolgreich der Lobby beitreten
    Und die Lobby sollte nun 2 Spieler haben
    Und die Lobby sollte immer noch den Status "WAITING" haben
    Und ich sollte in der Mitgliederliste erscheinen

  Szenario: Beitritt zu einer vollen Lobby
    Angenommen eine Lobby "Champions League" mit 4 Spielern existiert
    Und die Lobby hat den Status "WAITING"
    Wenn ich versuche der Lobby beizutreten
    Dann sollte ich einen 400 Fehler erhalten
    Und die Fehlermeldung sollte "Lobby is full" enthalten
    Und ich sollte nicht der Lobby beitreten

  Szenario: Beitritt zu einer nicht existierenden Lobby
    Angenommen keine Lobby mit der ID "non-existent-id" existiert
    Wenn ich versuche der Lobby "non-existent-id" beizutreten
    Dann sollte ich einen 404 Fehler erhalten
    Und die Fehlermeldung sollte "Lobby not found" enthalten

  Szenario: Beitritt zu einer bereits gestarteten Lobby
    Angenommen eine Lobby "Europa League" mit dem Status "IN_PROGRESS" existiert
    Wenn ich versuche dieser Lobby beizutreten
    Dann sollte ich einen 400 Fehler erhalten
    Und die Fehlermeldung sollte "Cannot join lobby that is not waiting" enthalten

  Szenario: Doppelter Beitritt zur gleichen Lobby
    Angenommen ich bin bereits Mitglied der Lobby "La Liga"
    Wenn ich versuche erneut der Lobby "La Liga" beizutreten
    Dann sollte ich einen 400 Fehler erhalten
    Und die Fehlermeldung sollte "Already a member of this lobby" enthalten
    Und die Anzahl der Spieler sollte unverändert bleiben

  Szenario: Verlassen einer Lobby
    Angenommen ich bin Mitglied der Lobby "Serie A"
    Und die Lobby hat 3 Spieler
    Wenn ich die Lobby verlasse
    Dann sollte ich erfolgreich die Lobby verlassen
    Und die Lobby sollte nur noch 2 Spieler haben
    Und ich sollte nicht mehr in der Mitgliederliste stehen
    Und die Lobby sollte den Status "WAITING" behalten

  Szenario: Verlassen einer Lobby als letzter Spieler
    Angenommen ich bin das einzige Mitglied der Lobby "Ligue 1"
    Wenn ich die Lobby verlasse
    Dann sollte ich erfolgreich die Lobby verlassen
    Und die Lobby sollte gelöscht werden
    Und die Lobby sollte nicht mehr in der Lobbyliste erscheinen

  Szenario: Verlassen einer nicht existierenden Lobby
    Angenommen keine Lobby mit der ID "invalid-lobby-id" existiert
    Wenn ich versuche die Lobby "invalid-lobby-id" zu verlassen
    Dann sollte ich einen 404 Fehler erhalten
    Und die Fehlermeldung sollte "Lobby not found" enthalten

  Szenario: Verlassen einer bereits gestarteten Lobby
    Angenommen ich bin Mitglied einer Lobby mit dem Status "IN_PROGRESS"
    Wenn ich versuche die Lobby zu verlassen
    Dann sollte ich einen 400 Fehler erhalten
    Und die Fehlermeldung sollte "Cannot leave a lobby that is in progress" enthalten

  Szenario: Alle verfügbaren Lobbies abrufen
    Angenommen folgende Lobbies existieren:
      | Name          | Spieler | Status      |
      | Bundesliga    | 2       | WAITING     |
      | Premier League| 4       | IN_PROGRESS |
      | La Liga       | 1       | WAITING     |
      | Serie A       | 3       | WAITING     |
    Wenn ich alle Lobbies abrufe
    Dann sollte ich eine Liste mit 3 Lobbies erhalten
    Und nur Lobbies mit dem Status "WAITING" sollten angezeigt werden
    Und die Lobbies sollten nach Erstellungsdatum sortiert sein (neueste zuerst)
    Und jede Lobby sollte folgende Informationen enthalten:
      | Feld           |
      | ID             |
      | Name           |
      | Aktuelle Spieler |
      | Max Spieler    |
      | Status         |
      | Mitgliederliste |

  Szenario: Lobby-Status-Übergang zu IN_PROGRESS
    Angenommen eine Lobby "World Cup" hat genau 4 Spieler
    Und die Lobby hat den Status "WAITING" 
    Wenn die Liga für diese Lobby gestartet wird
    Dann sollte die Lobby den Status "IN_PROGRESS" haben
    Und die Lobby sollte nicht mehr in der öffentlichen Lobbyliste erscheinen

  Szenario: Lobby-Status-Übergang zu FINISHED
    Angenommen eine Lobby hat den Status "IN_PROGRESS"
    Und alle Liga-Spiele wurden abgeschlossen
    Wenn die Liga beendet wird
    Dann sollte die Lobby den Status "FINISHED" haben
    Und die Belohnungen sollten an die Spieler verteilt werden

  Szenario: Lobby-Details abrufen
    Angenommen ich bin Mitglied der Lobby "Champions Final"
    Wenn ich die Details dieser Lobby abrufe
    Dann sollte ich alle Lobby-Informationen erhalten
    Und die Mitgliederliste sollte alle Spieler mit Beitrittsdatum enthalten
    Und meine eigene Mitgliedschaft sollte erkennbar sein