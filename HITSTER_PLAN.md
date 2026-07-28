# Hitster — Integration in Lyrics Helper

## Überblick

Hitster ist ein Multiplayer-Musikquiz: Ein Song spielt, Spieler ordnen ihn chronologisch in ihre Timeline ein. Wer zuerst 10 Songs richtig platziert, gewinnt. Die Game-Logik existiert bereits als standalone P2P-App (Expo/React Native). Dieser Plan beschreibt die Integration als **server-authoritative Variante** in das bestehende Lyrics Helper Backend.

**Status:** Beide Apps laufen erstmal parallel. Dieser Plan ist die Roadmap für die spätere Zusammenführung.

## Warum integrieren?

- Spotify Auth + Tokens sind schon da (in DB, Auto-Refresh)
- User-System steht (JWT, Accounts)
- Hosting auf Railway steht (Backend + DB + Redis)
- Server-authoritative Architektur löst P2P-Security-Probleme (Cheating, Input-Validation)
- Ein Spotify Developer App für alles

## Architektur

```
Lyrics Helper Backend (NestJS)
├── Bestehende Module (auth, spotify, songs, lyrics, ...)
├── game/                         ← NEU
│   ├── game.module.ts
│   ├── game.gateway.ts           # WebSocket Gateway (Socket.IO)
│   ├── game.service.ts           # Room-Management, State, Turn-Logik
│   ├── game-logic.ts             # Pure Functions (aus bitster portiert)
│   ├── game.types.ts             # Room, Song, Player, Phase, etc.
│   └── dto/                      # WebSocket Event DTOs mit class-validator
│       ├── create-room.dto.ts
│       ├── join-room.dto.ts
│       ├── place-song.dto.ts
│       └── buzz.dto.ts
└── spotify/
    └── spotify.service.ts        # + play() Methode ergänzen
```

```
Hitster Frontend (React + Vite, separates Deploy)
├── Login via Lyrics Helper API (/auth/login)
├── WebSocket-Verbindung (Socket.IO Client)
└── Game UI (Home, Lobby, Playing, Reveal, Finished)
```

## Was schon da ist (wiederverwenden)

| Was | Wo | Nutzung für Hitster |
|-----|----|---------------------|
| Spotify Token Management | `spotify.service.ts` → `getValidAccessToken(userId)` | Songs abspielen für jeden Spieler |
| JWT Auth | `auth/` Module mit JwtAuthGuard | WebSocket-Verbindung authentifizieren |
| User Model | Prisma `User` + `SpotifyToken` | Spieler-Identität, Spotify-Verknüpfung |
| PostgreSQL + Prisma | `prisma/` Module | Optionale Spielstatistiken |
| Redis (BullMQ) | Bereits konfiguriert | Potentiell für Room-TTL / Cleanup |
| Railway Hosting | Docker Compose | Kein neues Deployment nötig |

## Was neu muss

### 1. Dependencies

```bash
cd backend
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

Für das Frontend:
```bash
npm install socket.io-client
```

### 2. Spotify: `play()` Endpoint

Die bestehende Spotify-Integration kann Tracks lesen und seeken, aber nicht aktiv abspielen. Ergänzung in `spotify.service.ts`:

```typescript
async play(userId: number, trackUri: string, deviceId?: string): Promise<void> {
  const token = await this.getValidAccessToken(userId);
  const url = deviceId
    ? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
    : 'https://api.spotify.com/v1/me/player/play';

  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ uris: [trackUri] }),
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(`Spotify play failed: ${res.status}`);
  }
}

async pause(userId: number): Promise<void> {
  const token = await this.getValidAccessToken(userId);
  await fetch('https://api.spotify.com/v1/me/player/pause', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
}

async getDevices(userId: number): Promise<SpotifyDevice[]> {
  const token = await this.getValidAccessToken(userId);
  const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.devices;
}
```

### 3. Spotify Scopes erweitern

Aktuell fehlt `playlist-read-private` für private Playlists als Song-Quelle. In `spotify.service.ts` zu den bestehenden Scopes hinzufügen:

```typescript
const scopes = [
  // bestehende...
  'playlist-read-private',
  'playlist-read-collaborative',
];
```

User müssen Spotify einmal neu verbinden damit die neuen Scopes greifen.

### 4. WebSocket Gateway

```typescript
// game/game.gateway.ts
@WebSocketGateway({ namespace: '/game', cors: true })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private gameService: GameService,
    private spotifyService: SpotifyService,
    private jwtService: JwtService,
  ) {}

  // Auth bei Connect: JWT aus query/header validieren
  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    client.data.userId = userId;
  }

  handleDisconnect(client: Socket) {
    this.gameService.handleDisconnect(client.data.userId);
  }

  // ── Events ──

  @SubscribeMessage('create-room')
  handleCreate(client: Socket, dto: CreateRoomDto) { ... }

  @SubscribeMessage('join-room')
  handleJoin(client: Socket, dto: JoinRoomDto) { ... }

  @SubscribeMessage('start-game')
  handleStart(client: Socket, dto: StartGameDto) { ... }

  @SubscribeMessage('place-song')
  handlePlace(client: Socket, dto: PlaceSongDto) { ... }

  @SubscribeMessage('buzz')
  handleBuzz(client: Socket) { ... }

  @SubscribeMessage('buzz-place')
  handleBuzzPlace(client: Socket, dto: PlaceSongDto) { ... }

  @SubscribeMessage('next-round')
  handleNextRound(client: Socket) { ... }

  @SubscribeMessage('leave')
  handleLeave(client: Socket) { ... }
}
```

### 5. Game Service (Server-Authoritative)

```typescript
// game/game.service.ts
@Injectable()
export class GameService {
  private rooms = new Map<string, Room>();     // In-Memory, kein DB nötig
  private playerRooms = new Map<number, string>(); // userId → roomCode

  createRoom(hostUserId: number, hostName: string): Room { ... }
  joinRoom(code: string, userId: number, name: string): Room { ... }
  startGame(code: string, userId: number, playlist: Song[]): Room { ... }
  placeSong(code: string, userId: number, position: number): PlacementResult { ... }
  buzz(code: string, userId: number): Room { ... }
  resolveBuzz(code: string, userId: number, position: number): PlacementResult { ... }
  nextRound(code: string, userId: number): Room { ... }
  leaveRoom(userId: number): void { ... }
  handleDisconnect(userId: number): void { ... }

  // Hilfsfunktionen
  private broadcastState(code: string): void { ... }
  private getRoom(code: string): Room { ... }
  private assertHost(room: Room, userId: number): void { ... }
  private assertCurrentPlayer(room: Room, userId: number): void { ... }
}
```

**Wichtig:** Input-Validation passiert hier — `position` wird gegen Timeline-Länge geprüft, Actions werden gegen Spielphase + Berechtigung validiert. Die Pure Functions aus `bitster/game/logic.ts` (`checkPlacement`, `placeSong`, `advanceTurn`, `handleBuzz`, `resolveBuzz`, `checkWinCondition`) können 1:1 portiert werden.

### 6. Game Logic (portieren aus Bitster)

Die Datei `bitster/src/game/logic.ts` enthält pure Functions ohne I/O-Abhängigkeiten:

```
checkPlacement(timeline, song, position) → boolean
placeSong(room, playerId, position) → { room, result }
advanceTurn(room) → room
checkWinCondition(room) → Player | null
handleBuzz(room, buzzerId) → room
resolveBuzz(room, position) → { room, result }
pickRandomSong(room) → { room, song } | null
startGame(room, playlist) → room
generateRoomCode() → string
```

Diese können direkt als `game/game-logic.ts` übernommen werden. Einzige Anpassung: `playerId: string` wird zu `userId: number` (Lyrics Helper nutzt numerische IDs).

### 7. Playback-Orchestrierung

Der große Vorteil der Server-Architektur: Der Server hat Zugriff auf alle Spotify-Tokens und kann direkt auf allen Geräten abspielen.

```typescript
// Im GameService
async playSongOnAllDevices(room: Room, trackUri: string): Promise<void> {
  const results = await Promise.allSettled(
    room.players.map(player =>
      this.spotifyService.play(player.userId, trackUri)
    )
  );
  // Log failures but don't block the game
}
```

Kein P2P-Broadcast von Play-Commands nötig — der Server macht das direkt.

### 8. Playlist Loading

Ebenfalls serverseitig — der Host gibt eine Playlist-URL an, der Server lädt die Tracks:

```typescript
async loadPlaylist(userId: number, playlistUrl: string): Promise<Song[]> {
  // Nutzt bestehende spotify.service.ts Methoden
  const playlistId = this.parsePlaylistUrl(playlistUrl);
  const tracks = await this.spotifyService.getPlaylistTracks(userId, playlistId);
  return tracks.map(t => ({
    id: t.id,
    uri: `spotify:track:${t.id}`,
    name: t.name,
    artist: t.artists[0]?.name ?? 'Unknown',
    year: this.extractYear(t),  // aus album.release_date
  }));
}
```

**Hinweis:** `getPlaylistTracks` existiert bereits in `spotify.service.ts`, gibt aber `SpotifyTrackObject[]` zurück. Release-Year muss aus der Spotify API zusätzlich geholt werden (Album-Endpoint oder Track-Endpoint mit `release_date`).

## Sicherheitsvorteile vs. P2P

| Problem in P2P | Lösung mit Server |
|----------------|-------------------|
| Keine Input-Validation auf Nachrichten | Server validiert alle DTOs mit class-validator |
| Peers können Nachrichten fälschen | Server kennt den Absender (JWT-authentifiziert) |
| `next-round` ohne Auth-Check | Server prüft `userId === room.hostId` |
| Position NaN/Infinity/negativ | Server-seitige Bounds-Checks |
| Name-basiertes Session-Hijacking | userId-basierte Identität (aus JWT) |
| Timelines mit Song-Years an alle broadcast | Server schickt nur nötige Daten (kein Year im Playing-State) |

## Offene Fragen

1. **Persistenz von Spielstatistiken?** Könnte in die bestehende Analytics integriert werden (Spiele gespielt, Win-Rate, meistgespielte Jahrzehnte). Braucht DB-Tabellen.

2. **Registration:** Aktuell disabled. Für Hitster müssen Freunde Accounts haben. Entweder Registration öffnen (mit Invite-Codes?) oder einen anderen Onboarding-Flow.

3. **Playlist-Source:** Year/Release-Date ist nicht direkt in den bestehenden Playlist-Track-Responses. Muss aus Album-Daten extrahiert werden (Spotify API liefert `album.release_date` im Track-Objekt).

4. **Room Cleanup:** Rooms sind in-memory. Brauchen TTL/Cleanup wenn alle disconnecten. Entweder setTimeout oder ein Cron-Job.

5. **Device Selection:** Aktuell gibt's keinen Device-Selector in Lyrics Helper. Muss fürs Frontend gebaut werden (GET /v1/me/player/devices Endpoint existiert aber schon).

## Migration: Reihenfolge

Wenn's soweit ist, in dieser Reihenfolge:

1. `play()` / `pause()` / `getDevices()` zu Spotify Service hinzufügen
2. Scopes erweitern (`playlist-read-private`)
3. WebSocket Gateway + Game Module aufsetzen
4. Game Logic aus Bitster portieren (reine Functions, kein Refactor nötig)
5. Hitster Frontend als React-App bauen (gleicher Stack wie Lyrics Helper)
6. Auf Railway deployen (Backend update, Frontend als neuer Service)
7. Bitster P2P-App sunset
