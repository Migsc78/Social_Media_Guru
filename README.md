# Social Media Marketing Agent (SMMA)

An AI-powered Social Media Marketing Agent that analyzes websites and competitors, generates tailored 30-day cross-platform social campaigns, and manages post drafting, approval, and scheduling.

## Architecture

```
backend/    → Node.js + Express + SQLite API server
frontend/   → Vite + React UI
agents/     → LLM-powered analysis & generation agents
```

## Quick Start

### 1. Install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
cd ../agents && npm install
```

### 2. Configure environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys
```

### 3. Run the application
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

- **Backend API**: http://localhost:3001
- **Frontend UI**: http://localhost:5173

## Features

- **Domain Analysis**: Crawl and understand any website's purpose, audience, and brand voice
- **Competitor Research**: Discover and profile key competitors
- **Content Strategy**: Generate content pillars and platform-specific guidelines
- **30-Day Calendar**: Automated campaign calendar with post scheduling
- **Post Generation**: Platform-specific drafts with hooks, hashtags, and CTAs
- **Review & Approval**: Inline editing, regeneration, and bulk approval workflow
- **Social Posting**: OAuth integration for auto-posting to social platforms
