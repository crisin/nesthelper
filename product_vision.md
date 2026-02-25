# 🎧 Produktvision (kurz)

Eine **persönliche + soziale Lyrics Knowledge Base**, die Musik nicht nur speichert, sondern interpretierbar, erinnerbar und analysierbar macht.

Nicht: „Lyrics anzeigen“
Sondern: **Songs als semantische Erinnerungs- und Ausdruckseinheiten.**

---

# 🧭 Feature-Roadmap (High-Level)

## Phase 1 — Core Lyrics Experience (Depth statt Breite)

👉 Ziel: Lyrics zum zentralen Objekt machen.

### 1. Lyrics Workspace (Song Detail 2.0)

Aktuell: Lyrics hinzufügen
Neu: **Lyrics bearbeiten & strukturieren**

**Features**

* Lyrics Versioning (Edit History)
* Line-by-line Struktur statt Plain Text
* Timestamp pro Line
* Markdown Support
* Highlighting einzelner Zeilen

**Warum wichtig**
→ Grundlage für fast alle späteren Features.

---

### 2. Personal Meaning Layer

User können Songs emotional annotieren.

**Neue Datenobjekte**

* Note (global zum Song)
* Line Annotation (auf einzelne Lyrics-Zeilen)
* Mood Tag
* Context Tag („Gym“, „Breakup“, „Night Drive“)

**Beispiele**

* „Diese Line hat mich durch 2023 gebracht“
* Emoji + kurze Gedanken

👉 Das macht eure DB einzigartig — Spotify selbst speichert sowas nicht.

---

### 3. Smart Lyrics Search

Nicht nur Song-Suche.

**Suchmodi**

* Volltext über Lyrics
* Suche nach Lyrics-Zeilen
* Suche nach Emotion/Tags
* „Songs mit ähnlichen Lyrics-Wörtern“

Technisch:

* PostgreSQL Full Text Search oder pg_trgm
* später embeddings möglich

---

## Phase 2 — Social Intelligence Layer

👉 Eure bestehende „was andere gespeichert haben“-Idee wird ausgebaut.

### 4. Community Insights

Songseite zeigt:

* häufigste gespeicherte Lyrics-Line
* meistmarkierte Passage
* Top-Kommentare
* emotionale Heatmap über Lyrics

Beispiel:

```
Line 12 → 18 User haben das markiert
```

---

### 5. Shared Collections

User können erstellen:

* Lyrics Playlists (nicht Spotify Playlists!)
* Theme-based Sammlungen:

  * „Sad Songs“
  * „Gym Motivation Lines“
  * „Best Rap Punchlines“

Collections enthalten:

* Songs
* spezifische Lyrics-Zeilen

---

### 6. Public/Private Memory Mode

Song kann sein:

* privat
* nur Freunde
* community sichtbar

Sehr wichtig für ehrliche persönliche Notes.

---

## Phase 3 — Spotify-native Power Features

👉 Dinge bauen, die Spotify selbst nicht anbietet.

### 7. Listening Context Capture

Beim Speichern eines Songs automatisch speichern:

* Uhrzeit
* Wochentag
* Device (falls API liefert)
* Listening Session ID

Dann möglich:

✅ „Songs die ich nachts höre“
✅ „Lyrics meiner Winterphase“

---

### 8. Auto Lyrics Draft (AI Assist)

Optional (kein Muss).

Wenn Song gespeichert wird:

* Lyrics automatisch vorgeschlagen
* Struktur automatisch erkannt (Verse/Chorus)

AI kann außerdem:

* Keywords extrahieren
* Emotion vorschlagen

---

### 9. Lyrics → Spotify Navigation

Von Lyrics zurück zur Musik.

Features:

* Klick auf Line → springe zur Stelle im Song
* Lyrics Karaoke Mode (wenn timestamps vorhanden)

---

## Phase 4 — Deep Engagement (Retention Engine)

👉 Hier entsteht echte Produktbindung.

### 10. Personal Lyrics Analytics

Dashboard:

* meistgespeicherte Wörter
* dominante Emotionen
* Top Künstler nach Lyrics
* häufigste Themen

Beispiel:

> Deine gespeicherten Songs enthalten überdurchschnittlich viele „nostalgic“-Themes.

---

### 11. Memory Timeline

Chronologische Ansicht:

```
Jan 2024 → viele melancholische Songs
Sommer 2024 → upbeat & dance
```

Sehr hoher emotionaler Hook.

---

### 12. Weekly Lyrics Digest

Automatisch generiert:

* meistgehörte Line der Woche
* neue Community Insights
* ähnliche Songs basierend auf gespeicherten Lyrics

---

## Phase 5 — Differenzierende “Killer Features”

👉 Dinge, die kaum jemand baut.

### 13. Lyrics Similarity Engine

Nicht Audio → sondern Textvergleich.

User sieht:

> Songs mit ähnlichen Lyrics-Themen.

Technisch:

* embeddings + cosine similarity
* offline batch job

---

### 14. Quote Mode

Lyrics werden zu sharebaren Zitaten:

* Auto Formatting
* Hintergrundbilder
* Export als Image

Perfekt für private Communities.

---

### 15. Mood-driven Discovery

User fragt:

> „Zeig mir Songs wie meine traurigsten Lyrics“

System nutzt:

* eigene Notes
* Community Tags
* Lyrics Embeddings

---

# 🧱 Datenmodell-Erweiterung (wichtig)

Neue Tabellen:

```
lyrics
lyrics_lines
lyrics_versions
line_annotations
song_notes
song_tags
collections
collection_items
listening_context
lyrics_embeddings
```

---

# ⚙️ Technische Architektur-Empfehlungen (NestJS + React)

## Backend (NestJS)

* Lyrics Module (Core Domain)
* Annotation Module
* Insight Aggregator (cron jobs)
* Similarity Worker (queue-based)

Queue:

* BullMQ / Redis für Background Analysis

---

## PostgreSQL

Nutzen:

* `tsvector` für Lyrics Search
* `pg_trgm` für fuzzy matching
* JSONB für flexible metadata

---

## Frontend (React)

Neue zentrale Views:

1. Song Workspace
2. Lyrics Reader Mode
3. Analytics Dashboard
4. Collections Explorer

---

# 📈 Produktstrategie (entscheidend)

Die App wird stark, wenn sie sich entwickelt von:

```
Spotify Companion
        ↓
Lyrics Notebook
        ↓
Musical Memory System
        ↓
Social Interpretation Layer
```

