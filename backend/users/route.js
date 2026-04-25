import { Router } from "express";
import { getMe, getUsers, login, signup, updateMe, testLogin } from "./controller.js";
import { isAuthenticated } from "../auth/middleware.js";

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/test-login', testLogin);
router.get('/me', isAuthenticated, getMe);
router.put('/me', isAuthenticated, updateMe);
router.get('/users', isAuthenticated, getUsers);

export const userRoutes = router;