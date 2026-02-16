# Getting Started

This guide will help you set up the Recipe Book application for local development.

## Prerequisites

- **Node.js** (v18 or higher)
- **Docker & Docker Compose** (for MongoDB)
- **npm** or **yarn**

## Installation Steps

### 1. Navigate to Project Directory

```bash
cd recipe-book
```

### 2. Start MongoDB with Docker

```bash
docker-compose up -d
```

This starts MongoDB on port 27017.

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Configure Environment Variables

Copy the example environment file and configure as needed:

```bash
cd backend
cp .env.example .env
```

The default `.env` file should contain:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/recipe-book
NODE_ENV=development
```

**Note:** The `.env` file is git-ignored for security. Never commit it to the repository.

### 5. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

## Running the Application

### Start Backend Server

```bash
cd backend
npm run dev
```

The API server will start on http://localhost:5000

### Start Frontend Development Server

In a new terminal:

```bash
cd frontend
npm run dev
```

The frontend will start on http://localhost:3000

## Verify Installation

1. Open http://localhost:3000 in your browser
2. You should see the Recipe Book interface
3. Try adding a recipe manually or importing one from a URL

## Stopping the Application

1. Stop the dev servers (Ctrl+C in both terminals)
2. Stop MongoDB:
   ```bash
   docker-compose down
   ```

## Troubleshooting

### MongoDB won't start
- Ensure Docker is running
- Check if port 27017 is available
- Try `docker-compose down -v` then `docker-compose up -d`

### Backend connection errors
- Verify MongoDB is running: `docker ps`
- Check the `.env` file configuration
- Ensure port 5000 is not in use

### Frontend build errors
- Clear node_modules: `rm -rf node_modules package-lock.json`
- Reinstall dependencies: `npm install`
- Check Node.js version: `node --version` (should be v18+)

### CORS errors
- Ensure backend is running on port 5000
- Check that Vite proxy is configured correctly in `vite.config.js`

## Next Steps

- [Recipe Management](features/recipe-management.md) - Learn how to manage recipes
- [Recipe Import](features/recipe-import.md) - Import recipes from URLs
- [API Reference](api/api-reference.md) - Explore the API