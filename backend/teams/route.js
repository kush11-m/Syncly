import { Router } from "express";
import { approveMember, createTeam, getTeam, getUserTeams, joinTeam, rejectMember, updateMemberRole } from "./controller.js";
import { isAuthenticated } from "../auth/middleware.js";

const router = Router();

router.get('/', isAuthenticated, getUserTeams);
router.post('/', isAuthenticated, createTeam);
router.post('/join', isAuthenticated, joinTeam);
router.post('/approve', isAuthenticated, approveMember);
router.post('/reject', isAuthenticated, rejectMember);
router.put('/role', isAuthenticated, updateMemberRole);
router.get('/:teamId', isAuthenticated, getTeam);

export const teamRoutes = router;
