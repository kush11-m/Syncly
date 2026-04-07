import { Router } from "express";
import { getMe, getUsers, login, signup, updateMe } from "./controller.js";
import { isAuthenticated } from "../auth/middleware.js";

const router = Router();

router.route('/signup').post(signup);
router.route('/login').post(login);
router.route('/me').get(isAuthenticated, getMe).put(isAuthenticated, updateMe);
router.route('/users').get(isAuthenticated, getUsers);

export const userRoutes = router;