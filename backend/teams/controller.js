import prisma from '../utils/db.js';
import { createNotification } from '../notifications/controller.js';
import { io } from '../server.js';

export const createTeam = async (req, res) => {
    const { name } = req.body;
    const userId = req.user.userId;

    try {
        if (!name) {
            return res.status(400).json({ message: "Team name is required" });
        }

        const newTeam = await prisma.team.create({
            data: {
                name,
                adminId: userId,
                members: {
                    create: {
                        userId: userId,
                        role: 'Admin',
                        status: 'Active'
                    }
                }
            }
        });

        res.status(201).json({ message: "Team created", team: newTeam });
    } catch (error) {
        console.error("Create team error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const joinTeam = async (req, res) => {
    const { teamId } = req.body;
    const userId = req.user.userId;

    try {
        if (!teamId) {
            return res.status(400).json({ message: "Team ID is required" });
        }

        const existingMember = await prisma.teamMember.findUnique({
            where: {
                userId_teamId: {
                    userId,
                    teamId
                }
            }
        });

        if (existingMember) {
            return res.status(400).json({ message: "Already a member or pending" });
        }

        await prisma.teamMember.create({
            data: {
                userId,
                teamId,
                status: 'Pending'
            }
        });

        // Notify team admin
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (team && user) {
            await createNotification(
                team.adminId,
                'join_request',
                `${user.name} requested to join ${team.name}`,
                teamId
            );
        }

        res.status(200).json({ message: "Request to join sent" });
    } catch (error) {
        console.error("Join team error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getTeam = async (req, res) => {
    const { teamId } = req.params;

    try {
        const team = await prisma.team.findUnique({
            where: { id: teamId },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                },
                tasks: true
            }
        });

        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        res.status(200).json({ team });
    } catch (error) {
        console.error("Get team error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getUserTeams = async (req, res) => {
    const userId = req.user.userId;

    try {
        const members = await prisma.teamMember.findMany({
            where: { userId, status: 'Active' },
            include: {
                team: true
            }
        });

        const teams = members.map(m => m.team);
        res.status(200).json({ teams });
    } catch (error) {
        console.error("Get user teams error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const approveMember = async (req, res) => {
    const { teamId, memberId } = req.body;
    const userId = req.user.userId;

    try {
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team || team.adminId !== userId) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const member = await prisma.teamMember.findUnique({
            where: { id: parseInt(memberId) },
            include: { user: true, team: true }
        });

        if (!member || member.teamId !== teamId) {
            return res.status(404).json({ message: "Member not found" });
        }

        await prisma.teamMember.update({
            where: { id: parseInt(memberId) },
            data: { status: 'Active', role: 'Member' }
        });

        // Notify the approved user
        await createNotification(
            member.userId,
            'member_approved',
            `Your request to join ${member.team.name} has been approved`,
            teamId
        );

        // Emit real-time notification to approved user
        io.to(`user_${member.userId}`).emit('new_notification', {
            type: 'member_approved',
            message: `Your request to join ${member.team.name} has been approved`,
            teamId
        });

        // Notify all other active team members
        const activeMembers = await prisma.teamMember.findMany({
            where: { teamId, status: 'Active', userId: { not: member.userId } }
        });

        for (const activeMember of activeMembers) {
            await createNotification(
                activeMember.userId,
                'member_joined',
                `${member.user.name} joined ${member.team.name}`,
                teamId
            );
            // Emit real-time notification
            io.to(`user_${activeMember.userId}`).emit('new_notification', {
                type: 'member_joined',
                message: `${member.user.name} joined ${member.team.name}`,
                teamId
            });
        }

        // Emit team update event to all team members including admin
        const allMembers = await prisma.teamMember.findMany({
            where: { teamId, status: 'Active' }
        });
        for (const m of allMembers) {
            io.to(`user_${m.userId}`).emit('team_updated', { teamId });
        }

        res.status(200).json({ message: "Member approved" });
    } catch (error) {
        console.error("Approve member error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const rejectMember = async (req, res) => {
    const { teamId, memberId } = req.body;
    const userId = req.user.userId;

    try {
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team || team.adminId !== userId) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const member = await prisma.teamMember.findUnique({
            where: { id: parseInt(memberId) },
            include: { user: true, team: true }
        });

        if (!member || member.teamId !== teamId) {
            return res.status(404).json({ message: "Member not found" });
        }

        await prisma.teamMember.delete({
            where: { id: parseInt(memberId) }
        });

        // Notify the rejected user
        await createNotification(
            member.userId,
            'member_rejected',
            `Your request to join ${member.team.name} was declined`,
            teamId
        );

        // Emit real-time notification to rejected user
        io.to(`user_${member.userId}`).emit('new_notification', {
            type: 'member_rejected',
            message: `Your request to join ${member.team.name} was declined`,
            teamId
        });

        // Emit team update event to admin
        io.to(`user_${userId}`).emit('team_updated', { teamId });

        res.status(200).json({ message: "Member rejected" });
    } catch (error) {
        console.error("Reject member error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
