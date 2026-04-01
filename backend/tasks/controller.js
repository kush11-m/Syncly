import prisma from '../utils/db.js';
import { createNotification } from '../notifications/controller.js';
import { io } from '../server.js';

export const createTask = async (req, res) => {
    const { title, description, teamId, assigneeId, priority, dueDate } = req.body;
    const userId = req.user.userId;

    try {
        if (!title || !teamId) {
            return res.status(400).json({ message: "Title and Team ID are required" });
        }

        const member = await prisma.teamMember.findUnique({
            where: {
                userId_teamId: {
                    userId,
                    teamId
                }
            }
        });

        if (!member || member.status !== 'Active') {
            return res.status(403).json({ message: "Not authorized to create tasks for this team" });
        }

        const newTask = await prisma.task.create({
            data: {
                title,
                description,
                teamId,
                assigneeId: assigneeId || null,
                priority: priority || 'Medium',
                dueDate: dueDate ? new Date(dueDate) : null
            }
        });

        // Notify team members except creator
        const creator = await prisma.user.findUnique({ where: { id: userId } });
        const teamMembers = await prisma.teamMember.findMany({
            where: { teamId, status: 'Active', userId: { not: userId } }
        });

        for (const member of teamMembers) {
            await createNotification(
                member.userId,
                'task_created',
                `${creator.name} created task: ${title}`,
                teamId,
                newTask.id
            );
        }

        // Emit real-time event to all team members EXCEPT the creator
        const allMembers = await prisma.teamMember.findMany({
            where: { teamId, status: 'Active', userId: { not: userId } }
        });
        for (const member of allMembers) {
            io.to(`user_${member.userId}`).emit('task_created', {
                task: newTask,
                teamId
            });
        }

        res.status(201).json({ message: "Task created", task: newTask });
    } catch (error) {
        console.error("Create task error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getTeamTasks = async (req, res) => {
    const { teamId } = req.params;
    const userId = req.user.userId;

    try {
        const member = await prisma.teamMember.findUnique({
            where: {
                userId_teamId: {
                    userId,
                    teamId
                }
            }
        });

        if (!member || member.status !== 'Active') {
            return res.status(403).json({ message: "Not authorized to view tasks for this team" });
        }

        const tasks = await prisma.task.findMany({
            where: { teamId },
            include: {
                assignee: {
                    select: { id: true, name: true }
                }
            }
        });

        res.status(200).json({ tasks });
    } catch (error) {
        console.error("Get tasks error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateTask = async (req, res) => {
    const { taskId } = req.params;
    const { title, description, status, priority, dueDate, assigneeId } = req.body;
    const userId = req.user.userId;

    try {
        const task = await prisma.task.findUnique({ where: { id: parseInt(taskId) } });
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const member = await prisma.teamMember.findUnique({
            where: {
                userId_teamId: {
                    userId,
                    teamId: task.teamId
                }
            }
        });

        if (!member || member.status !== 'Active') {
            return res.status(403).json({ message: "Not authorized to update tasks for this team" });
        }

        const updatedTask = await prisma.task.update({
            where: { id: parseInt(taskId) },
            data: {
                title: title !== undefined ? title : undefined,
                description: description !== undefined ? description : undefined,
                status: status !== undefined ? status : undefined,
                priority: priority !== undefined ? priority : undefined,
                dueDate: dueDate ? new Date(dueDate) : (dueDate === null ? null : undefined),
                assigneeId: assigneeId !== undefined ? assigneeId : undefined
            }
        });

        // Notify team members except updater
        const updater = await prisma.user.findUnique({ where: { id: userId } });
        const teamMembers = await prisma.teamMember.findMany({
            where: { teamId: task.teamId, status: 'Active', userId: { not: userId } }
        });

        for (const member of teamMembers) {
            await createNotification(
                member.userId,
                'task_updated',
                `${updater.name} updated task: ${task.title}`,
                task.teamId,
                task.id
            );
        }

        // Emit real-time event to all team members EXCEPT the one who made the update
        const allMembers = await prisma.teamMember.findMany({
            where: { teamId: task.teamId, status: 'Active', userId: { not: userId } }
        });
        for (const member of allMembers) {
            io.to(`user_${member.userId}`).emit('task_updated', {
                task: updatedTask,
                teamId: task.teamId
            });
        }

        res.status(200).json({ message: "Task updated", task: updatedTask });
    } catch (error) {
        console.error("Update task error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteTask = async (req, res) => {
    const { taskId } = req.params;
    const userId = req.user.userId;

    try {
        const task = await prisma.task.findUnique({ where: { id: parseInt(taskId) } });
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const member = await prisma.teamMember.findUnique({
            where: {
                userId_teamId: {
                    userId,
                    teamId: task.teamId
                }
            }
        });

        if (!member || member.status !== 'Active') {
            return res.status(403).json({ message: "Not authorized to delete tasks for this team" });
        }

        await prisma.task.delete({ where: { id: parseInt(taskId) } });

        // Notify team members except deleter
        const deleter = await prisma.user.findUnique({ where: { id: userId } });
        const teamMembers = await prisma.teamMember.findMany({
            where: { teamId: task.teamId, status: 'Active', userId: { not: userId } }
        });

        for (const member of teamMembers) {
            await createNotification(
                member.userId,
                'task_deleted',
                `${deleter.name} deleted task: ${task.title}`,
                task.teamId
            );
        }

        // Emit real-time event to all team members EXCEPT the deleter
        const allMembers = await prisma.teamMember.findMany({
            where: { teamId: task.teamId, status: 'Active', userId: { not: userId } }
        });
        for (const member of allMembers) {
            io.to(`user_${member.userId}`).emit('task_deleted', {
                taskId: task.id,
                teamId: task.teamId
            });
        }

        res.status(200).json({ message: "Task deleted" });
    } catch (error) {
        console.error("Delete task error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
