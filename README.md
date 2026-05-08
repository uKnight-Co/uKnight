# uKnight

**Mission:** To create a high-fidelity, university-exclusive distinct connection platform.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2-green?logo=springboot)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red?logo=redis)](https://redis.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

---

## 🚀 Overview

uKnight is where spontaneity meets safety. Inspired by platforms like Omegle but designed exclusively for the university community, uKnight leverages verified `.edu` authentication to create a "walled garden" for students to connect, collaborate, and network.

### Why uKnight?
*   **Verified Community:** Only students with valid university emails can join.
*   **High Performance:** Real-time video/audio via WebRTC with sub-100ms matchmaking.
*   **Premium UX:** A sleek, minimal interface designed for speed and clarity.

---

## 🛠️ The Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS + Framer Motion (for high-fidelity animations)
- **UI:** Shadcn/ui (Accessible, monochrome-clean components)

### Backend
- **Core:** Java Spring Boot 21
- **Real-time:** WebSockets (STOMP protocol)
- **Matchmaking:** Redis In-Memory Data Store
- **Database:** PostgreSQL

---

## 🏗️ Architecture

```mermaid
graph TD
    User[User Client] -->|HTTPS/Next.js| Vercel[Frontend Host]
    User -->|WebSocket| LB[Load Balancer]
    User -->|WebRTC P2P| Peer[Peer Client]
    
    LB --> Spring[Spring Boot Cluster]
    
    Spring -->|Read/Write| Postgres[(PostgreSQL)]
    Spring -->|Queue/Match| Redis[(Redis)]
    
    subgraph "The Magic"
        Redis --> Matchmaker[Matchmaking Service]
        Matchmaker --> Spring
    end
```

---

## ✨ Features

### Phase 1: The Skeleton
- [x] **Auth System:** Secure login restricted to `.edu` domains.
- [x] **Lobby UI:** Real-time "Online Knights" counter.
- [/] **Matchmaking:** WebSocket-driven pairing queue.

### Phase 2: The Connection (In Progress)
- [ ] **WebRTC Video:** Ultra-low latency P2P video/audio streams.
- [ ] **Instant Skip:** One-click disconnect and re-queue.
- [ ] **Text Fallback:** Persistent chat during video sessions.

### Phase 3: The Polish
- [ ] **Interest Matching:** Tag-based filtering (e.g., Major, Hobbies).
- [ ] **AI Guard:** Real-time moderation layer for safety.

---

## 🚦 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Java 21 & Maven

### Quick Start (Docker)
The easiest way to get uKnight running locally is via Docker Compose:

```bash
docker-compose up --build
```

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend:** [http://localhost:8080](http://localhost:8080)

### Manual Setup

#### Backend
```bash
cd backend/server
./mvnw spring-boot:run
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">Built with ❤️ for the University Community.</p>
