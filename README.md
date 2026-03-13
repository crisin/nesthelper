# 🎵 Spotify Helper App - New Architecture


# THANKS TO https://lrclib.net/

they are awesome <3

[LRCLib](https://lrclib.net/)

## 📋 Project Overview

This is a complete rebuild of the Spotify Helper application using modern technologies. The app integrates Spotify Web API with custom authentication, allowing users to search, save, and manage lyrics while connecting their Spotify account.

## 🏗️ Tech Stack

### Backend
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Lucia Auth
- **API**: RESTful endpoints with JWT tokens
- **External Integration**: Spotify Web API

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router DOM
- **HTTP Client**: Axios with React Query

## 📁 Project Structure

```
spotify-helper-new/
├── backend/                    # NestJS API server
│   ├── src/
│   │   ├── auth/              # Authentication module
│   │   ├── spotify/           # Spotify integration
│   │   ├── lyrics/            # Lyrics management
│   │   ├── users/             # User management
│   │   ├── database/          # Prisma service
│   │   └── common/            # Shared utilities
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── migrations/        # Database migrations
│   ├── .env                   # Environment variables
│   └── package.json
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── pages/            # Route pages
│   │   ├── hooks/            # Custom hooks
│   │   ├── services/         # API services
│   │   ├── stores/           # State management
│   │   └── types/            # TypeScript types
│   ├── public/               # Static assets
│   ├── .env                  # Environment variables
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Spotify Developer account

### Backend Setup

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Start development server**
   ```bash
   npm run start:dev
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# Database
DATABASE_URL="postgresql://localhost:5432/spotify_helper"

# Spotify Configuration
SPOTIFY_CLIENT_ID="your-spotify-client-id"
SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"
SPOTIFY_REDIRECT_URI="http://localhost:3001/auth/spotify/callback"

# JWT Configuration
JWT_SECRET="your-jwt-secret-key"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=3001
NODE_ENV="development"
```

#### Frontend (.env)
```bash
# API Configuration
VITE_API_URL="http://localhost:3001"
VITE_SPOTIFY_CLIENT_ID="your-spotify-client-id"
```

## 📊 Database Schema

The application uses the following main models:

- **User**: User accounts with authentication
- **AuthUser**: Lucia Auth session management
- **SpotifyToken**: Spotify OAuth tokens
- **SavedLyric**: User-saved lyrics data
- **SearchHistory**: Track search history

## 🎯 Key Features

- **Authentication**: Email/password with Lucia Auth
- **Spotify Integration**: OAuth flow with token management
- **Lyrics Search**: Search and save lyrics functionality
- **Dashboard**: User dashboard with history and saved items
- **Real-time Updates**: React Query for data synchronization

## 🛠️ Development Commands

### Backend
```bash
npm run start:dev    # Development server
npm run build        # Build for production
npm run start:prod   # Production server
npx prisma studio    # Database GUI
npx prisma migrate dev  # Run migrations
```

### Frontend
```bash
npm run dev          # Development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 🚀 Deployment

The application is designed for deployment on Railway or similar platforms:

1. **Backend**: Deploy as Node.js service
2. **Frontend**: Build and deploy as static site
3. **Database**: PostgreSQL on Railway

## 📝 Next Steps

1. Complete authentication implementation
2. Set up Spotify API integration
3. Implement lyrics search functionality
4. Build frontend components
5. Add comprehensive testing
6. Configure deployment pipeline

## 🤝 Contributing

This is a rebuild project following the architecture outlined in `REBUILD_PLAN.md`. The new implementation focuses on:

- Better developer experience with TypeScript
- Modern tooling (Vite, NestJS, Prisma)
- Improved performance and scalability
- Enhanced code organization and maintainability