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

        let normalizedAssigneeId = null;
        if (assigneeId !== undefined && assigneeId !== null && assigneeId !== '') {
            const parsedAssigneeId = Number(assigneeId);
            if (!Number.isInteger(parsedAssigneeId)) {
                return res.status(400).json({ message: "Invalid assigneeId" });
            }

            const assigneeMembership = await prisma.teamMember.findUnique({
                where: {
                    userId_teamId: {
                        userId: parsedAssigneeId,
                        teamId
                    }
                }
            });

            if (!assigneeMembership || assigneeMembership.status !== 'Active') {
                return res.status(400).json({ message: "Assignee must be an active member of the team" });
            }

            normalizedAssigneeId = parsedAssigneeId;
        }

        const newTask = await prisma.task.create({
            data: {
                title,
                description,
                teamId,
                assigneeId: normalizedAssigneeId,
                priority: priority || 'Medium',
                dueDate: dueDate ? new Date(dueDate) : null
            },
            include: {
                assignee: { select: { id: true, name: true } }
            }
        });

        // Only notify the assignee (not all team members)
        if (normalizedAssigneeId && normalizedAssigneeId !== userId) {
            const creator = await prisma.user.findUnique({ where: { id: userId } });
            await createNotification(
                normalizedAssigneeId,
                'task_created',
                `${creator.name} assigned you a task: ${title}`,
                teamId,
                newTask.id
            );

            io.to(`user_${normalizedAssigneeId}`).emit('new_notification', {
                type: 'task_created',
                message: `${creator.name} assigned you a task: ${title}`,
                teamId,
                taskId: newTask.id
            });

            io.to(`user_${normalizedAssigneeId}`).emit('task_created', {
                task: newTask,
                teamId
            });
        }

        // Still emit real-time task_created for board sync to all OTHER team members
        const allMembers = await prisma.teamMember.findMany({
            where: { teamId, status: 'Active', userId: { not: userId } }
        });
        for (const member of allMembers) {
            // Skip assignee since we already notified them above
            if (normalizedAssigneeId && member.userId === normalizedAssigneeId) continue;
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

        let normalizedAssigneeId = undefined;
        if (assigneeId !== undefined) {
            if (assigneeId === null || assigneeId === '') {
                normalizedAssigneeId = null;
            } else {
                const parsedAssigneeId = Number(assigneeId);
                if (!Number.isInteger(parsedAssigneeId)) {
                    return res.status(400).json({ message: "Invalid assigneeId" });
                }

                const assigneeMembership = await prisma.teamMember.findUnique({
                    where: {
                        userId_teamId: {
                            userId: parsedAssigneeId,
                            teamId: task.teamId
                        }
                    }
                });

                if (!assigneeMembership || assigneeMembership.status !== 'Active') {
                    return res.status(400).json({ message: "Assignee must be an active member of the team" });
                }

                normalizedAssigneeId = parsedAssigneeId;
            }
        }

        const updatedTask = await prisma.task.update({
            where: { id: parseInt(taskId) },
            data: {
                title: title !== undefined ? title : undefined,
                description: description !== undefined ? description : undefined,
                status: status !== undefined ? status : undefined,
                priority: priority !== undefined ? priority : undefined,
                dueDate: dueDate ? new Date(dueDate) : (dueDate === null ? null : undefined),
                assigneeId: normalizedAssigneeId
            },
            include: {
                assignee: { select: { id: true, name: true } }
            }
        });

        // Only notify the assignee of the task (not all team members)
        const assignee = updatedTask.assigneeId;
        if (assignee && assignee !== userId) {
            const updater = await prisma.user.findUnique({ where: { id: userId } });
            await createNotification(
                assignee,
                'task_updated',
                `${updater.name} updated task: ${task.title}`,
                task.teamId,
                task.id
            );

            io.to(`user_${assignee}`).emit('new_notification', {
                type: 'task_updated',
                message: `${updater.name} updated task: ${task.title}`,
                teamId: task.teamId,
                taskId: task.id
            });

            io.to(`user_${assignee}`).emit('task_updated', {
                task: updatedTask,
                teamId: task.teamId
            });
        }

        // Emit real-time task_updated for board sync to all OTHER team members
        const allMembers = await prisma.teamMember.findMany({
            where: { teamId: task.teamId, status: 'Active', userId: { not: userId } }
        });
        for (const member of allMembers) {
            if (member.userId === assignee) continue;
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

        // Only notify the assignee of the deleted task
        if (task.assigneeId && task.assigneeId !== userId) {
            const deleter = await prisma.user.findUnique({ where: { id: userId } });
            await createNotification(
                task.assigneeId,
                'task_deleted',
                `${deleter.name} deleted task: ${task.title}`,
                task.teamId
            );

            io.to(`user_${task.assigneeId}`).emit('new_notification', {
                type: 'task_deleted',
                message: `${deleter.name} deleted task: ${task.title}`,
                teamId: task.teamId,
                taskId: task.id
            });

            io.to(`user_${task.assigneeId}`).emit('task_deleted', {
                taskId: task.id,
                teamId: task.teamId
            });
        }

        // Emit real-time task_deleted for board sync to all OTHER team members
        const allMembers = await prisma.teamMember.findMany({
            where: { teamId: task.teamId, status: 'Active', userId: { not: userId } }
        });
        for (const member of allMembers) {
            if (member.userId === task.assigneeId) continue;
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
