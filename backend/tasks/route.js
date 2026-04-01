import { Router } from "express";
import { createTask, getTeamTasks, updateTask, deleteTask } from "./controller.js";
import { isAuthenticated } from "../auth/middleware.js";

const router = Router();

router.post('/', isAuthenticated, createTask);
router.get('/team/:teamId', isAuthenticated, getTeamTasks);
router.put('/:taskId', isAuthenticated, updateTask);
router.delete('/:taskId', isAuthenticated, deleteTask);

export const taskRoutes = router;
