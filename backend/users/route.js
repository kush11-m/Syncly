import { Router } from "express";
import { getMe, getUsers, login, signup, updateMe, testLogin } from "./controller.js";
import { isAuthenticated } from "../auth/middleware.js";

const router = Router();

router.route('/signup').post(signup);
router.route('/login').post(login);
router.route('/test-login').post(testLogin);
router.route('/me').get(isAuthenticated, getMe).put(isAuthenticated, updateMe);
router.route('/users').get(isAuthenticated, getUsers);

export const userRoutes = router;