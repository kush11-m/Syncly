import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { userRoutes } from './users/route.js';
import { teamRoutes } from './teams/route.js';
import { taskRoutes } from './tasks/route.js';
import { notificationRoutes } from './notifications/route.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;

// Create HTTP server and attach Socket.IO
const httpServer = createServer(app);
export const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:5175", "https://syncly-kush.vercel.app"], // Development and Production URLs
        methods: ["GET", "POST"]
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user to their personal room for targeted notifications
    socket.on('join_room', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined room user_${userId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

app.get('/', (req, res) => res.send('Syncly API is running'));
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);

httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});