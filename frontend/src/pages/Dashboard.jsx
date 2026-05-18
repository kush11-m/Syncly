import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import Pusher from "pusher-js";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import {
  Calendar as CalendarIcon, Kanban, Search, LogOut, Plus,
  ChevronDown, Users, Bell, ChevronLeft, ChevronRight, Pencil, Trash2, Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../App";
import TaskModal from "../components/TaskModal";
import TeamModal from "../components/TeamModal";
import CreateTeamModal from "../components/CreateTeamModal";
import TaskCard, { getInitials } from "../components/TaskCard";
import RightSidebar from "../components/RightSidebar";
import BackgroundWave from "../components/BackgroundWave";
import NotificationPanel from "../components/NotificationPanel";
import { getTeamPath, getTeamSlug } from "../utils/teamUrl";

import { env } from "../config";

const DEFAULT_COLUMNS = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "done", title: "Done" },
];

const toColumnId = (value) => {
  const base = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return base || `column-${Date.now()}`;
};

const createDefaultColumnsState = () => {
  const next = {};
  DEFAULT_COLUMNS.forEach((column) => {
    next[column.id] = { ...column, taskIds: [] };
  });
  return next;
};

const createUniqueColumn = (title, existingColumns) => {
  const cleanedTitle = String(title || "").trim();
  const safeTitle = cleanedTitle || "Untitled";
  const existingIds = new Set(Object.keys(existingColumns || {}));
  const existingTitles = new Set(
    Object.values(existingColumns || {}).map((column) => column.title.toLowerCase())
  );

  if (existingTitles.has(safeTitle.toLowerCase())) return null;

  const baseId = toColumnId(safeTitle);
  let id = baseId;
  let idx = 1;
  while (existingIds.has(id)) {
    id = `${baseId}-${idx}`;
    idx += 1;
  }

  return { id, title: safeTitle, taskIds: [] };
};

const findColumnIdByStatus = (status, currentColumns, currentOrder) => {
  const normalizedStatus = String(status || "").trim().toLowerCase();
  if (!normalizedStatus) return currentOrder?.[0] || DEFAULT_COLUMNS[0].id;

  const byTitle = currentOrder?.find((columnId) => {
    const column = currentColumns[columnId];
    return column?.title?.toLowerCase() === normalizedStatus;
  });
  if (byTitle) return byTitle;

  const byId = currentOrder?.find((columnId) => columnId.toLowerCase() === normalizedStatus);
  if (byId) return byId;

  return currentOrder?.[0] || DEFAULT_COLUMNS[0].id;
};

export default function Dashboard({ openSettings = false }) {
  const { teamSlug } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navigateToTeam = (targetTeam) => {
    if (!targetTeam) return;
    navigate(getTeamPath(user, targetTeam));
  };

  const [view, setView] = useState("board");
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [tasks, setTasks] = useState({});
  const [columns, setColumns] = useState(createDefaultColumnsState());
  const [columnOrder, setColumnOrder] = useState(DEFAULT_COLUMNS.map((column) => column.id));
  const [team, setTeam] = useState(null);
  const [myTeams, setMyTeams] = useState([]);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(openSettings);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [targetColumn, setTargetColumn] = useState("todo");
  const [unreadCount, setUnreadCount] = useState(0);
  const [boardRenderVersion, setBoardRenderVersion] = useState(0);
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const [columnNameError, setColumnNameError] = useState("");
  const [deleteConfirmColumnId, setDeleteConfirmColumnId] = useState(null);

  // Track pending drag updates to avoid processing Pusher events for local drags
  const pendingDragUpdates = useRef(new Set());

  const normalizeTaskId = (taskId) => String(taskId);

  const statusToColumnId = (status, sourceColumns = columns, sourceOrder = columnOrder) =>
    findColumnIdByStatus(status, sourceColumns, sourceOrder);

  const columnIdToStatus = (columnId, sourceColumns = columns, sourceOrder = columnOrder) => {
    if (sourceColumns[columnId]?.title) return sourceColumns[columnId].title;
    const fallbackId = sourceOrder?.[0] || DEFAULT_COLUMNS[0].id;
    return sourceColumns[fallbackId]?.title || "To Do";
  };

  const forceBoardRerender = () => {
    setBoardRenderVersion((prev) => prev + 1);
  };

  useEffect(() => {
    if (openSettings) setIsTeamModalOpen(true);
  }, [openSettings]);

  const getColumnsStorageKey = (teamId) => `syncly_columns_${teamId}`;

  const loadSavedBoardColumns = (teamId) => {
    if (!teamId) return null;
    try {
      const raw = localStorage.getItem(getColumnsStorageKey(teamId));
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;

      const parsedColumns = parsed.columns || {};
      const parsedOrder = Array.isArray(parsed.columnOrder) ? parsed.columnOrder : [];

      const cleanedColumns = {};
      parsedOrder.forEach((columnId) => {
        const column = parsedColumns[columnId];
        if (!column?.id || !column?.title) return;
        cleanedColumns[column.id] = { id: column.id, title: column.title, taskIds: [] };
      });

      if (!Object.keys(cleanedColumns).length) return null;
      return { columns: cleanedColumns, columnOrder: Object.keys(cleanedColumns) };
    } catch (error) {
      console.error("Failed to load board columns:", error);
      return null;
    }
  };

  const saveBoardColumns = (teamId, nextColumns, nextOrder) => {
    if (!teamId) return;
    try {
      const minimalColumns = {};
      nextOrder.forEach((columnId) => {
        const column = nextColumns[columnId];
        if (!column) return;
        minimalColumns[columnId] = { id: column.id, title: column.title };
      });

      localStorage.setItem(
        getColumnsStorageKey(teamId),
        JSON.stringify({ columns: minimalColumns, columnOrder: nextOrder })
      );
    } catch (error) {
      console.error("Failed to save board columns:", error);
    }
  };

  const fetchTeamAndTasks = async () => {
    setLoading(true);
    try {
      const teamsRes = await fetch(`${env.BACKEND_URL}/api/teams`, {
        headers: { 'Authorization': user?.token }
      });

      let activeTeamId = null;

      if (teamsRes.status === 401) {
        logout();
        navigate('/auth/login', { replace: true });
        return;
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        const availableTeams = teamsData.teams || [];
        setMyTeams(availableTeams);

        if (availableTeams.length === 0) {
          setTeam(null);
          setLoading(false);
          return;
        }

        if (!teamSlug) {
          navigateToTeam(availableTeams[0]);
          return;
        }

        const matchedTeam = availableTeams.find((candidateTeam) => getTeamSlug(candidateTeam) === teamSlug);

        if (!matchedTeam) {
          navigateToTeam(availableTeams[0]);
          return;
        }

        activeTeamId = matchedTeam.id;
      }

      if (!activeTeamId) {
        setLoading(false);
        return;
      }

      const teamRes = await fetch(`${env.BACKEND_URL}/api/teams/${activeTeamId}`, {
        headers: { 'Authorization': user?.token }
      });

      if (teamRes.status === 401) {
        logout();
        navigate('/auth/login', { replace: true });
        return;
      }

      if (teamRes.ok) {
        const teamData = await teamRes.json();
        // Transform members to flatten the structure
        const transformedTeam = {
          ...teamData.team,
          members: teamData.team.members?.map(member => ({
            id: member.id, // This is the TeamMember ID, needed for approve/reject
            userId: member.user.id,
            name: member.user.name,
            email: member.user.email,
            role: member.role,
            status: member.status
          })) || []
        };
        setTeam(transformedTeam);
      }

      const tasksRes = await fetch(`${env.BACKEND_URL}/api/tasks/team/${activeTeamId}`, {
        headers: { 'Authorization': user?.token }
      });

      if (tasksRes.status === 401) {
        logout();
        navigate('/auth/login', { replace: true });
        return;
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        const newTasks = {};
        const storedBoard = loadSavedBoardColumns(activeTeamId);
        const newColumns = storedBoard?.columns || createDefaultColumnsState();
        const nextOrder = storedBoard?.columnOrder || DEFAULT_COLUMNS.map((column) => column.id);

        tasksData.tasks.forEach(task => {
          const taskId = normalizeTaskId(task.id);
          newTasks[taskId] = { ...task, content: task.title };

          let statusColumnId = statusToColumnId(task.status, newColumns, nextOrder);
          const statusExists = nextOrder.some((columnId) => newColumns[columnId]?.title?.toLowerCase() === String(task.status || "").trim().toLowerCase());

          if (!statusExists && String(task.status || "").trim()) {
            const dynamicColumn = createUniqueColumn(task.status, newColumns);
            if (dynamicColumn) {
              newColumns[dynamicColumn.id] = dynamicColumn;
              nextOrder.push(dynamicColumn.id);
              statusColumnId = dynamicColumn.id;
            }
          }

          if (newColumns[statusColumnId]) {
            newColumns[statusColumnId].taskIds.push(taskId);
          }
        });

        setTasks(newTasks);
        setColumns(newColumns);
        setColumnOrder(nextOrder);
        saveBoardColumns(activeTeamId, newColumns, nextOrder);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamAndTasks();
  }, [teamSlug, user]);

  useEffect(() => {
    if (!team?.id) return;
    saveBoardColumns(team.id, columns, columnOrder);
  }, [team?.id, columns, columnOrder]);

  const pusherRef = useRef(null);

  // Pusher connection setup
  useEffect(() => {
    if (!user) return;

    const activeTeamId = team?.id ? String(team.id) : null;

    if (!env.PUSHER_KEY) {
      console.warn('Pusher key is missing. Real-time updates will not work.');
      return;
    }

    // Clean up previous instance if it exists
    if (pusherRef.current) {
      pusherRef.current.disconnect();
    }

    const pusher = new Pusher(env.PUSHER_KEY, {
      cluster: env.PUSHER_CLUSTER,
      forceTLS: true
    });

    pusherRef.current = pusher;

    const userChannel = pusher.subscribe(`user_${user.id}`);
    const teamChannel = activeTeamId ? pusher.subscribe(`team_${activeTeamId}`) : null;
    
    pusher.connection.bind('connected', () => {
      console.log('Pusher Connected');
      setIsConnected(true);
    });

    pusher.connection.bind('disconnected', () => {
      setIsConnected(false);
    });

    // Listen for new notifications (User Channel)
    userChannel.bind('new_notification', (notification) => {
      console.log('New notification:', notification);
      setUnreadCount(prev => prev + 1);
    });

    if (teamChannel) {
      // Listen for team updates (Team Channel)
      teamChannel.bind('team_updated', async ({ teamId }) => {
        console.log('Team updated:', teamId);
        // Only refresh the team metadata (members/name) instead of refetching all tasks
        if (activeTeamId && String(teamId) === activeTeamId) {
          try {
            const teamRes = await fetch(`${env.BACKEND_URL}/api/teams/${activeTeamId}`, {
              headers: { 'Authorization': user?.token }
            });

            if (teamRes.ok) {
              const teamData = await teamRes.json();
              const transformedTeam = {
                ...teamData.team,
                members: teamData.team.members?.map(member => ({
                  id: member.id,
                  userId: member.user.id,
                  name: member.user.name,
                  email: member.user.email,
                  role: member.role,
                  status: member.status
                })) || []
              };
              setTeam(transformedTeam);
            }
          } catch (e) {
            console.error('Error fetching team after team_updated:', e);
          }
        }
      });

      // Listen for task created (Team Channel)
      teamChannel.bind('task_created', ({ task, teamId }) => {
        console.log('Task created:', task);
        if (activeTeamId && String(teamId) === activeTeamId) {
          const taskId = normalizeTaskId(task.id);

          setTasks(prev => {
            if (prev[taskId]) return prev;
            return { ...prev, [taskId]: { ...task, content: task.title } };
          });

          const status = statusToColumnId(task.status);
          setColumns(prev => {
            const taskAlreadyInBoard = Object.values(prev).some(col => col.taskIds.includes(taskId));
            if (taskAlreadyInBoard) return prev;

            if (!prev[status]) {
              const dynamicColumn = createUniqueColumn(task.status, prev);
              if (!dynamicColumn) return prev;
              setColumnOrder((prevOrder) => [...prevOrder, dynamicColumn.id]);
              return {
                ...prev,
                [dynamicColumn.id]: {
                  ...dynamicColumn,
                  taskIds: [taskId]
                }
              };
            }

            return {
              ...prev,
              [status]: {
                ...prev[status],
                taskIds: [...prev[status].taskIds, taskId]
              }
            };
          });
        }
      });

      // Listen for task updated (Team Channel)
      teamChannel.bind('task_updated', ({ task, teamId }) => {
        console.log('Task updated:', task);
        if (activeTeamId && String(teamId) === activeTeamId) {
          const taskId = normalizeTaskId(task.id);

          if (pendingDragUpdates.current.has(taskId)) {
            console.log('Skipping Pusher update for locally dragged task:', taskId);
            return;
          }

          const newStatus = statusToColumnId(task.status);

          setTasks(prev => {
            const oldTask = prev[taskId];
            if (!oldTask) return prev;
            return { ...prev, [taskId]: { ...task, content: task.title } };
          });

          setColumns(prevCols => {
            let currentColumn = null;
            for (const colId of Object.keys(prevCols)) {
              if (prevCols[colId].taskIds.includes(taskId)) {
                currentColumn = colId;
                break;
              }
            }

            if (currentColumn === newStatus) return prevCols;

            const cleanedColumns = {};
            Object.keys(prevCols).forEach(colId => {
              cleanedColumns[colId] = {
                ...prevCols[colId],
                taskIds: prevCols[colId].taskIds.filter(id => id !== taskId)
              };
            });

            if (!cleanedColumns[newStatus]) {
              const dynamicColumn = createUniqueColumn(task.status, cleanedColumns);
              if (dynamicColumn) {
                cleanedColumns[dynamicColumn.id] = dynamicColumn;
                setColumnOrder((prevOrder) => [...prevOrder, dynamicColumn.id]);
              }
            }

            cleanedColumns[newStatus] = {
              ...cleanedColumns[newStatus],
              taskIds: [...cleanedColumns[newStatus].taskIds, taskId]
            };

            return cleanedColumns;
          });

          forceBoardRerender();
        }
      });

      // Listen for task deleted (Team Channel)
      teamChannel.bind('task_deleted', ({ taskId, teamId }) => {
        console.log('Task deleted:', taskId);
        if (activeTeamId && String(teamId) === activeTeamId) {
          const normalizedTaskId = normalizeTaskId(taskId);

          setTasks(prev => {
            const newTasks = { ...prev };
            delete newTasks[normalizedTaskId];
            return newTasks;
          });

          setColumns(prev => {
            const newColumns = { ...prev };
            Object.keys(newColumns).forEach(colId => {
              newColumns[colId] = {
                ...newColumns[colId],
                taskIds: newColumns[colId].taskIds.filter(id => id !== normalizedTaskId)
              };
            });
            return newColumns;
          });
        }
      });
    }

    setSocket(pusher);

    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
        pusherRef.current = null;
      }
    };
  }, [user, team?.id]);



  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user) return;
      try {
        const res = await fetch(`${env.BACKEND_URL}/api/notifications`, {
          headers: { 'Authorization': user?.token }
        });
        if (res.status === 401) {
          logout();
          navigate('/auth/login', { replace: true });
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.notifications.filter(n => !n.read).length);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  const filteredTasks = useMemo(() => {
    if (!searchTerm) return tasks;
    const lowerTerm = searchTerm.toLowerCase();
    return Object.values(tasks).reduce((acc, task) => {
      if (task.content?.toLowerCase().includes(lowerTerm)) {
        acc[task.id] = task;
      }
      return acc;
    }, {});
  }, [tasks, searchTerm]);

  const handleCreateTask = async (taskData) => {
    try {
      const statusTitle = columnIdToStatus(taskData.status);
      const res = await fetch(`${env.BACKEND_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': user?.token
        },
        body: JSON.stringify({
          title: taskData.content,
          description: taskData.description,
          teamId: team.id,
          assigneeId: taskData.assigneeId ?? null,
          priority: taskData.priority,
          dueDate: taskData.dueDate,
          status: statusTitle
        })
      });

      if (res.status === 401) {
        logout();
        navigate('/auth/login', { replace: true });
        return;
      }

      if (res.ok) {
        // Avoid a full refetch to make UI feel instant. Use backend response to update board optimistically.
        const data = await res.json();
        const newTask = data.task;
        const taskId = normalizeTaskId(newTask.id);

        setTasks(prev => ({ ...prev, [taskId]: { ...newTask, content: newTask.title } }));

        setColumns(prev => {
          const status = statusToColumnId(newTask.status, prev, columnOrder);
          if (!prev[status]) return prev;

          return {
            ...prev,
            [status]: {
              ...prev[status],
              taskIds: [...prev[status].taskIds, taskId]
            }
          };
        });
      }
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleUpdateTask = async (taskData) => {
    const normalizedTaskId = normalizeTaskId(taskData.id);

    const backendStatus = columnIdToStatus(taskData.status);

    // Update with backend format for consistency with Socket.IO events
    const updatedTaskData = {
      ...taskData,
      status: backendStatus
    };

    // Optimistic update with backend format
    setTasks(prev => ({ ...prev, [normalizedTaskId]: updatedTaskData }));

    try {
      const response = await fetch(`${env.BACKEND_URL}/api/tasks/${taskData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': user?.token
        },
        body: JSON.stringify({
          title: taskData.content,
          description: taskData.description,
          priority: taskData.priority,
          dueDate: taskData.dueDate,
          status: backendStatus,
          assigneeId: taskData.assigneeId ?? undefined
        })
      });

      if (response.status === 401) {
        logout();
        navigate('/auth/login', { replace: true });
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const responseTaskId = normalizeTaskId(data.task.id);
        // Update with actual backend response to ensure consistency
        setTasks(prev => ({
          ...prev,
          [responseTaskId]: { ...data.task, content: data.task.title }
        }));
      }
    } catch (error) {
      console.error("Error updating task:", error);
      // Revert optimistic update on error
      fetchTeamAndTasks();
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    const normalizedTaskId = normalizeTaskId(taskId);

    setTasks(prev => {
      const newTasks = { ...prev };
      delete newTasks[normalizedTaskId];
      return newTasks;
    });

    try {
      const res = await fetch(`${env.BACKEND_URL}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': user?.token
        }
      });

      if (res.status === 401) {
        logout();
        navigate('/auth/login', { replace: true });
        return;
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const moveTaskOptimistically = (task, newStatus) => {
    // newStatus is in backend format ('To Do', 'In Progress', 'Done')
    // task.status is also in backend format

    // 1. Calculate source and destination columns
    const taskId = normalizeTaskId(task.id);
    const sourceStatus = statusToColumnId(task.status);
    const destStatus = statusToColumnId(newStatus);

    if (sourceStatus === destStatus) return;

    // Mark this task as being updated locally
    pendingDragUpdates.current.add(taskId);

    // 2. DEFENSIVE: Remove task from ALL columns first, then add to destination
    setColumns(prevColumns => {
      const cleanedColumns = {};
      Object.keys(prevColumns).forEach(colId => {
        cleanedColumns[colId] = {
          ...prevColumns[colId],
          taskIds: prevColumns[colId].taskIds.filter(id => id !== taskId)
        };
      });

      // Add to destination column
      cleanedColumns[destStatus] = {
        ...cleanedColumns[destStatus],
        taskIds: [...cleanedColumns[destStatus].taskIds, taskId]
      };

      return cleanedColumns;
    });

    forceBoardRerender();

    // 3. Optimistically update task status in tasks map with backend format
    setTasks(prev => ({
      ...prev,
      [taskId]: { ...task, status: newStatus }  // newStatus is backend format
    }));

    // 4. Persist to backend - pass task with internal format status for handleUpdateTask
    handleUpdateTask({ ...task, status: destStatus, content: task.content || task.title });

    // Remove from pending after a delay to ensure Pusher event is ignored
    setTimeout(() => {
      pendingDragUpdates.current.delete(taskId);
    }, 1000);
  };

  const handleAdvanceTask = (task) => {
    const currentStatus = task.status || "To Do";
    // Map backend status strings to our column order keys if needed, 
    // but columnOrder uses 'todo', 'inprogress', 'done'. 
    // Task status is 'To Do', 'In Progress', 'Done'.
    // We need a helper or just consistent mapping.

    const internalStatus = statusToColumnId(currentStatus);
    const currentIndex = columnOrder.indexOf(internalStatus);

    if (currentIndex < columnOrder.length - 1) {
      const nextInternalStatus = columnOrder[currentIndex + 1];
      const nextStatus = columnIdToStatus(nextInternalStatus);
      moveTaskOptimistically(task, nextStatus);
    }
  };

  const handleRegressTask = (task) => {
    const internalStatus = statusToColumnId(task.status);
    const currentIndex = columnOrder.indexOf(internalStatus);

    if (currentIndex > 0) {
      const prevInternalStatus = columnOrder[currentIndex - 1];
      const prevStatus = columnIdToStatus(prevInternalStatus);
      moveTaskOptimistically(task, prevStatus);
    }
  };

  const updateTaskStatuses = async (taskIds, nextStatusTitle) => {
    if (!taskIds.length) return;

    await Promise.all(
      taskIds.map((taskId) => {
        const task = tasks[taskId];
        if (!task) return Promise.resolve();

        return fetch(`${env.BACKEND_URL}/api/tasks/${task.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": user?.token
          },
          body: JSON.stringify({ status: nextStatusTitle })
        }).catch((error) => {
          console.error("Error updating task status after column change:", error);
        });
      })
    );
  };

  const handleCreateColumn = () => {
    setColumnNameError("");
    setColumns((prev) => {
      let newName = "Untitled";
      let counter = 1;
      const existingTitles = Object.values(prev).map((col) => col.title.toLowerCase());

      while (existingTitles.includes(newName.toLowerCase())) {
        newName = `Untitled ${counter}`;
        counter += 1;
      }

      const newColumn = createUniqueColumn(newName, prev);
      if (!newColumn) return prev;

      setColumnOrder((prevOrder) => [...prevOrder, newColumn.id]);
      setEditingColumnId(newColumn.id);
      setEditingColumnName(newName);
      return { ...prev, [newColumn.id]: newColumn };
    });
  };

  const handleSaveColumnName = async () => {
    if (!editingColumnId) return;

    const currentColumn = columns[editingColumnId];
    if (!currentColumn) {
      setEditingColumnId(null);
      setEditingColumnName("");
      setColumnNameError("");
      return;
    }

    const trimmedName = editingColumnName.trim();
    if (!trimmedName) {
      setEditingColumnName(currentColumn.title);
      setColumnNameError("");
      return;
    }

    if (trimmedName === currentColumn.title) {
      setEditingColumnId(null);
      setEditingColumnName("");
      setColumnNameError("");
      return;
    }

    const nameTaken = columnOrder.some(
      (id) => id !== editingColumnId && columns[id]?.title?.toLowerCase() === trimmedName.toLowerCase()
    );

    if (nameTaken) {
      setColumnNameError("Column name already exists.");
      return;
    }

    setColumnNameError("");

    const taskIdsToUpdate = [...(currentColumn.taskIds || [])];

    setColumns((prev) => ({
      ...prev,
      [editingColumnId]: {
        ...prev[editingColumnId],
        title: trimmedName
      }
    }));

    setTasks((prev) => {
      const next = { ...prev };
      taskIdsToUpdate.forEach((taskId) => {
        if (!next[taskId]) return;
        next[taskId] = { ...next[taskId], status: trimmedName };
      });
      return next;
    });

    await updateTaskStatuses(taskIdsToUpdate, trimmedName);
    setEditingColumnId(null);
    setEditingColumnName("");
    setColumnNameError("");
  };

  const handleEditingColumnNameChange = (value) => {
    setEditingColumnName(value);
    if (columnNameError) setColumnNameError("");
  };

  const handleCancelEditColumn = () => {
    setEditingColumnId(null);
    setEditingColumnName("");
    setColumnNameError("");
  };

  const handleRenameColumn = (columnId) => {
    const currentColumn = columns[columnId];
    if (!currentColumn) return;

    setEditingColumnId(columnId);
    setEditingColumnName(currentColumn.title);
    setColumnNameError("");
  };

  const handleDeleteColumn = (columnId) => {
    if (columnOrder.length <= 1) {
      return;
    }
    setDeleteConfirmColumnId(columnId);
  };

  const handleConfirmDeleteColumn = async (columnId) => {
    const columnToDelete = columns[columnId];
    if (!columnToDelete) return;

    const fallbackColumnId = columnOrder.find((id) => id !== columnId);
    if (!fallbackColumnId || !columns[fallbackColumnId]) return;

    const movedTaskIds = [...(columnToDelete.taskIds || [])];

    setColumns((prev) => {
      const next = { ...prev };
      const destinationIds = [...next[fallbackColumnId].taskIds, ...movedTaskIds];
      next[fallbackColumnId] = {
        ...next[fallbackColumnId],
        taskIds: [...new Set(destinationIds)]
      };
      delete next[columnId];
      return next;
    });

    setColumnOrder((prev) => prev.filter((id) => id !== columnId));

    const fallbackStatus = columns[fallbackColumnId].title;
    setTasks((prev) => {
      const next = { ...prev };
      movedTaskIds.forEach((taskId) => {
        if (!next[taskId]) return;
        next[taskId] = { ...next[taskId], status: fallbackStatus };
      });
      return next;
    });

    await updateTaskStatuses(movedTaskIds, fallbackStatus);
    setDeleteConfirmColumnId(null);
  };

  const handleCancelDeleteColumn = () => {
    setDeleteConfirmColumnId(null);
  };

  const handleRenameTeam = (newName) => {
  };

  const handleCreateTeam = async (teamName) => {
    try {
      const res = await fetch(`${env.BACKEND_URL}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': user?.token
        },
        body: JSON.stringify({ name: teamName })
      });

      if (res.status === 401) {
        logout();
        navigate('/auth/login', { replace: true });
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setTeam(data.team);
        navigateToTeam(data.team);
        setIsCreateTeamModalOpen(false);
      }
    } catch (error) {
      console.error("Error creating team:", error);
    }
  };

  const handleApproveMember = async (memberId) => {
    if (!team) return;
    try {
      const res = await fetch(`${env.BACKEND_URL}/api/teams/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': user?.token
        },
        body: JSON.stringify({ teamId: team.id, memberId })
      });

      if (res.status === 401) {
        logout();
        navigate('/auth/login', { replace: true });
        return;
      }

      if (res.ok) {
        fetchTeamAndTasks();
      }
    } catch (error) {
      console.error("Error approving member:", error);
    }
  };

  const handleRejectMember = async (memberId) => {
    if (!team) return;
    try {
      const res = await fetch(`${env.BACKEND_URL}/api/teams/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': user?.token
        },
        body: JSON.stringify({ teamId: team.id, memberId })
      });

      if (res.status === 401) {
        logout();
        navigate('/auth/login', { replace: true });
        return;
      }

      if (res.ok) {
        fetchTeamAndTasks();
      }
    } catch (error) {
      console.error("Error rejecting member:", error);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    if (!team) return;
    try {
      // Optimistic update
      setTeam(prevTeam => {
        if (!prevTeam) return prevTeam;
        return {
          ...prevTeam,
          members: prevTeam.members.map(m =>
            m.id === memberId ? { ...m, role: newRole } : m
          )
        };
      });

      const res = await fetch(`${env.BACKEND_URL}/api/teams/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": user?.token
        },
        body: JSON.stringify({ teamId: team.id, memberId, role: newRole })
      });

      if (res.status === 401) {
        logout();
        navigate('/auth/login', { replace: true });
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        console.error("Role change failed:", data.message);
        fetchTeamAndTasks(); // Revert on failure
      }
    } catch (error) {
      console.error("Error changing role:", error);
      fetchTeamAndTasks(); // Revert on error
    }
  };

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskId = normalizeTaskId(draggableId);

    const start = columns[source.droppableId];
    const finish = columns[destination.droppableId];

    if (start === finish) {
      // Reordering within same column
      setColumns(prevColumns => {
        const currentColumn = prevColumns[source.droppableId];
        const newTaskIds = Array.from(currentColumn.taskIds);
        newTaskIds.splice(source.index, 1);
        newTaskIds.splice(destination.index, 0, taskId);
        const newColumn = { ...currentColumn, taskIds: newTaskIds };

        return { ...prevColumns, [newColumn.id]: newColumn };
      });
    } else {
      console.log('=== LOCAL DRAG START ===', taskId);
      console.log('Columns BEFORE drag:', JSON.stringify(Object.keys(columns).reduce((acc, k) => ({ ...acc, [k]: columns[k].taskIds }), {})));

      // Moving between columns - mark as pending to avoid Pusher duplicate processing
      pendingDragUpdates.current.add(taskId);

      // DEFENSIVE: Remove task from ALL columns first to prevent duplicates
      setColumns(prevColumns => {
        const cleanedColumns = {};
        Object.keys(prevColumns).forEach(colId => {
          cleanedColumns[colId] = {
            ...prevColumns[colId],
            taskIds: prevColumns[colId].taskIds.filter(id => id !== taskId)
          };
        });

        // Add to destination column at specified index
        const destTaskIds = [...cleanedColumns[destination.droppableId].taskIds];
        destTaskIds.splice(destination.index, 0, taskId);
        cleanedColumns[destination.droppableId] = {
          ...cleanedColumns[destination.droppableId],
          taskIds: destTaskIds
        };

        console.log('Columns AFTER drag:', JSON.stringify(Object.keys(cleanedColumns).reduce((acc, k) => ({ ...acc, [k]: cleanedColumns[k].taskIds }), {})));
        console.log('=== LOCAL DRAG END ===');
        return cleanedColumns;
      });

      forceBoardRerender();

      // CRITICAL: Update task status in tasks map immediately
      const task = tasks[taskId];
      if (!task) {
        pendingDragUpdates.current.delete(taskId);
        return;
      }

      const newStatus = columnIdToStatus(destination.droppableId);

      // Update task status in tasks map with backend format
      setTasks(prev => ({
        ...prev,
        [taskId]: { ...task, status: newStatus }
      }));

      // Send update to backend with INTERNAL format for handleUpdateTask
      handleUpdateTask({
        ...task,
        status: destination.droppableId,  // Internal format: 'todo', 'inprogress', 'done'
        content: task.content || task.title
      });

      // Remove from pending after a delay to ensure Pusher event is ignored
      setTimeout(() => {
        pendingDragUpdates.current.delete(taskId);
      }, 1000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-black text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden transition-colors duration-300 bg-background text-zinc-100 font-sans selection:bg-orange-500/30 relative">
      <div className="absolute inset-0 z-0 bg-radial-gradient from-transparent via-background/60 to-background pointer-events-none" />
      <BackgroundWave opacity={0.3} />

      <header className="relative z-20 flex items-center justify-between px-6 py-3 shadow-lg border-b border-white/5 bg-black/10 backdrop-blur-xl">
        <div className="flex items-center gap-6">

          <Link to="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-all border border-white/10">
              <img src="/logo.png" alt="Syncly Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight hidden md:block text-white group-hover:text-orange-100 transition-colors">Syncly</span>
          </Link>

          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors font-medium text-zinc-300 hover:text-white border border-transparent hover:border-white/5"
            >
              {team?.name || "Select Team"} <ChevronDown size={16} />
            </button>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                <div className="absolute top-full left-0 mt-2 w-56 rounded-xl border border-white/10 p-2 animate-in fade-in slide-in-from-top-2 z-50 bg-black/60 backdrop-blur-2xl shadow-2xl">
                  {myTeams.length > 0 ? (
                    myTeams.map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          navigateToTeam(t);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-orange-500/10 hover:text-orange-200 transition-colors text-sm font-medium text-zinc-300"
                      >
                        {t.name}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-zinc-500">No teams found</div>
                  )}
                  <div className="h-px bg-white/10 my-1"></div>
                  <button
                    onClick={() => {
                      setIsCreateTeamModalOpen(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium text-orange-400 hover:text-orange-300 flex items-center gap-2"
                  >
                    <Plus size={14} /> Create New Team
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 max-w-xl px-8 hidden sm:block">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-hover:text-orange-500/70 transition-colors" />
            <input
              type="text"
              placeholder="Search tasks by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all shadow-inner bg-white/5 border border-white/5 text-zinc-100 placeholder-zinc-600 focus:bg-white/10"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-black/20 rounded-lg p-1 border border-white/5 gap-1">
            <button
              onClick={() => setView("board")}
              className={`p-1.5 rounded-md transition-all flex items-center justify-center ${view === "board" ? "bg-zinc-700/50 text-white shadow-sm ring-1 ring-white/10" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
              title="Board View"
            >
              <Kanban size={18} />
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`p-1.5 rounded-md transition-all flex items-center justify-center ${view === "calendar" ? "bg-zinc-700/50 text-white shadow-sm ring-1 ring-white/10" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
              title="Calendar View"
            >
              <CalendarIcon size={18} />
            </button>
          </div>

          <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            <button
              onClick={() => setIsNotificationPanelOpen(true)}
              className="relative p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border border-black"></span>
              )}
            </button>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border border-white/10 shadow-lg cursor-pointer hover:ring-2 hover:ring-orange-500/20 transition-all bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-200"
              title={user?.name}
              onClick={() => navigate("/me")}
            >
              {getInitials(user?.name)}
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden relative flex flex-col">
          {!team ? (
            <div className="flex flex-col items-center justify-center h-full opacity-80">
              <Users size={64} className="mb-6 text-zinc-500" />
              <h2 className="text-3xl font-bold mb-3 text-zinc-200 tracking-tight">No Team Selected</h2>
              <p className="mb-8 text-zinc-400">Select a team or create a new one to get started.</p>
              <button
                onClick={() => setIsCreateTeamModalOpen(true)}
                className="px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 transition-all transform hover:-translate-y-1 hover:scale-105 active:scale-95 bg-orange-600 hover:bg-orange-500 text-white"
              >
                Create New Team
              </button>
            </div>
          ) : view === "board" ? (
            <motion.div
              key="board"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full"
            >
              <BoardView
                key={`board-${boardRenderVersion}`}
                tasks={filteredTasks}
                columns={columns}
                columnOrder={columnOrder}
                editingColumnId={editingColumnId}
                editingColumnName={editingColumnName}
                columnNameError={columnNameError}
                onEditingColumnNameChange={handleEditingColumnNameChange}
                onSaveColumnName={handleSaveColumnName}
                onCancelEditColumn={handleCancelEditColumn}
                deleteConfirmColumnId={deleteConfirmColumnId}
                onConfirmDeleteColumn={() => handleConfirmDeleteColumn(deleteConfirmColumnId)}
                onCancelDeleteColumn={handleCancelDeleteColumn}
                onDragEnd={onDragEnd}
                onEditTask={(task) => { setEditingTask(task); setIsTaskModalOpen(true); }}
                onDeleteTask={handleDeleteTask}
                onCreateColumn={handleCreateColumn}
                onRenameColumn={handleRenameColumn}
                onDeleteColumn={(colId) => setDeleteConfirmColumnId(colId)}
                onAddTask={(colId) => {
                  setTargetColumn(colId);
                  setSelectedDate(null);
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                onAdvanceTask={handleAdvanceTask}
                onRegressTask={handleRegressTask}
              />
            </motion.div>
          ) : (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full"
            >
              <CalendarView
                tasks={filteredTasks}
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                onDateClick={(date) => {
                  setSelectedDate(date);
                  setTargetColumn("todo");
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                onTaskClick={(task) => { setEditingTask(task); setIsTaskModalOpen(true); }}
              />
            </motion.div>
          )}
        </main>

        <RightSidebar
          team={team}
          currentUser={user}
          onInvite={() => setIsTeamModalOpen(true)}
          onRenameTeam={handleRenameTeam}
          onManageMember={() => setIsTeamModalOpen(true)}
        />
      </div>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={editingTask ? handleUpdateTask : handleCreateTask}
        task={editingTask}
        initialDate={selectedDate}
        initialStatus={targetColumn}
        statusOptions={columnOrder.map((columnId) => ({
          id: columnId,
          title: columns[columnId]?.title || columnId
        }))}
        teamMembers={(team?.members || []).filter((m) => m.status === 'Active')}
      />

      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        team={team}
        currentUser={user}
        onApprove={handleApproveMember}
        onReject={handleRejectMember}
        onRoleChange={handleRoleChange}
      />

      <CreateTeamModal
        isOpen={isCreateTeamModalOpen}
        onClose={() => setIsCreateTeamModalOpen(false)}
        onCreate={handleCreateTeam}
      />

      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        user={user}
        socket={socket}
        onUnreadCountChange={(count) => setUnreadCount(count)}
        onNotificationClick={(notification) => {
          if (notification.teamId) {
            const matchedTeam = myTeams.find(t => t.id === notification.teamId);
            if (matchedTeam) {
              navigateToTeam(matchedTeam);
            } else {
              navigate("/teams");
            }
          }
          setIsNotificationPanelOpen(false);
        }}
      />
    </div>
  );
}

function BoardView({
  tasks,
  columns,
  columnOrder,
  editingColumnId,
  editingColumnName,
  columnNameError,
  onEditingColumnNameChange,
  onSaveColumnName,
  onCancelEditColumn,
  deleteConfirmColumnId,
  onConfirmDeleteColumn,
  onCancelDeleteColumn,
  onDragEnd,
  onEditTask,
  onDeleteTask,
  onCreateColumn,
  onRenameColumn,
  onDeleteColumn,
  onAddTask,
  onAdvanceTask,
  onRegressTask
}) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full overflow-x-auto p-6 gap-6 scrollbar-hide relative">
        <style>{`
          [data-rbd-draggable-id] {
            z-index: 1;
          }
          [data-rbd-draggable-id][style*="transform"] {
            z-index: 9999 !important;
          }
          .react-beautiful-dnd-draggable {
            z-index: 9999 !important;
          }
        `}</style>
        {columnOrder.map((columnId) => {
          const column = columns[columnId];
          const uniqueTaskIds = [...new Set(column.taskIds.map((taskId) => String(taskId)))];
          const colTasks = uniqueTaskIds
            .map((taskId) => tasks[taskId])
            .filter(Boolean);

          return (
            <div key={column.id} className="flex flex-col w-80 min-w-[20rem] h-full max-h-full rounded-2xl shadow-xl border border-white/5 bg-black/50 backdrop-blur-xl relative z-0">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5 rounded-t-2xl">
                {editingColumnId === column.id ? (
                  <div className="w-full flex flex-col gap-1">
                    {columnNameError ? (
                      <p className="text-[11px] text-red-300 font-medium">{columnNameError}</p>
                    ) : null}
                    <div className="flex items-center gap-2 w-full">
                      <input
                        autoFocus
                        value={editingColumnName}
                        onChange={(e) => onEditingColumnNameChange(e.target.value)}
                        onBlur={onSaveColumnName}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") onSaveColumnName();
                          if (e.key === "Escape") onCancelEditColumn();
                        }}
                        className="flex-1 px-2 py-1 rounded-md bg-white/10 border border-orange-500/50 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-orange-500 text-lg font-bold"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={onSaveColumnName}
                        className="p-2 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors"
                        title="Save Column Name"
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  </div>
                ) : deleteConfirmColumnId === column.id ? (
                  <div className="flex-1 flex flex-col gap-2">
                    <p className="text-sm font-medium text-zinc-300">Delete "{column.title}"?</p>
                    <p className="text-xs text-zinc-500">Tasks will move to {columns[columnOrder.find((id) => id !== column.id)]?.title || "another column"}.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={onConfirmDeleteColumn}
                        className="px-2 py-1 text-xs rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={onCancelDeleteColumn}
                        className="px-2 py-1 text-xs rounded-md bg-white/10 hover:bg-white/20 text-zinc-300 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="font-bold text-lg text-zinc-100 tracking-wide">{column.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-black/40 text-zinc-400 border border-white/5">
                        {
                          (() => {
                            const uniqueTaskIds = [...new Set(column.taskIds.map((taskId) => String(taskId)))];
                            return uniqueTaskIds.filter((taskId) => tasks[taskId]).length;
                          })()
                        }
                      </span>
                      <button
                        onClick={() => onRenameColumn(column.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
                        title="Rename Column"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteColumn(column.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors"
                        title="Delete Column"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => onAddTask(column.id)}
                        className="p-1.5 rounded-lg hover:bg-orange-500/10 text-zinc-400 hover:text-orange-400 transition-colors"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </>
                )}
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 overflow-y-auto p-3 transition-colors ${snapshot.isDraggingOver ? "bg-orange-500/5" : ""}`}
                  >
                    {colTasks.map((task, index) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        index={index}
                        onClick={onEditTask}
                        onDelete={onDeleteTask}
                        onAdvance={onAdvanceTask}
                        onRegress={onRegressTask}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}

        <button
          onClick={onCreateColumn}
          className="w-80 min-w-[20rem] h-fit rounded-2xl border border-dashed border-white/15 bg-black/20 hover:bg-black/30 hover:border-orange-500/40 text-zinc-300 hover:text-orange-300 transition-colors p-5 text-left"
        >
          <div className="flex items-center gap-3 font-semibold">
            <Plus size={18} />
            Add Column
          </div>
          <p className="text-xs text-zinc-500 mt-2">Create a new stage for your workflow.</p>
        </button>
      </div>
    </DragDropContext>
  );
}

function CalendarView({ tasks, currentDate, onDateChange, onDateClick, onTaskClick }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const toDateKey = (value) => {
    if (!value) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (typeof value === 'string') {
      const isoPrefix = value.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(isoPrefix)) return isoPrefix;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return format(parsed, 'yyyy-MM-dd');
  };

  const tasksByDate = Object.values(tasks).reduce((acc, task) => {
    const dateKey = toDateKey(task?.dueDate);
    if (!dateKey) return acc;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc;
  }, {});

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="rounded-3xl shadow-2xl border border-white/5 p-8 h-full flex flex-col bg-black/10 backdrop-blur-xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-6">
            <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">{format(currentDate, 'MMMM yyyy')}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => onDateChange(subMonths(currentDate, 1))}
                className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-white/5"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => onDateChange(addMonths(currentDate, 1))}
                className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-white/5"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          <button
            onClick={() => onDateChange(new Date())}
            className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white transition-all text-sm font-medium"
          >
            Today
          </button>
        </div>

        <div className="grid grid-cols-7 gap-4 mb-4 text-center font-bold text-sm tracking-widest text-zinc-500 uppercase">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-4 flex-1 auto-rows-fr">
          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate[dateKey] || [];
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toString()}
                onClick={() => onDateClick(dateKey)}
                className={`min-h-[100px] border rounded-2xl p-3 transition-all hover:-translate-y-1 flex flex-col gap-1.5 cursor-pointer 
                  ${isToday
                    ? 'border-orange-500/30 bg-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/40 backdrop-blur-lg'
                    : 'border-white/5 bg-white/[0.02] hover:bg-white/5 hover:shadow-orange-500/5'}`}
              >
                <span className={`text-sm font-bold mb-1 ${isToday ? 'text-orange-200' : 'text-zinc-500'}`}>{format(day, 'd')}</span>
                {dayTasks.map(task => (
                  <div
                    key={task.id}
                    className="text-[10px] px-2 py-1 rounded-lg truncate cursor-pointer hover:opacity-100 opacity-90 shadow-sm font-medium bg-zinc-800 text-zinc-200 border border-white/5 hover:border-orange-500/30 transition-colors"
                    onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                  >
                    {task.content}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
