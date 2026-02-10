import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/database.js';
import { domainRoutes } from './routes/domains.js';
import { agentIORoutes } from './routes/agentIO.js';
import { crawlRoutes } from './routes/crawl.js';
import { postRoutes } from './routes/posts.js';
import { pipelineRoutes } from './routes/pipeline.js';
import { settingsRoutes } from './routes/settings.js';
import { personaRoutes } from './routes/personas.js';

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DATABASE_PATH || './data/smma.db';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api/domains', domainRoutes);
app.use('/api/agent', agentIORoutes);
app.use('/api', crawlRoutes);
app.use('/api', postRoutes);
app.use('/api', pipelineRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/personas', personaRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'SMMA Backend', version: '1.0.0' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Initialize database then start server
(async () => {
    await initDatabase(DB_PATH);
    app.listen(PORT, () => {
        console.log(`[SMMA] Backend running at http://localhost:${PORT}`);
    });
})();

export default app;
