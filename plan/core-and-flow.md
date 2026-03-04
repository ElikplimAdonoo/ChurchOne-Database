# ChurchOne — Core & Flow

## Who Is This App For?
**Cell Shepherds, MC Leaders, and Zonal Pastors** — not developers. Every screen must answer a question a church leader would ask, not display raw database metrics.

## The 4 Screens

### 1. Home (`/`)
**User Question**: "What's happening in my church right now?"

| Card | What It Shows | Why It Matters |
|------|---------------|----------------|
| My Members | Total people in your zone/MC/cell | Know your flock size |
| Active Cells | Units with assigned shepherds | Spot gaps in coverage |
| This Week | Attendance trend (up/down arrow) | Quick pulse check |
| Needs Attention | Units without leaders, inactive members | Actionable alerts |

Below the cards: **Church Structure Tree** — expandable view of the organizational hierarchy (Zones → MCs → Buscentas → Cells → Members).

> **Design Note**: Cards should feel warm and approachable. Use church brand colors, rounded corners, and clear labels. Avoid technical jargon like "Placement Rate" or "System Health."

### 2. Directory (`/directory`)
**User Question**: "How do I find someone and see their details?"

- Search bar at the top
- Member cards showing: Photo, Name, Role, Cell/Unit
- Tap a member → Edit their details (name, phone, unit assignment)
- "+ Add Member" button always visible
- Filter by Unit, Role, or Status

### 3. Structure (`/mindmap`)
**User Question**: "What does my church look like from the top down?"

- Interactive map showing the full hierarchy
- Tap a node → See who leads it and its members
- Search bar to find any unit or person on the map

### 4. Attendance (`/attendance`)
**User Question**: "Who came to service this week?"

- Select your cell/unit
- Check off members who were present
- View weekly/monthly trends

## Navigation
- **Desktop**: Top navigation bar with 4 tabs
- **Mobile**: Bottom tab bar (fixed, always visible)
- Swiping left/right switches between tabs

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS + Framer Motion
- **Backend**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth via `AuthContext`
- **Layout**: Single `MainLayout` wrapping all protected routes via `Outlet`

## Current File Structure
```
src/
├── pages/           ← One file per screen
│   ├── DashboardPage.jsx
│   ├── PeopleDirectoryPage.jsx
│   ├── HierarchyMindMapPage.jsx
│   └── AttendancePage.jsx
├── components/      ← Shared UI pieces
│   ├── layout/MainLayout.jsx
│   ├── HierarchyTree.jsx
│   ├── common/ImageModal.jsx
│   └── ui/Modal.jsx
├── hooks/           ← Custom hooks
├── services/        ← Supabase API calls
├── utils/           ← Shared logic (treeUtils)
└── contexts/        ← AuthContext
```
