import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/db.js';

const usernameRegex = /^[a-z0-9_]{3,30}$/;

const formatUserForClient = (user) => ({
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: "User"
});

const isValidAvatarUrl = (value) => {
    if (typeof value !== 'string') return false;

    const trimmedValue = value.trim();
    if (!trimmedValue) return false;

    const isHttpUrl = /^https?:\/\/.+/i.test(trimmedValue);
    const isImageDataUrl = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i.test(trimmedValue);

    return isHttpUrl || isImageDataUrl;
};

export const signup = async (req, res) => {
    const { name, username, email, password } = req.body;
    try {
        if (!name || !username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const normalizedUsername = username.trim().toLowerCase();

        if (!usernameRegex.test(normalizedUsername)) {
            return res.status(400).json({
                message: "Username must be 3-30 characters and contain only lowercase letters, numbers, and underscores"
            });
        }

        const [existingByEmail, existingByUsername] = await Promise.all([
            prisma.user.findUnique({ where: { email } }),
            prisma.user.findUnique({ where: { username: normalizedUsername } })
        ]);

        if (existingByEmail) {
            return res.status(400).json({ message: "User already exists" });
        }

        if (existingByUsername) {
            return res.status(400).json({ message: "Username is already taken" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: { name, username: normalizedUsername, email, password: hashedPassword },
        });

        const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            message: "User created",
            token,
            user: formatUserForClient(newUser)
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Server error" });
    }
}

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({
            token,
            user: formatUserForClient(user)
        });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
}

export const getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, username: true, email: true, avatarUrl: true },
        });
        res.status(200).json({ users });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
}

export const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user: formatUserForClient(user) });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const updateMe = async (req, res) => {
    const { name, username, avatarUrl } = req.body;
    const userId = req.user.userId;

    try {
        const dataToUpdate = {};

        if (typeof name === 'string') {
            const trimmedName = name.trim();
            if (!trimmedName) {
                return res.status(400).json({ message: "Name cannot be empty" });
            }
            dataToUpdate.name = trimmedName;
        }

        if (typeof username === 'string') {
            const normalizedUsername = username.trim().toLowerCase();

            if (!usernameRegex.test(normalizedUsername)) {
                return res.status(400).json({
                    message: "Username must be 3-30 characters and contain only lowercase letters, numbers, and underscores"
                });
            }

            const existingByUsername = await prisma.user.findUnique({ where: { username: normalizedUsername } });
            if (existingByUsername && existingByUsername.id !== userId) {
                return res.status(400).json({ message: "Username is already taken" });
            }

            dataToUpdate.username = normalizedUsername;
        }

        if (avatarUrl === null) {
            dataToUpdate.avatarUrl = null;
        } else if (typeof avatarUrl === 'string') {
            const trimmedAvatarUrl = avatarUrl.trim();

            if (!trimmedAvatarUrl) {
                dataToUpdate.avatarUrl = null;
            } else {
                if (!isValidAvatarUrl(trimmedAvatarUrl)) {
                    return res.status(400).json({ message: "Invalid avatar URL or image data" });
                }

                // Keep large base64 payloads bounded so profile updates remain fast.
                if (trimmedAvatarUrl.length > 5 * 1024 * 1024) {
                    return res.status(400).json({ message: "Avatar image is too large" });
                }

                dataToUpdate.avatarUrl = trimmedAvatarUrl;
            }
        }

        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ message: "No valid profile fields provided" });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: dataToUpdate
        });

        res.status(200).json({
            message: "Profile updated",
            user: formatUserForClient(updatedUser)
        });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
};