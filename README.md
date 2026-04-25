<div align="center">
  <img src="https://via.placeholder.com/1200x300/09090b/f97316?text=SYNCLY" alt="Syncly Banner" width="100%" />

  <br />
  <br />

  **A High-Performance, Real-Time Task Management Platform.**

  [Live Frontend Demo](https://syncly-kush.vercel.app/) • 
  [Backend API](http://syncly-production-0246.up.railway.app/)

</div>

--- 

## 📖 Overview

Syncly is a highly scalable, real-time project management platform built to keep fast-moving teams connected, synchronized, and productive. It combines traditional Kanban workflows with instantaneous live updates, enabling seamless collaboration without constant page refreshes or delays.

Designed with a premium glassmorphic UI, robust role-based access control, and an optimized relational database schema, Syncly is built to be simple enough for personal use and powerful enough for enterprise startups.

---

## ✨ Key Features

- **⚡ Real-Time Synchronization:** Sub-millisecond task updates, drag-and-drop movements, and notifications powered by Socket.IO.
- **🚀 Recruiter Test Drive (Zero-Friction Demo):** Instantly spin up a sandboxed environment pre-populated with dummy users, active tasks, and calendar dates—no signup required.
- **🛡️ Role-Based Access Control (RBAC):** Granular permissions supporting `Admin`, `Member`, and `Viewer` roles.
- **📊 Dynamic Visualizations:** Switch seamlessly between interactive Kanban Boards and Calendar Views.
- **🔔 Live Notifications:** Instant alerting for team invitations, task assignments, and workspace updates.
- **🎨 Premium UI/UX:** Built with React 19, Tailwind CSS, and Framer Motion for buttery-smooth micro-animations and a sleek glassmorphic aesthetic.

---

## 🏗 System Architecture

Syncly follows a decoupled Client-Server architecture, connected via a RESTful API and bi-directional WebSocket tunnels for real-time state synchronization.

```mermaid
graph TD
    %% Clients
    ClientA[Web Client A\nReact/Vite]
    ClientB[Web Client B\nReact/Vite]

    %% Load Balancing & Routing
    Vercel[Vercel CDN / Edge]
    Railway[Railway Deployment]

    %% Backend Services
    API[Express REST API]
    WS[Socket.IO Server]

    %% Database Layer
    Prisma[Prisma ORM]
    PG[(PostgreSQL DB)]

    %% Connections
    ClientA -->|Static Assets| Vercel
    ClientB -->|Static Assets| Vercel

    ClientA <-->|WS Events| WS
    ClientB <-->|WS Events| WS

    ClientA -->|HTTP Requests| API
    ClientB -->|HTTP Requests| API

    API --> Prisma
    WS --> Prisma
    Prisma --> PG

    subgraph Backend Infrastructure
        Railway
        API
        WS
        Prisma
    end

    style PG fill:#336791,stroke:#fff,stroke-width:2px,color:#fff
    style API fill:#68a063,stroke:#fff,stroke-width:2px,color:#fff
    style WS fill:#010101,stroke:#fff,stroke-width:2px,color:#fff
    style ClientA fill:#61dafb,stroke:#fff,stroke-width:2px,color:#000
    style ClientB fill:#61dafb,stroke:#fff,stroke-width:2px,color:#000
```

### Data Flow & Real-Time Sync Strategy
1. **Optimistic UI Updates:** When a user drags a task, the frontend immediately updates the local state for zero perceived latency.
2. **Persistent Storage:** A REST API call is made asynchronously to persist the new state to PostgreSQL.
3. **Broadcasting:** Upon successful commit, the backend emits a targeted Socket.IO event to all *other* active users in that workspace, ensuring their clients re-render the exact same state instantly.

---

## 🛠 Tech Stack

| Domain | Technology | Purpose |
|--------|------------|---------|
| **Frontend** | React 19, Vite | Core view layer and lightning-fast HMR |
| **Styling** | Tailwind CSS, Framer Motion | Utility-first styling and fluid micro-animations |
| **Backend** | Node.js, Express.js | High-performance, unopinionated web server |
| **Database** | PostgreSQL | ACID-compliant relational data storage |
| **ORM** | Prisma | Type-safe database access and migration management |
| **Real-time** | Socket.IO | Persistent WebSocket connections for live syncing |
| **Auth** | JWT, bcryptjs | Stateless, secure authentication & password hashing |
| **Hosting** | Vercel, Railway | Edge-network frontend delivery and robust backend hosting |

---

## 🚀 Installation & Local Development

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL (Local instance or remote URI like Supabase/Neon)

### 1. Clone the Repository
```bash
git clone https://github.com/kush11-m/syncly.git
cd syncly
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
PORT=8000
DATABASE_URL="postgresql://user:password@localhost:5432/syncly?schema=public"
JWT_SECRET="your_super_secret_key"
```

Initialize the database schema:
```bash
npx prisma db push --accept-data-loss
npx prisma generate
```

Start the backend server:
```bash
npm start
```

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port Vite assigns).

---

## 📂 Project Structure

```text
syncly/
├── backend/                  # Node.js Express Application
│   ├── prisma/               # Database Schema & Migrations
│   ├── users/                # Authentication & User Management
│   ├── teams/                # Workspaces & Role-Based Access
│   ├── tasks/                # Core Kanban Logic
│   ├── notifications/        # Activity Feed & Alerting
│   ├── utils/                # Middlewares (Auth check) & Helpers
│   └── server.js             # Entry point & Socket.IO initialization
│
├── frontend/                 # React 19 SPA
│   ├── src/
│   │   ├── components/       # Reusable UI elements (Cards, Modals)
│   │   ├── pages/            # Core views (Dashboard, Login, Landing)
│   │   ├── utils/            # Helper functions & URL formatters
│   │   ├── App.jsx           # Routing & Context Providers
│   │   └── main.jsx          # React DOM mounting
│   ├── index.html            # Vite entry point
│   └── tailwind.config.js    # Theme tokens & design system rules
```

---

## 🔮 Future Roadmap

- **AI-Powered Task Suggestions:** Auto-categorize and prioritize tasks based on project velocity.
- **Timeline / Gantt View:** Expand visualization options beyond Kanban and Calendar.
- **Deep Analytics Dashboard:** Burn-down charts and team velocity tracking.
- **Webhooks & Integrations:** Slack/Discord notifications and GitHub commit linking.

---

## 📜 License & Author

**License:** MIT License  
**Author:** Built by Kushagra Maheshwari
