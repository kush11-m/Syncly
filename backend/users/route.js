import { Router } from "express";
import { getUsers, login, signup } from "./controller.js";
import { isAuthenticated } from "../auth/middleware.js";

const router = Router();

router.route('/signup').post(signup);
router.route('/login').post(login);
router.route('/users').get(isAuthenticated, getUsers);

export const userRoutes = router;