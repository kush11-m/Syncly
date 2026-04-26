import express from 'express';
import cors from 'cors';
import Pusher from 'pusher';
import { userRoutes } from './users/route.js';
import { teamRoutes } from './teams/route.js';
import { taskRoutes } from './tasks/route.js';
import { notificationRoutes } from './notifications/route.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;

// Initialize Pusher for real-time updates on Vercel
export const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true
});


app.get('/', (req, res) => res.send('Syncly API is running'));
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;