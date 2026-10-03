import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from './src/db/index.ts';
import { users, postSessions, securityViolations, salaryAdvances, chatMessages } from './src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Serve static assets from public folder
app.use(express.static(path.resolve(__dirname, 'public')));

// Download Zip API
app.get('/api/download-zip', (req, res) => {
  const zipPath = path.resolve(__dirname, 'public', 'delta-force-boosting.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="delta-force-boosting.zip"');
    res.download(zipPath, 'delta-force-boosting.zip');
  } else {
    res.status(404).json({ error: 'Fichier zip introuvable.' });
  }
});

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'delta-force-boosting', database: 'cloudsql-postgresql' });
});

// Users API
app.get('/api/users', async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  } catch (error) {
    console.error('Failed to query users from Cloud SQL:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Posts / Shifts API
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await db.select().from(postSessions).orderBy(desc(postSessions.createdAt));
    res.json(posts);
  } catch (error) {
    console.error('Failed to query posts from Cloud SQL:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const postData = req.body;
    const inserted = await db.insert(postSessions).values(postData).returning();
    res.json(inserted[0]);
  } catch (error) {
    console.error('Failed to insert post in Cloud SQL:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Security Violations ("Petit Malin") API
app.get('/api/security-violations', async (req, res) => {
  try {
    const violations = await db.select().from(securityViolations).orderBy(desc(securityViolations.createdAt));
    res.json(violations);
  } catch (error) {
    console.error('Failed to query security violations from Cloud SQL:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.post('/api/security-violations', async (req, res) => {
  try {
    const violationData = req.body;
    const inserted = await db.insert(securityViolations).values(violationData).returning();
    res.json(inserted[0]);
  } catch (error) {
    console.error('Failed to record security violation in Cloud SQL:', error);
    res.status(500).json({ error: 'Failed to record violation' });
  }
});

// Salary Advances ("DMD d'avance") API
app.get('/api/salary-advances', async (req, res) => {
  try {
    const advances = await db.select().from(salaryAdvances).orderBy(desc(salaryAdvances.createdAt));
    res.json(advances);
  } catch (error) {
    console.error('Failed to query salary advances from Cloud SQL:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.post('/api/salary-advances', async (req, res) => {
  try {
    const advanceData = req.body;
    const inserted = await db.insert(salaryAdvances).values(advanceData).returning();
    res.json(inserted[0]);
  } catch (error) {
    console.error('Failed to submit salary advance in Cloud SQL:', error);
    res.status(500).json({ error: 'Failed to submit advance' });
  }
});

// Chat Messages API
app.get('/api/chat-messages', async (req, res) => {
  try {
    const messages = await db.select().from(chatMessages).orderBy(desc(chatMessages.createdAt));
    res.json(messages);
  } catch (error) {
    console.error('Failed to query chat messages from Cloud SQL:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.post('/api/chat-messages', async (req, res) => {
  try {
    const messageData = req.body;
    const inserted = await db.insert(chatMessages).values(messageData).returning();
    res.json(inserted[0]);
  } catch (error) {
    console.error('Failed to send chat message in Cloud SQL:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Vite Middleware for Full-Stack Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (Connected to Cloud SQL PostgreSQL)`);
  });
}

startServer();
