# 🔖 Bookmarker

Bookmarker is a high-performance, self-hosted personal bookmark manager. It allows users to organize bookmarks into folders and collections, automatically extracts metadata (titles, descriptions, favicons) in the background, and updates the UI in real-time.

This repository recently underwent a **Comprehensive Domain-Driven Design (DDD) Refactor**, transitioning from a standard MVC layout into a strictly layered, scalable, and domain-oriented architecture.

This document serves as an **Onboarding Guide** for new engineers. It details the architecture, design decisions, and guidelines for enhancing or debugging the application.

---

## 🚀 Features

- **Smart Organization:** Group bookmarks into infinitely nestable folders and collections.
- **Automatic Metadata Extraction:** Instantly saves bookmarks, while a background job scrapes the target URL for title, description, and favicon.
- **Real-time Updates:** The UI live-updates via WebSockets the moment background scraping completes.
- **Privacy & Security:** Lock specific folders with passwords to protect sensitive collections.
- **Advanced Search:** Full-text search and tagging system for rapid retrieval.
- **Performance:** Virtualized lists and optimistic UI updates capable of rendering thousands of bookmarks without lag.

---

## 🛠️ Tech Stack

### Frontend

| Technology            | Purpose                                                                       |
| :-------------------- | :---------------------------------------------------------------------------- |
| **React 19 + Vite 8** | Core UI framework and lightning-fast build tool utilizing SWC.                |
| **TailwindCSS 4**     | Utility-first styling for rapid UI development.                               |
| **TanStack Query v5** | Server-state management (caching, background refetching, optimistic updates). |
| **Zustand v5**        | Minimal client-state management (sidebar state, theme preferences).           |
| **React Router v7**   | URL-driven navigation.                                                        |
| **Socket.io-client**  | Listens for `bookmarkUpdated` events from the backend.                        |

### Backend

| Technology              | Purpose                                                             |
| :---------------------- | :------------------------------------------------------------------ |
| **NestJS 11**           | Opinionated, modular Node.js framework utilizing decorators and DI. |
| **Fastify**             | High-performance HTTP server underlying NestJS.                     |
| **MongoDB (Mongoose)**  | Primary database with schema validation and virtuals.               |
| **Agenda / BullMQ**     | Redis-backed asynchronous job queue for web scraping.               |
| **Puppeteer & Cheerio** | HTML parsing and headless browser fallback for JS-rendered pages.   |
| **Socket.io**           | WebSocket gateway for pushing real-time updates to the client.      |
| **PassportJS**          | Google OAuth 2.0 and JWT cookie-based authentication.               |

---

## 🏛️ System Architecture & Domain-Driven Design

The codebase adheres strictly to **Domain-Driven Design (DDD)** principles and **Clean Architecture**. The physical folder structure mirrors the business domains (Bounded Contexts) rather than technical roles.

### Bounded Contexts

The backend (`src/modules/`) and frontend (`src/domains/`) are divided into distinct business domains:

1.  **`@identity`**: Handles Authentication, User Profiles, and Settings.
2.  **`@workspace`**: Handles Folders, Collections, visibility, and access control.
3.  **`@content`**: Handles Bookmarks, background Scraping, and Tagging.
4.  **`@core` / `shared`**: Global cross-cutting concerns (Error handling, UI primitive components).

### Strict Micro-Architectural Layering

Inside **every** bounded context (e.g., `backend/src/modules/content/bookmarks`), you will find exactly four layers. Dependencies only point **inwards** toward the Domain.

```text
bookmarks/
├── domain/                  # 1. NO dependencies on frameworks, DBs, or HTTP.
│   ├── entities/            # Pure TS classes (e.g., Bookmark) with business rules.
│   └── repositories/        # Interfaces (e.g., IBookmarkRepository).
├── application/             # 2. Use Cases & Orchestration.
│   └── services/            # Injects Interfaces. Has NO knowledge of MongoDB.
├── infrastructure/          # 3. External integrations & DB Implementations.
│   ├── persistence/         # Mongoose schemas, concrete repositories, and Mappers.
│   └── jobs/                # Background scraping workers.
└── presentation/            # 4. Delivery mechanism.
    └── http/                # NestJS Controllers and DTOs.
```

### The Infrastructure Mapper Pattern

To prevent Mongoose (`Document`) objects from leaking into the Application and Domain layers, we utilize the **Mapper Pattern**.

1. The `BookmarksMongooseRepository` queries MongoDB.
2. It immediately passes the raw Mongoose document to `BookmarkMapper.toDomain(doc)`.
3. A pure `Bookmark` entity is returned to the `BookmarksService`.

### Frontend Feature-Sliced Design

The frontend similarly organizes code by Domain rather than flattening all hooks or components together:

```text
frontend/src/domains/bookmarks/
├── application/             # React Query hooks (e.g., useBookmarks.js)
└── presentation/            # React UI Components (e.g., BookmarkList.jsx)
```

---

## 🚦 Request Lifecycle

1.  **Client Action**: User pastes a URL and submits.
2.  **Frontend Application**: `useBookmarks` React Query mutation executes, sending a POST request.
3.  **Backend Presentation**: `BookmarksController` intercepts the request, validates the DTO, and calls `BookmarksService`.
4.  **Backend Application**: The service tells the injected `IBookmarkRepository` to save a "Scraping..." placeholder. It then queues an `Agenda` job.
5.  **Backend Infrastructure (Persistence)**: `BookmarksMongooseRepository` maps the domain entity to Mongoose, saves it, and returns the entity.
6.  **Backend Infrastructure (Job)**: The worker scrapes the site using Cheerio/Puppeteer, updates the DB via the interface, and triggers the `EventsGateway`.
7.  **Real-Time Sync**: Socket.io pushes a `bookmarkUpdated` event to the client, invalidating the React Query cache and instantly refreshing the UI.

---

## 💻 Local Development Onboarding

### Prerequisites

- Node.js v20+
- MongoDB (Local or Atlas)
- Redis (For the background job queue)
- Google OAuth Credentials (for authentication)

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env   # Fill in your Mongo, Redis, and Google OAuth credentials
npm run start:dev      # Starts NestJS on http://localhost:8080
```

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env   # Set VITE_API_URL=http://localhost:8080
npm run dev            # Starts Vite on http://localhost:5173
```

---

## 🐞 Enhancing & Debugging Guidelines

### 1. Where do I add a new feature?

- **Is it a new REST endpoint for Folders?** Add the DTO and Controller route in `modules/workspace/folders/presentation/http/`. Add the logic in `application/services/`.
- **Does it require a new database query?** Define the method signature in `domain/repositories/IFolderRepository`. Implement the Mongoose query in `infrastructure/persistence/folder.mongoose.repository.ts`.
- **Does it involve a new business rule?** (e.g., "A folder cannot be locked if it is public"). Place this validation inside the pure `Folder` entity in `domain/entities/`, and call it from your Application Service.

### 2. How do I trace a bug?

- **UI state bug:** Check the React Query DevTools. Ensure the `application/` hook is returning the right data.
- **Database mapping bug:** If a field isn't showing up, check the `mapper.ts` file in the infrastructure layer. If you added a field to Mongoose but forgot to add it to the Mapper, the Application layer will silently drop it.
- **Scraping failed:** Check the NestJS server console. Unhandled exceptions trigger the `AllExceptionsFilter`, which logs a structured JSON object containing the `reqId`, `path`, and full stack trace.

### 3. Architectural Rules to Never Break

- **NEVER** import `mongoose` or `@nestjs/mongoose` inside the `domain/` or `application/` folders.
- **NEVER** bypass the repository interface. Always use `@Inject('IRepositoryName')`.
- **NEVER** use relative paths like `../../../core/`. Use the configured TypeScript aliases (`@core/`, `@identity/`, `@workspace/`, `@content/`).
