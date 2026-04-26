import prisma from '../utils/db.js';
import { createNotification } from '../notifications/controller.js';
import { pusher } from '../server.js';

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
        const normalizedTeamId = String(teamId || '').trim();

        if (!normalizedTeamId) {
            return res.status(400).json({ message: "Team ID is required" });
        }

        const [team, user] = await Promise.all([
            prisma.team.findUnique({ where: { id: normalizedTeamId } }),
            prisma.user.findUnique({ where: { id: userId } })
        ]);

        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        const existingMember = await prisma.teamMember.findUnique({
            where: {
                userId_teamId: {
                    userId,
                    teamId: normalizedTeamId
                }
            }
        });

        if (existingMember?.status === 'Active') {
            return res.status(200).json({
                message: "Already a team member",
                team: {
                    id: team.id,
                    name: team.name,
                    adminId: team.adminId
                },
                memberStatus: 'Active',
                alreadyMember: true
            });
        }

        if (existingMember) {
            await prisma.teamMember.update({
                where: { id: existingMember.id },
                data: {
                    status: 'Active',
                    role: existingMember.role || 'Member'
                }
            });
        } else {
            await prisma.teamMember.create({
                data: {
                    userId,
                    teamId: normalizedTeamId,
                    status: 'Active',
                    role: 'Member'
                }
            });
        }

        // Notify admin when a new member joins (except when admin joins their own team).
        if (team.adminId !== userId && user) {
            await createNotification(
                team.adminId,
                'member_joined',
                `${user.name} joined ${team.name}`,
                normalizedTeamId
            );

            await pusher.trigger(`user_${team.adminId}`, 'new_notification', {
                type: 'member_joined',
                message: `${user.name} joined ${team.name}`,
                teamId: normalizedTeamId
            });
        }

        // Notify team of updates via team channel
        await pusher.trigger(`team_${normalizedTeamId}`, 'team_updated', { teamId: normalizedTeamId });

        res.status(200).json({
            message: "Joined team successfully",
            team: {
                id: team.id,
                name: team.name,
                adminId: team.adminId
            },
            memberStatus: 'Active',
            alreadyMember: false
        });
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
                            select: { id: true, name: true, email: true, avatarUrl: true, username: true }
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
        await pusher.trigger(`user_${member.userId}`, 'new_notification', {
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
            await pusher.trigger(`user_${activeMember.userId}`, 'new_notification', {
                type: 'member_joined',
                message: `${member.user.name} joined ${member.team.name}`,
                teamId
            });
        }

        // Emit team update event to the entire team
        await pusher.trigger(`team_${teamId}`, 'team_updated', { teamId });

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
        await pusher.trigger(`user_${member.userId}`, 'new_notification', {
            type: 'member_rejected',
            message: `Your request to join ${member.team.name} was declined`,
            teamId
        });

        // Emit team update event to admin
        await pusher.trigger(`user_${userId}`, 'team_updated', { teamId });

        res.status(200).json({ message: "Member rejected" });
    } catch (error) {
        console.error("Reject member error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateMemberRole = async (req, res) => {
    const { teamId, memberId, role } = req.body;
    const userId = req.user.userId;

    console.log("=== ROLE UPDATE DEBUG ===");
    console.log("Request body:", { teamId, memberId, role });
    console.log("userId from token:", userId, typeof userId);

    try {
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team) {
            console.log("Team not found for id:", teamId);
            return res.status(404).json({ message: "Team not found" });
        }

        console.log("team.adminId:", team.adminId, typeof team.adminId);

        const requester = await prisma.teamMember.findUnique({
            where: { userId_teamId: { userId, teamId } }
        });

        console.log("requester:", requester);

        const isOwner = team.adminId === userId;
        console.log("isOwner:", isOwner, `(${team.adminId} === ${userId})`);

        if (!requester || (!isOwner && requester.role?.toLowerCase() !== 'admin')) {
            return res.status(403).json({ message: "Not authorized. Only the team owner or admins can change roles." });
        }

        const validRoles = ['Admin', 'Member', 'Viewer'];
        const formatRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
        
        if (!validRoles.includes(formatRole)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const member = await prisma.teamMember.findUnique({
            where: { id: parseInt(memberId) }
        });

        if (!member || member.teamId !== teamId) {
            return res.status(404).json({ message: "Member not found" });
        }

        if (member.userId === team.adminId) {
            return res.status(400).json({ message: "Cannot change the role of the team owner" });
        }

        if (!isOwner && member.role?.toLowerCase() === 'admin') {
            return res.status(403).json({ message: "Only the owner can change the roles of other Admins." });
        }

        if (!isOwner && formatRole?.toLowerCase() === 'admin') {
            return res.status(403).json({ message: "Only the owner can promote users to Admin." });
        }

        const updatedMember = await prisma.teamMember.update({
            where: { id: parseInt(memberId) },
            data: { role: formatRole }
        });

        // Emit team update event to the entire team
        await pusher.trigger(`team_${teamId}`, 'team_updated', { teamId });

        res.status(200).json({ message: "Member role updated successfully", member: updatedMember });
    } catch (error) {
        console.error("Update role error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
