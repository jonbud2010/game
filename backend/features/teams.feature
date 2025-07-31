# language: de
Funktionalität: Team-Verwaltung
  Als ein Spieler der Football Trading Card Game Anwendung
  Möchte ich Teams erstellen und Spieler Formationen zuweisen können
  Damit ich an Liga-Wettkämpfen teilnehmen kann

  Hintergrund:
    Angenommen die Datenbank ist sauber
    Und ich bin als Benutzer angemeldet
    Und ich bin Mitglied einer Lobby "Test Liga"
    Und gültige Formationen und Spieler existieren

  Szenario: Neues Team erfolgreich erstellen
    Angenommen ich habe keine Teams für die aktuelle Lobby
    Und eine Formation "4-3-3" existiert
    Wenn ich ein neues Team erstelle mit:
      | Name         | FC Champions    |
      | Formation    | 4-3-3          |
      | Spieltag     | 1              |
    Dann sollte das Team erfolgreich erstellt werden
    Und das Team sollte in der Datenbank gespeichert werden
    Und das Team sollte der aktuellen Lobby zugeordnet werden
    Und alle 11 Positionen sollten zunächst leer sein

  Szenario: Team für alle 3 Spieltage erstellen
    Angenommen ich habe keine Teams für die aktuelle Lobby
    Und eine Formation "4-4-2" existiert
    Wenn ich Teams für alle 3 Spieltage erstelle:
      | Spieltag | Team Name      |
      | 1        | Spieltag 1 FC  |
      | 2        | Spieltag 2 FC  |
      | 3        | Spieltag 3 FC  |
    Dann sollten alle 3 Teams erfolgreich erstellt werden
    Und jedes Team sollte dem entsprechenden Spieltag zugeordnet werden
    Und ich sollte insgesamt 3 Teams haben

  Szenario: Team für bereits existierenden Spieltag erstellen
    Angenommen ich habe bereits ein Team für Spieltag 1
    Wenn ich versuche ein weiteres Team für Spieltag 1 zu erstellen
    Dann sollte ich einen 400 Fehler erhalten
    Und die Fehlermeldung sollte "Team for this matchday already exists" enthalten
    Und kein zusätzliches Team sollte erstellt werden

  Szenario: Team mit ungültigen Daten erstellen
    Angenommen ich möchte ein Team erstellen
    Wenn ich versuche ein Team mit ungültigen Daten zu erstellen:
      | Name         |                    |
      | Formation    | nonexistent-form   |
      | Spieltag     | 5                  |
    Dann sollte ich einen 400 Validierungsfehler erhalten
    Und eine detaillierte Fehlermeldung sollte angezeigt werden
    Und kein Team sollte erstellt werden

  Szenario: Spieler erfolgreich zu Team hinzufügen
    Angenommen ich habe ein Team "My Team" mit Formation "4-3-3"
    Und ich besitze einen Spieler "Lionel Messi" (Position: RW)
    Und die Formation hat eine RW-Position an Index 10
    Wenn ich "Lionel Messi" auf Position 10 setze
    Dann sollte der Spieler erfolgreich zugeordnet werden
    Und Position 10 sollte "Lionel Messi" enthalten
    Und der Spieler sollte als "verwendet" markiert werden
    Und die Team-Stärke sollte aktualisiert werden

  Szenario: Spieler auf falsche Position setzen
    Angenommen ich habe ein Team mit Formation "4-4-2"
    Und ich besitze einen Torwart "Manuel Neuer" (Position: GK)
    Und ich versuche ihn auf eine ST-Position zu setzen
    Wenn ich den Torwart auf die Stürmer-Position setze
    Dann sollte ich einen 400 Fehler erhalten
    Und die Fehlermeldung sollte "Player position does not match formation position" enthalten
    Und der Spieler sollte nicht zugeordnet werden

  Szenario: Bereits verwendeten Spieler zuordnen
    Angenommen ich habe zwei Teams für verschiedene Spieltage
    Und "Cristiano Ronaldo" ist bereits in Team 1 zugeordnet
    Wenn ich versuche "Cristiano Ronaldo" auch in Team 2 zu setzen
    Dann sollte ich einen 400 Fehler erhalten
    Und die Fehlermeldung sollte "Player is already assigned to another team" enthalten
    Und der Spieler sollte nicht doppelt zugeordnet werden

  Szenario: Spieler aus Team entfernen
    Angenommen mein Team "Dream Team" hat "Neymar" auf Position 9
    Wenn ich "Neymar" aus dem Team entferne
    Dann sollte Position 9 wieder leer sein
    Und "Neymar" sollte als "verfügbar" markiert werden
    Und die Team-Stärke sollte entsprechend reduziert werden
    Und der Spieler sollte wieder für andere Teams verwendbar sein

  Szenario: Vollständiges Team mit gültiger Chemie aufstellen
    Angenommen ich habe ein Team "Chemistry Team"
    Und ich besitze 11 Spieler mit folgenden Farben:
      | Position | Spieler   | Farbe  |
      | GK       | Neuer     | blue   |
      | CB       | Ramos     | red    |
      | CB       | Varane    | red    |
      | LB       | Alba      | blue   |
      | RB       | Carvajal  | red    |
      | CM       | Modric    | green  |
      | CM       | Kroos     | green  |
      | CAM      | Özil      | blue   |
      | LW       | Hazard    | green  |
      | RW       | Salah     | red    |
      | ST       | Benzema   | red    |
    Wenn ich alle Spieler auf die entsprechenden Positionen setze
    Dann sollte das Team vollständig besetzt sein
    Und die Chemie sollte gültig sein (3 Farben, je min. 2 Spieler)
    Und der Chemie-Bonus sollte berechnet werden
    Und die Gesamt-Team-Stärke sollte korrekt kalkuliert werden

  Szenario: Team mit ungültiger Chemie aufstellen
    Angenommen ich habe ein Team "Bad Chemistry"
    Und ich setze Spieler mit nur 2 verschiedenen Farben ein
    Wenn ich die Team-Aufstellung abschließe
    Dann sollte eine Chemie-Warnung angezeigt werden
    Und das Team sollte keinen Chemie-Bonus erhalten
    Und die Team-Stärke sollte nur aus Spieler-Punkten bestehen

  Szenario: Team-Aufstellung automatisch mit Dummy-Spielern füllen
    Angenommen ich habe ein Team mit nur 8 zugewiesenen Spielern
    Und die Liga ist bereit zu starten
    Wenn die automatische Team-Vervollständigung aktiviert wird
    Dann sollten die 3 leeren Positionen mit 0-Punkt Dummy-Spielern gefüllt werden
    Und das Team sollte spielbereit sein
    Und die Team-Stärke sollte entsprechend berechnet werden

  Szenario: Team erfolgreich aktualisieren
    Angenommen ich habe ein Team "Update Team"
    Wenn ich das Team aktualisiere mit:
      | Name      | Updated Team Name |
      | Formation | 3-5-2            |
    Dann sollte das Team erfolgreich aktualisiert werden
    Und der neue Name sollte gespeichert werden
    Und bei Formation-Änderung sollten Spieler-Zuordnungen validiert werden
    Und ungültige Positionen sollten geleert werden

  Szenario: Formation eines Teams ändern
    Angenommen ich habe ein Team mit Formation "4-3-3" und zugewiesenen Spielern
    Wenn ich die Formation zu "3-5-2" ändere
    Dann sollten alle Spieler-Zuordnungen überprüft werden
    Und Spieler auf nicht mehr existierenden Positionen sollten entfernt werden
    Und entfernte Spieler sollten wieder verfügbar werden
    Und gültige Positionen sollten beibehalten werden

  Szenario: Alle meine Teams abrufen
    Angenommen ich habe Teams für verschiedene Lobbies und Spieltage
    Wenn ich alle meine Teams für eine bestimmte Lobby abrufe
    Dann sollte ich alle Teams dieser Lobby erhalten
    Und die Teams sollten nach Spieltag sortiert sein
    Und jedes Team sollte die vollständigen Spieler-Informationen enthalten
    Und die berechnete Team-Stärke sollte enthalten sein

  Szenario: Team-Details mit Statistiken abrufen
    Angenommen ich habe ein vollständig aufgestelltes Team
    Wenn ich die Team-Details abrufe
    Dann sollte ich folgende Informationen erhalten:
      | Information          |
      | Team-Name           |
      | Formation           |
      | Spieler-Aufstellung |
      | Gesamt-Punkte       |
      | Chemie-Bonus        |
      | Team-Stärke         |
      | Farb-Verteilung     |
      | Positions-Abdeckung |

  Szenario: Team löschen
    Angenommen ich habe ein Team "Delete Team" für Spieltag 2
    Und das Team ist noch nicht in der Liga verwendet
    Wenn ich das Team lösche
    Dann sollte das Team erfolgreich gelöscht werden
    Und alle Spieler-Zuordnungen sollten aufgehoben werden
    Und die Spieler sollten wieder verfügbar werden
    Und ich sollte wieder ein neues Team für Spieltag 2 erstellen können

  Szenario: Team während laufender Liga nicht löschen
    Angenommen ich habe ein Team in einer aktiven Liga
    Und die Liga hat bereits begonnen
    Wenn ich versuche das Team zu löschen
    Dann sollte ich einen 400 Fehler erhalten
    Und die Fehlermeldung sollte "Cannot delete team during active league" enthalten
    Und das Team sollte nicht gelöscht werden

  Szenario: Verfügbare Spieler für Team-Aufstellung abrufen
    Angenommen ich habe mehrere Teams und verschiedene Spieler
    Und einige Spieler sind bereits in anderen Teams zugeordnet
    Wenn ich verfügbare Spieler für ein neues Team abrufe
    Dann sollte ich nur nicht zugewiesene Spieler erhalten
    Und die Spieler sollten nach Position gefiltert werden können
    Und bereits verwendete Spieler sollten ausgeschlossen sein

  Szenario: Team-Validierung vor Liga-Start
    Angenommen ich habe 3 Teams für alle Spieltage erstellt
    Und die Liga ist bereit zu starten
    Wenn die Team-Validierung durchgeführt wird
    Dann sollten alle Teams auf Vollständigkeit geprüft werden
    Und Teams mit weniger als 11 Spielern sollten automatisch gefüllt werden
    Und die Chemie sollte für jedes Team berechnet werden
    Und nur gültige Teams sollten zur Liga zugelassen werden