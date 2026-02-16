# Quick Start Guide

## Get Started in 3 Steps

### 1. Start MongoDB
```bash
docker-compose up -d
```

### 2. Start Backend (Terminal 1)
```bash
cd backend
npm install  # Only needed first time
npm run dev
```

Backend will run on http://localhost:5000

### 3. Start Frontend (Terminal 2)
```bash
cd frontend
npm install  # Only needed first time
npm run dev
```

Frontend will run on http://localhost:3000

## That's it! 🎉

Open http://localhost:3000 in your browser and start managing your recipes!

## First Steps

1. **Import a recipe**: Click "Import from URL" and paste a recipe URL
2. **Or create manually**: Click "+ Add Recipe" to create one from scratch
3. **Browse recipes**: Use filters and search to organize your collection

## Stop the Application

1. Press `Ctrl+C` in both terminal windows
2. Stop MongoDB: `docker-compose down`