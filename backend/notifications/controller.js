import prisma from '../utils/db.js';

export const getNotifications = async (req, res) => {
    const userId = req.user.userId;

    try {
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        res.status(200).json({ notifications });
    } catch (error) {
        console.error("Get notifications error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const markAsRead = async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user.userId;

    try {
        const notification = await prisma.notification.findUnique({
            where: { id: parseInt(notificationId) }
        });

        if (!notification || notification.userId !== userId) {
            return res.status(404).json({ message: "Notification not found" });
        }

        await prisma.notification.update({
            where: { id: parseInt(notificationId) },
            data: { read: true }
        });

        res.status(200).json({ message: "Marked as read" });
    } catch (error) {
        console.error("Mark as read error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const markAllAsRead = async (req, res) => {
    const userId = req.user.userId;

    try {
        await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });

        res.status(200).json({ message: "All marked as read" });
    } catch (error) {
        console.error("Mark all as read error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteNotification = async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user.userId;

    try {
        const notification = await prisma.notification.findUnique({
            where: { id: parseInt(notificationId) }
        });

        if (!notification || notification.userId !== userId) {
            return res.status(404).json({ message: "Notification not found" });
        }

        await prisma.notification.delete({
            where: { id: parseInt(notificationId) }
        });

        res.status(200).json({ message: "Notification deleted" });
    } catch (error) {
        console.error("Delete notification error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const createNotification = async (userId, type, message, teamId = null, taskId = null) => {
    try {
        await prisma.notification.create({
            data: {
                userId,
                type,
                message,
                teamId,
                taskId
            }
        });
    } catch (error) {
        console.error("Create notification error:", error);
    }
};
