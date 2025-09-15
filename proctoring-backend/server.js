import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize, ProctoringSession, EventLog } from './models.js';

const app = express();

// --- Middleware Setup ---
app.use(cors());
app.use(express.json());

// --- API Routes ---

// Health check endpoint to verify database connectivity
app.get('/api/health', async (req, res) => {
  try {
    // Perform a simple, fast query to ensure the database is truly ready.
    await sequelize.query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    // If the query fails, it means the DB is not ready.
    console.error('Health check failed, database not ready:', error.message);
    res.status(503).json({ status: 'error', database: 'connecting' });
  }
});

// Start a new proctoring session
app.post('/api/sessions', async (req, res) => {
  try {
    const { candidateName } = req.body;
    if (!candidateName) return res.status(400).json({ error: 'Candidate name is required.' });
    
    const newSession = await ProctoringSession.create({ candidateName });
    res.status(201).json(newSession);
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session.' });
  }
});

// Log a new event
app.post('/api/events', async (req, res) => {
  try {
    const { sessionId, eventType, message, deduction } = req.body;
    const session = await ProctoringSession.findByPk(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found.' });

    session.finalIntegrityScore = Math.max(0, session.finalIntegrityScore - deduction);
    await session.save();

    const newEvent = await EventLog.create({ sessionId, eventType, message, deduction });
    res.status(201).json({ newEvent, updatedScore: session.finalIntegrityScore });
  } catch (error) {
    console.error('Error logging event:', error);
    res.status(500).json({ error: 'Failed to log event.' });
  }
});

// Full report for a session
app.get('/api/sessions/:id', async (req, res) => {
  try {
    const session = await ProctoringSession.findByPk(req.params.id, {
      include: {
        model: EventLog,
        as: 'events',
        order: [['id', 'ASC']],
      },
    });
    if (!session) return res.status(404).json({ error: 'Session report not found.' });
    res.json(session);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report.' });
  }
});

// End a proctoring session
app.put('/api/sessions/:id/end', async (req, res) => {
  try {
    const session = await ProctoringSession.findByPk(req.params.id);
    if (!session) return res.status(444).json({ error: 'Session not found.' });

    session.endTime = new Date();
    await session.save();
    res.json(session);
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session.' });
  }
});

// --- Serve React frontend in production ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  // Path to React build
  const frontendBuildPath = path.join(__dirname, 'frontend');
  app.use(express.static(frontendBuildPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await sequelize.authenticate();
    console.log('Azure SQL database connected successfully.');
    await sequelize.sync({ alter: true });
    console.log('Database synchronized.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
});