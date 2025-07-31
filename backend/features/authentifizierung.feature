# language: de
Funktionalität: Benutzer-Authentifizierung
  Als ein Benutzer der Football Trading Card Game Anwendung
  Möchte ich mich registrieren und anmelden können
  Damit ich Zugang zu den Spielfunktionen habe

  Hintergrund:
    Angenommen die Datenbank ist sauber
    Und das JWT_SECRET ist konfiguriert

  Szenario: Erfolgreiche Benutzerregistrierung
    Angenommen ich bin ein neuer Benutzer
    Wenn ich mich mit gültigen Daten registriere:
      | Benutzername | max.mustermann    |
      | E-Mail       | max@example.com   |
      | Passwort     | Sicher123!        |
    Dann sollte ich eine Erfolgsmeldung erhalten
    Und ein neuer Benutzer sollte in der Datenbank erstellt werden
    Und das Passwort sollte gehashed gespeichert werden
    Und der Benutzer sollte die Rolle "USER" haben
    Und ich sollte 1000 Münzen als Startkapital erhalten

  Szenario: Registrierung mit bereits existierender E-Mail
    Angenommen ein Benutzer mit der E-Mail "existing@example.com" existiert bereits
    Wenn ich versuche mich mit dieser E-Mail zu registrieren:
      | Benutzername | neuer.nutzer        |
      | E-Mail       | existing@example.com |
      | Passwort     | Passwort123!        |
    Dann sollte ich einen 400 Fehler erhalten
    Und die Fehlermeldung sollte "User with this email or username already exists" enthalten
    Und kein neuer Benutzer sollte erstellt werden

  Szenario: Registrierung mit bereits existierendem Benutzernamen
    Angenommen ein Benutzer mit dem Benutzernamen "existing.user" existiert bereits
    Wenn ich versuche mich mit diesem Benutzernamen zu registrieren:
      | Benutzername | existing.user     |
      | E-Mail       | neue@example.com  |
      | Passwort     | Passwort123!      |
    Dann sollte ich einen 400 Fehler erhalten
    Und die Fehlermeldung sollte "User with this email or username already exists" enthalten

  Szenario: Registrierung mit ungültigen Daten
    Angenommen ich bin ein neuer Benutzer
    Wenn ich versuche mich mit ungültigen Daten zu registrieren:
      | Benutzername |           |
      | E-Mail       | invalid   |
      | Passwort     | 123       |
    Dann sollte ich einen 400 Validierungsfehler erhalten
    Und eine entsprechende Fehlermeldung sollte angezeigt werden

  Szenario: Erfolgreiche Benutzeranmeldung
    Angenommen ein Benutzer mit folgenden Daten existiert:
      | Benutzername | john.doe         |
      | E-Mail       | john@example.com |
      | Passwort     | MyPassword123!   |
      | Rolle        | USER             |
    Wenn ich mich mit korrekten Anmeldedaten anmelde:
      | E-Mail   | john@example.com |
      | Passwort | MyPassword123!   |
    Dann sollte ich eine Erfolgsmeldung erhalten
    Und ich sollte einen gültigen JWT-Token erhalten
    Und der Token sollte die Benutzer-ID enthalten
    Und die Antwort sollte die Benutzerinformationen enthalten

  Szenario: Anmeldung mit falscher E-Mail
    Angenommen ein Benutzer existiert
    Wenn ich versuche mich mit einer nicht existierenden E-Mail anzumelden:
      | E-Mail   | nonexistent@example.com |
      | Passwort | SomePassword123!        |
    Dann sollte ich einen 401 Fehler erhalten
    Und die Fehlermeldung sollte "Invalid credentials" enthalten
    Und ich sollte keinen Token erhalten

  Szenario: Anmeldung mit falschem Passwort
    Angenommen ein Benutzer mit der E-Mail "test@example.com" existiert
    Wenn ich versuche mich mit einem falschen Passwort anzumelden:
      | E-Mail   | test@example.com |
      | Passwort | WrongPassword    |
    Dann sollte ich einen 401 Fehler erhalten
    Und die Fehlermeldung sollte "Invalid credentials" enthalten

  Szenario: Zugriff auf geschützte Route mit gültigem Token
    Angenommen ich bin als Benutzer angemeldet
    Und ich habe einen gültigen JWT-Token
    Wenn ich eine geschützte Route mit dem Token aufrufe
    Dann sollte ich Zugriff erhalten
    Und die Anfrage sollte die Benutzerinformationen enthalten

  Szenario: Zugriff auf geschützte Route ohne Token
    Angenommen ich bin nicht angemeldet
    Wenn ich eine geschützte Route ohne Token aufrufe
    Dann sollte ich einen 401 Fehler erhalten
    Und die Fehlermeldung sollte "Access token required" enthalten

  Szenario: Zugriff auf geschützte Route mit ungültigem Token
    Angenommen ich habe einen ungültigen oder abgelaufenen Token
    Wenn ich eine geschützte Route mit diesem Token aufrufe
    Dann sollte ich einen 403 Fehler erhalten
    Und die Fehlermeldung sollte "Invalid or expired token" enthalten

  Szenario: Admin-Zugriff mit USER-Rolle
    Angenommen ich bin als normaler Benutzer (USER) angemeldet
    Wenn ich versuche auf eine Admin-Route zuzugreifen
    Dann sollte ich einen 403 Fehler erhalten
    Und die Fehlermeldung sollte "Admin access required" enthalten

  Szenario: Admin-Zugriff mit ADMIN-Rolle
    Angenommen ich bin als Administrator (ADMIN) angemeldet
    Wenn ich eine Admin-Route aufrufe
    Dann sollte ich Zugriff erhalten
    Und die Admin-Funktionen sollten verfügbar sein