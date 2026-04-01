import { Router } from "express";
import { createTeam, joinTeam, getTeam, getUserTeams, approveMember, rejectMember } from "./controller.js";
import { isAuthenticated } from "../auth/middleware.js";

const router = Router();

router.post('/', isAuthenticated, createTeam);
router.get('/', isAuthenticated, getUserTeams);
router.post('/join', isAuthenticated, joinTeam);
router.post('/approve', isAuthenticated, approveMember);
router.post('/reject', isAuthenticated, rejectMember);
router.get('/:teamId', isAuthenticated, getTeam);

export const teamRoutes = router;
