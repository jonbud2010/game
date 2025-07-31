# language: de
Funktionalität: Chemie-System
  Als ein Spieler der Football Trading Card Game Anwendung
  Möchte ich durch strategische Farbkombinationen Chemie-Boni erhalten
  Damit meine Teams stärker werden und bessere Match-Ergebnisse erzielen

  Hintergrund:
    Angenommen die Datenbank ist sauber
    Und ich bin als Benutzer angemeldet
    Und verschiedene Spieler mit unterschiedlichen Farben existieren

  Szenario: Gültige Chemie mit minimalen Anforderungen
    Angenommen ich habe ein 11-Spieler Team mit folgenden Farben:
      | Farbe        | Anzahl Spieler |
      | rot          | 4              |
      | dunkelblau   | 4              |
      | hellgruen    | 3              |
    Wenn die Chemie berechnet wird
    Dann sollte die Chemie gültig sein
    Und der Chemie-Bonus sollte berechnet werden als:
      | Farbe        | Spieler | Bonus (n²) |
      | rot          | 4       | 16         |
      | dunkelblau   | 4       | 16         |
      | hellgruen    | 3       | 9          |
    Und der Gesamt-Chemie-Bonus sollte 41 Punkte betragen

  Szenario: Maximale Chemie mit optimaler Verteilung
    Angenommen ich habe ein Team mit perfekter Farb-Verteilung (genau 3 Farben):
      | Farbe      | Anzahl Spieler |
      | rot        | 4              |
      | gelb       | 4              |
      | lila       | 3              |
    Wenn die Chemie berechnet wird
    Dann sollte die Chemie gültig sein
    Und der Chemie-Bonus sollte 41 Punkte betragen (16 + 16 + 9)
    Und alle 3 verwendeten Farben sollten Boni generieren

  Szenario: Ungültige Chemie - zu wenige Farben
    Angenommen ich habe ein Team mit nur 2 Farben:
      | Farbe        | Anzahl Spieler |
      | dunkelgruen  | 6              |
      | hellblau     | 5              |
    Wenn die Chemie berechnet wird
    Dann sollte die Chemie ungültig sein
    Und der Chemie-Bonus sollte 0 betragen
    Und eine Warnung sollte ausgegeben werden: "Team muss genau 3 verschiedene Farben haben"

  Szenario: Ungültige Chemie - zu viele Farben
    Angenommen ich habe ein Team mit 4 verschiedenen Farben:
      | Farbe        | Anzahl Spieler |
      | rot          | 3              |
      | dunkelblau   | 3              |
      | hellgruen    | 3              |
      | orange       | 2              |
    Wenn die Chemie berechnet wird
    Dann sollte die Chemie ungültig sein
    Und der Chemie-Bonus sollte 0 betragen
    Und eine Warnung sollte ausgegeben werden: "Team muss genau 3 verschiedene Farben haben"

  Szenario: Optimale Chemie-Verteilungen
    Angenommen ich teste verschiedene 3-Farben Kombinationen:
      | Verteilung | rot | gelb | lila | Erwarteter Bonus |
      | 4-4-3     | 4   | 4    | 3    | 41              |
      | 5-3-3     | 5   | 3    | 3    | 43              |
      | 4-3-4     | 4   | 3    | 4    | 41              |
      | 3-4-4     | 3   | 4    | 4    | 41              |
    Wenn die Chemie für jede Konfiguration berechnet wird
    Dann sollten alle Kombinationen gültig sein
    Und die Boni sollten entsprechend der Quadratformel berechnet werden
    Und die 5-3-3 Verteilung sollte optimal sein (43 Punkte)

  Szenario: Quadratische Bonus-Berechnung validieren
    Angenommen ich teste verschiedene Spieleranzahlen pro Farbe:
      | Spieler pro Farbe | Erwarteter Bonus |
      | 2                | 4               |
      | 3                | 9               |
      | 4                | 16              |
      | 5                | 25              |
      | 6                | 36              |
      | 7                | 49              |
    Wenn die Chemie für jede Konfiguration berechnet wird
    Dann sollten die Boni exakt der Formel n² entsprechen
    Und die Berechnungen sollten mathematisch korrekt sein

  Szenario: Chemie-Validierung bei Team-Aufstellung
    Angenommen ich stelle ein Team zusammen
    Und ich füge Spieler schrittweise hinzu:
      | Schritt | Spieler-Farbe | Farben im Team | Status              |
      | 1       | rot          | 1             | Ungültig (zu wenige)|
      | 2       | rot          | 1             | Ungültig (zu wenige)|
      | 3       | dunkelblau   | 2             | Ungültig (zu wenige)|
      | 4       | dunkelblau   | 2             | Ungültig (zu wenige)|
      | 5       | hellgruen    | 3             | Gültig (genau 3)    |
      | 6       | hellgruen    | 3             | Gültig (genau 3)    |
      | 7       | orange       | 4             | Ungültig (zu viele) |
    Dann sollte die Chemie-Validierung bei jedem Schritt korrekt sein
    Und nur bei genau 3 Farben sollte das Team gültig sein

  Szenario: Optimale Chemie-Strategie berechnen
    Angenommen ich habe folgende verfügbare Spieler:
      | Farbe        | Verfügbare Spieler | Qualität |
      | dunkelgruen  | 5                 | Hoch     |
      | hellblau     | 4                 | Mittel   |
      | lila         | 3                 | Niedrig  |
      | orange       | 2                 | Hoch     |
    Wenn ich die optimale 11-Spieler Auswahl für maximale Chemie berechne (genau 3 Farben)
    Dann sollte die beste Kombination sein:
      | Farbe        | Empfohlene Anzahl | Begründung           |
      | dunkelgruen  | 5                | Alle verfügbar, beste Qualität |
      | hellblau     | 3                | Erfüllt Minimum      |
      | lila         | 3                | Erfüllt Minimum      |
    Und der theoretische Max-Bonus sollte 43 Punkte betragen (25 + 9 + 9)

  Szenario: Chemie-Bonus in Team-Stärke integrieren
    Angenommen ein Team hat folgende Eigenschaften:
      | Spieler-Punkte Gesamt | 850   |
      | Chemie-Bonus         | 45    |
    Wenn die Gesamt-Team-Stärke berechnet wird
    Dann sollte die Team-Stärke 895 Punkte betragen
    Und der Chemie-Bonus sollte klar ausgewiesen werden
    Und beide Komponenten sollten in Match-Berechnungen einfließen

  Szenario: Chemie-Auswirkung auf Match-Wahrscheinlichkeiten
    Angenommen zwei Teams treten gegeneinander an:
      | Team     | Spieler-Punkte | Chemie | Gesamt |
      | Team A   | 800           | 60     | 860    |
      | Team B   | 850           | 0      | 850    |
    Wenn die Match-Wahrscheinlichkeiten berechnet werden
    Dann sollte Team A trotz niedrigerer Spieler-Punkte bevorzugt sein
    Und der Chemie-Bonus sollte die Wahrscheinlichkeiten beeinflussen
    Und die Stärke-Differenz sollte 10 Punkte betragen

  Szenario: Chemie-Feedback für Spieler
    Angenommen ich habe ein Team mit suboptimaler Chemie aufgestellt
    Wenn ich Chemie-Feedback anfordere
    Dann sollte ich folgende Informationen erhalten:
      | Information                     |
      | Aktuelle Chemie-Gültigkeit      |
      | Gesamt-Chemie-Bonus            |
      | Farb-Verteilung                |
      | Verbesserungsvorschläge        |
      | Potentieller Max-Bonus         |
      | Problematische Farben          |

  Szenario: Chemie-Berechnung bei unvollständigen Teams
    Angenommen ich habe ein Team mit nur 8 von 11 Spielern
    Und die Farb-Verteilung ist:
      | Farbe      | Anzahl |
      | rot        | 3      |
      | hellblau   | 3      |
      | dunkelgruen| 2      |
    Wenn die Chemie berechnet wird
    Dann sollte die aktuelle Chemie basierend auf 8 Spielern berechnet werden
    Und der Bonus sollte 22 Punkte betragen (9 + 9 + 4)
    Und eine Warnung über unvollständiges Team sollte ausgegeben werden

  Szenario: Chemie-Persistierung in Datenbank
    Angenommen ich speichere ein Team mit berechnetem Chemie-Bonus
    Wenn das Team aus der Datenbank abgerufen wird
    Dann sollte der Chemie-Bonus korrekt gespeichert sein
    Und die Farb-Verteilung sollte rekonstruierbar sein
    Und die Berechnungen sollten reproduzierbar sein

  Szenario: Chemie-Performance bei großen Teams
    Angenommen ich teste die Chemie-Berechnung mit 1000 verschiedenen Team-Konfigurationen
    Wenn alle Berechnungen durchgeführt werden
    Dann sollten alle Berechnungen in akzeptabler Zeit abgeschlossen werden
    Und alle Ergebnisse sollten mathematisch konsistent sein  
    Und keine Memory-Leaks sollten auftreten

  Szenario: Edge-Case: Alle Spieler gleiche Farbe
    Angenommen alle 11 Spieler haben die Farbe "rot"
    Wenn die Chemie berechnet wird
    Dann sollte die Chemie ungültig sein
    Und der Chemie-Bonus sollte 0 betragen
    Und eine Warnung sollte ausgegeben werden: "Team muss genau 3 verschiedene Farben haben"

  Szenario: Edge-Case: Zu viele verschiedene Farben
    Angenommen ich habe ein Team mit 5 verschiedenen Farben:
      | Farbe        | Anzahl |
      | rot          | 3      |
      | dunkelblau   | 2      |
      | hellgruen    | 2      |
      | gelb         | 2      |
      | lila         | 2      |
    Wenn die Chemie berechnet wird
    Dann sollte die Chemie ungültig sein
    Und kein Chemie-Bonus sollte gewährt werden
    Und eine Warnung sollte ausgegeben werden: "Team muss genau 3 verschiedene Farben haben"

  Szenario: Chemie-System Regressionstests
    Angenommen bekannte Team-Konfigurationen mit erwarteten Ergebnissen existieren
    Wenn alle Regressionstests durchgeführt werden
    Dann sollten alle historischen Berechnungen weiterhin korrekt sein
    Und keine Änderungen in der Chemie-Logik sollten unerwartete Ergebnisse produzieren
    Und die Konsistenz des Systems sollte gewährleistet sein