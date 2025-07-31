# language: de
Funktionalität: Pack-System
  Als ein Administrator und Spieler der Football Trading Card Game Anwendung
  Möchte ich Packs erstellen, verwalten und öffnen können
  Damit Spieler Karten sammeln und ihre Sammlungen aufbauen können

  Hintergrund:
    Angenommen die Datenbank ist sauber
    Und mehrere Spieler in der Datenbank existieren

  Szenario: Neuen Pack als Administrator erstellen
    Angenommen ich bin als Administrator angemeldet
    Wenn ich einen neuen Pack erstelle mit folgenden Daten:
      | Name        | Premium Pack    |
      | Preis       | 100             |
      | Status      | ACTIVE          |
    Dann sollte der Pack erfolgreich erstellt werden
    Und der Pack sollte in der Datenbank gespeichert werden
    Und der Pack sollte eine eindeutige ID erhalten
    Und der Pack sollte anfangs einen leeren Spielerpool haben

  Szenario: Pack mit Bildupload erstellen
    Angenommen ich bin als Administrator angemeldet
    Und ich habe ein gültiges Pack-Bild (JPG/PNG, <5MB)
    Wenn ich einen Pack mit Bildupload erstelle:
      | Name     | Gold Pack     |
      | Preis    | 200           |
      | Bild     | goldpack.jpg  |
    Dann sollte der Pack erfolgreich erstellt werden
    Und das Bild sollte zu WebP konvertiert werden 
    Und das Bild sollte auf 300x300px skaliert werden
    Und die Bild-URL sollte im Pack gespeichert werden

  Szenario: Pack mit ungültigen Daten erstellen
    Angenommen ich bin als Administrator angemeldet
    Wenn ich versuche einen Pack mit ungültigen Daten zu erstellen:
      | Name     |        |
      | Preis    | -50    |
      | Status   | WRONG  |
    Dann sollte ich einen 400 Validierungsfehler erhalten
    Und eine detaillierte Fehlermeldung sollte angezeigt werden
    Und kein Pack sollte erstellt werden

  Szenario: Spieler zu Pack hinzufügen
    Angenommen ein Pack "Starter Pack" existiert
    Und ein Spieler "Lionel Messi" mit 5% Prozentsatz existiert
    Und ich bin als Administrator angemeldet
    Wenn ich den Spieler "Lionel Messi" zum Pack "Starter Pack" hinzufüge
    Dann sollte der Spieler erfolgreich zum Pack hinzugefügt werden
    Und der Spielerpool sollte den Spieler enthalten
    Und die Wahrscheinlichkeitsberechnung sollte aktualisiert werden

  Szenario: Mehrere Spieler zu Pack hinzufügen
    Angenommen ein Pack "Ultimate Pack" existiert
    Und folgende Spieler existieren:
      | Name         | Prozentsatz |
      | Messi        | 0.02        |
      | Ronaldo      | 0.02        |
      | Neymar       | 0.05        |
      | Mbappé       | 0.03        |
    Und ich bin als Administrator angemeldet
    Wenn ich alle Spieler zum Pack hinzufüge
    Dann sollten alle Spieler im Pack-Pool sein
    Und die Gesamtwahrscheinlichkeit sollte 12% betragen
    Und die relative Wahrscheinlichkeit sollte korrekt berechnet werden

  Szenario: Spieler aus Pack entfernen
    Angenommen ein Pack "Premium Pack" mit 3 Spielern existiert
    Und der Spieler "Neymar" ist im Pack enthalten
    Und ich bin als Administrator angemeldet
    Wenn ich "Neymar" aus dem Pack entferne
    Dann sollte der Spieler aus dem Pack entfernt werden
    Und der Pack sollte nur noch 2 Spieler enthalten
    Und die Wahrscheinlichkeiten sollten neu berechnet werden

  Szenario: Pack erfolgreich kaufen
    Angenommen ein Benutzer mit 500 Münzen existiert
    Und ein Pack "Bronze Pack" für 100 Münzen existiert
    Und der Pack hat den Status "ACTIVE"
    Und ich bin als dieser Benutzer angemeldet
    Wenn ich den Pack "Bronze Pack" kaufe
    Dann sollte der Kauf erfolgreich sein
    Und 100 Münzen sollten von meinem Konto abgezogen werden
    Und ich sollte 400 Münzen übrig haben
    Und der Kaufvorgang sollte protokolliert werden

  Szenario: Pack kaufen ohne ausreichende Münzen
    Angenommen ein Benutzer mit 50 Münzen existiert
    Und ein Pack "Gold Pack" für 200 Münzen existiert
    Und ich bin als dieser Benutzer angemeldet
    Wenn ich versuche den Pack "Gold Pack" zu kaufen
    Dann sollte ich einen 400 Fehler erhalten
    Und die Fehlermeldung sollte "Insufficient coins" enthalten
    Und meine Münzanzahl sollte unverändert bleiben
    Und kein Kauf sollte protokolliert werden

  Szenario: Inaktiven Pack kaufen
    Angenommen ein Pack "Disabled Pack" mit Status "INACTIVE" existiert
    Und ich bin als Benutzer angemeldet
    Wenn ich versuche den "Disabled Pack" zu kaufen
    Dann sollte ich einen 400 Fehler erhalten
    Und die Fehlermeldung sollte "Pack is not available for purchase" enthalten

  Szenario: Leeren Pack kaufen
    Angenommen ein Pack "Empty Pack" mit Status "EMPTY" existiert
    Und ich bin als Benutzer angemeldet
    Wenn ich versuche den "Empty Pack" zu kaufen
    Dann sollte ich einen 400 Fehler erhalten
    Und die Fehlermeldung sollte "Pack has no players available" enthalten

  Szenario: Pack erfolgreich öffnen (Spieler ziehen)
    Angenommen ich habe einen Pack "Silver Pack" gekauft
    Und der Pack enthält folgende Spieler:
      | Name      | Prozentsatz |
      | Player A  | 0.4         |
      | Player B  | 0.4         |
      | Player C  | 0.2         |
    Wenn ich den Pack öffne
    Dann sollte ich einen zufälligen Spieler erhalten
    Und der Spieler sollte zu meiner Sammlung hinzugefügt werden
    Und der Spieler sollte aus dem Pack-Pool entfernt werden
    Und die Wahrscheinlichkeiten sollten neu berechnet werden

  Szenario: Pack öffnen bis zum letzten Spieler
    Angenommen ein Pack "Final Pack" mit nur einem Spieler existiert
    Und ich habe diesen Pack gekauft
    Wenn ich den Pack öffne
    Dann sollte ich den letzten Spieler erhalten
    Und der Pack sollte den Status "EMPTY" erhalten
    Und der Pack sollte automatisch deaktiviert werden
    Und keine weiteren Käufe sollten möglich sein

  Szenario: Wahrscheinlichkeits-Engine testen
    Angenommen ein Pack mit kontrollierten Wahrscheinlichkeiten existiert:
      | Spieler    | Prozentsatz | Relative Chance |
      | Common     | 0.5         | 50%             |
      | Uncommon   | 0.3         | 30%             |
      | Rare       | 0.15        | 15%             |
      | Legendary  | 0.05        | 5%              |
    Wenn ich 1000 Pack-Öffnungen simuliere
    Dann sollte die Verteilung annähernd den Wahrscheinlichkeiten entsprechen
    Und seltene Spieler sollten entsprechend weniger oft gezogen werden

  Szenario: Pack-Pool dynamisch schrumpfen
    Angenommen ein Pack "Dynamic Pack" mit 10 Spielern existiert
    Und verschiedene Benutzer kaufen und öffnen den Pack
    Wenn 5 Spieler aus dem Pack gezogen wurden
    Dann sollte der Pack nur noch 5 Spieler enthalten
    Und die Wahrscheinlichkeiten sollten entsprechend angepasst werden
    Und die Gesamtwahrscheinlichkeit sollte sich reduziert haben

  Szenario: Alle verfügbaren Packs abrufen
    Angenommen folgende Packs existieren:
      | Name         | Preis | Status   | Spieler |
      | Starter Pack | 50    | ACTIVE   | 20      |
      | Premium Pack | 150   | ACTIVE   | 15      |
      | Legacy Pack  | 200   | INACTIVE | 10      |
      | Empty Pack   | 100   | EMPTY    | 0       |
    Wenn ich alle verfügbaren Packs abrufe
    Dann sollte ich nur ACTIVE Packs erhalten
    Und die Packs sollten Spieleranzahl und Gesamtwahrscheinlichkeit enthalten
    Und inaktive oder leere Packs sollten nicht angezeigt werden

  Szenario: Pack-Details abrufen
    Angenommen ein Pack "Detail Pack" mit Spielern existiert
    Und ich bin als Administrator angemeldet
    Wenn ich die Details des Packs abrufe
    Dann sollte ich vollständige Pack-Informationen erhalten
    Und die komplette Spielerliste sollte enthalten sein
    Und die individuellen Wahrscheinlichkeiten sollten angezeigt werden

  Szenario: Pack erfolgreich aktualisieren
    Angenommen ein Pack "Update Pack" existiert
    Und ich bin als Administrator angemeldet
    Wenn ich den Pack aktualisiere mit:
      | Name   | Updated Pack |
      | Preis  | 120          |
      | Status | INACTIVE     |
    Dann sollte der Pack erfolgreich aktualisiert werden
    Und alle Änderungen sollten gespeichert werden
    Und das Aktualisierungsdatum sollte gesetzt werden

  Szenario: Pack erfolgreich löschen
    Angenommen ein Pack "Delete Pack" ohne gekaufte Instanzen existiert
    Und ich bin als Administrator angemeldet
    Wenn ich den Pack lösche
    Dann sollte der Pack erfolgreich gelöscht werden
    Und alle Pack-Player Beziehungen sollten gelöscht werden
    Und das zugehörige Bild sollte gelöscht werden

  Szenario: Pack mit aktiven Käufen nicht löschen
    Angenommen ein Pack "Popular Pack" mit gekauften Instanzen existiert
    Und ich bin als Administrator angemeldet
    Wenn ich versuche den Pack zu löschen
    Dann sollte ich einen 400 Fehler erhalten
    Und die Fehlermeldung sollte auf aktive Käufe hinweisen
    Und der Pack sollte nicht gelöscht werden

  Szenario: Pack-Erstellung ohne Admin-Berechtigung
    Angenommen ich bin als normaler Benutzer angemeldet
    Wenn ich versuche einen neuen Pack zu erstellen
    Dann sollte ich einen 403 Fehler erhalten
    Und die Fehlermeldung sollte "Admin access required" enthalten
    Und kein Pack sollte erstellt werden