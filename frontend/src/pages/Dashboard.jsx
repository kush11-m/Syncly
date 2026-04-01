import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { io } from "socket.io-client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import {
  Calendar as CalendarIcon, Kanban, Search, LogOut, Plus,
  ChevronDown, Users, Bell, ChevronLeft, ChevronRight
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
  const [columns, setColumns] = useState({
    todo: { id: "todo", title: "To Do", taskIds: [] },
    inprogress: { id: "inprogress", title: "In Progress", taskIds: [] },
    done: { id: "done", title: "Done", taskIds: [] },
  });
  const [columnOrder, setColumnOrder] = useState(["todo", "inprogress", "done"]);
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

  // Track pending drag updates to avoid processing socket events for local drags
  const pendingDragUpdates = useRef(new Set());

  const normalizeTaskId = (taskId) => String(taskId);

  const statusToColumnId = (status) => {
    if (status === 'To Do') return 'todo';
    if (status === 'In Progress') return 'inprogress';
    if (status === 'Done') return 'done';
    return 'todo';
  };

  const columnIdToStatus = (columnId) => {
    if (columnId === 'todo') return 'To Do';
    if (columnId === 'inprogress') return 'In Progress';
    if (columnId === 'done') return 'Done';
    return 'To Do';
  };

  const forceBoardRerender = () => {
    setBoardRenderVersion((prev) => prev + 1);
  };

  useEffect(() => {
    if (openSettings) setIsTeamModalOpen(true);
  }, [openSettings]);

  const fetchTeamAndTasks = async () => {
    setLoading(true);
    try {
      const teamsRes = await fetch(`${env.BACKEND_URL}/api/teams`, {
        headers: { 'Authorization': user?.token }
      });

      let activeTeamId = null;

      if (teamsRes.status === 401) {
        logout();
        navigate('/');
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

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        const newTasks = {};
        const newColumns = {
          todo: { id: "todo", title: "To Do", taskIds: [] },
          inprogress: { id: "inprogress", title: "In Progress", taskIds: [] },
          done: { id: "done", title: "Done", taskIds: [] },
        };

        tasksData.tasks.forEach(task => {
          const taskId = normalizeTaskId(task.id);
          newTasks[taskId] = { ...task, content: task.title };
          const status = statusToColumnId(task.status);
          if (newColumns[status]) {
            newColumns[status].taskIds.push(taskId);
          }
        });

        setTasks(newTasks);
        setColumns(newColumns);
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

  // Socket.IO connection setup
  useEffect(() => {
    if (!user) return;

    const activeTeamId = team?.id ? String(team.id) : null;

    const newSocket = io(env.BACKEND_URL, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to Socket.IO');
      setIsConnected(true);
      // Join user's personal room for targeted notifications
      newSocket.emit('join_room', user.id);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO');
      setIsConnected(false);
    });

    // Listen for team updates
    newSocket.on('team_updated', ({ teamId }) => {
      console.log('Team updated:', teamId);
      // Refresh team data if it's the current team
      if (activeTeamId && String(teamId) === activeTeamId) {
        fetchTeamAndTasks();
      }
    });

    // Listen for new notifications
    newSocket.on('new_notification', (notification) => {
      console.log('New notification:', notification);
      setUnreadCount(prev => prev + 1);
    });

    // Listen for task created
    newSocket.on('task_created', ({ task, teamId }) => {
      console.log('Task created:', task);
      if (activeTeamId && String(teamId) === activeTeamId) {
        const taskId = normalizeTaskId(task.id);

        // Only add if task doesn't already exist (prevents duplication from own actions)
        setTasks(prev => {
          if (prev[taskId]) {
            console.log('Task already exists, skipping duplicate add');
            return prev;
          }
          return { ...prev, [taskId]: { ...task, content: task.title } };
        });

        // Add to appropriate column only if not already there
        const status = statusToColumnId(task.status);

        setColumns(prev => {
          const taskAlreadyInBoard = Object.values(prev).some(col => col.taskIds.includes(taskId));
          if (taskAlreadyInBoard) {
            console.log('Task already in board, skipping duplicate add');
            return prev;
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

    // Listen for task updated
    newSocket.on('task_updated', ({ task, teamId }) => {
      console.log('Task updated:', task);
      if (activeTeamId && String(teamId) === activeTeamId) {
        const taskId = normalizeTaskId(task.id);

        // Skip if this task is currently being dragged by this user
        if (pendingDragUpdates.current.has(taskId)) {
          console.log('Skipping socket update for locally dragged task:', taskId);
          return;
        }

        // Calculate status outside of state updates to avoid closure issues
        const newStatus = statusToColumnId(task.status);

        // First, update tasks state (just the task data)
        setTasks(prev => {
          const oldTask = prev[taskId];
          if (!oldTask) {
            console.log('Task not found for update, skipping');
            return prev;
          }
          // Update task data with backend format
          return { ...prev, [taskId]: { ...task, content: task.title } };
        });

        // Then, update columns state SEPARATELY to avoid closure issues
        console.log('=== SOCKET UPDATE START ===', task.id);
        setColumns(prevCols => {
          console.log('Columns BEFORE socket update:', JSON.stringify(Object.keys(prevCols).reduce((acc, k) => ({ ...acc, [k]: prevCols[k].taskIds }), {})));
          // First, find where the task currently is
          let currentColumn = null;
          for (const colId of Object.keys(prevCols)) {
            if (prevCols[colId].taskIds.includes(taskId)) {
              currentColumn = colId;
              break;
            }
          }

          // If task is already in the correct column, do nothing
          if (currentColumn === newStatus) {
            console.log('Task already in correct column, no update needed');
            return prevCols;
          }

          // DEFENSIVE: Remove task from ALL columns first
          const cleanedColumns = {};
          Object.keys(prevCols).forEach(colId => {
            cleanedColumns[colId] = {
              ...prevCols[colId],
              taskIds: prevCols[colId].taskIds.filter(id => id !== taskId)
            };
          });

          // Add task to correct column
          cleanedColumns[newStatus] = {
            ...cleanedColumns[newStatus],
            taskIds: [...cleanedColumns[newStatus].taskIds, taskId]
          };

          console.log('Columns AFTER socket update:', JSON.stringify(Object.keys(cleanedColumns).reduce((acc, k) => ({ ...acc, [k]: cleanedColumns[k].taskIds }), {})));
          console.log(`=== SOCKET UPDATE END: Moved task ${task.id} from ${currentColumn} to ${newStatus} ===`);
          return cleanedColumns;
        });

        // Force board remount after remote updates to reset DnD internals cleanly.
        forceBoardRerender();
      }
    });

    // Listen for task deleted
    newSocket.on('task_deleted', ({ taskId, teamId }) => {
      console.log('Task deleted:', taskId);
      if (activeTeamId && String(teamId) === activeTeamId) {
        const normalizedTaskId = normalizeTaskId(taskId);

        // Remove from tasks
        setTasks(prev => {
          const newTasks = { ...prev };
          delete newTasks[normalizedTaskId];
          return newTasks;
        });

        // Remove from columns
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

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, team?.id]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user) return;
      try {
        const res = await fetch(`${env.BACKEND_URL}/api/notifications`, {
          headers: { 'Authorization': user?.token }
        });
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
          priority: taskData.priority,
          dueDate: taskData.dueDate,
          status: taskData.status === 'todo' ? 'To Do' :
            taskData.status === 'inprogress' ? 'In Progress' : 'Done'
        })
      });

      if (res.ok) {
        fetchTeamAndTasks();
      }
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleUpdateTask = async (taskData) => {
    const normalizedTaskId = normalizeTaskId(taskData.id);

    // Convert internal status to backend format for consistency
    const backendStatus = taskData.status === 'todo' ? 'To Do' :
      taskData.status === 'inprogress' ? 'In Progress' :
        taskData.status === 'done' ? 'Done' : taskData.status;

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
          status: backendStatus
        })
      });

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
      await fetch(`${env.BACKEND_URL}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': user?.token
        }
      });
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

    // Remove from pending after a delay to ensure socket event is ignored
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

    const statusMap = { 'To Do': 'todo', 'In Progress': 'inprogress', 'Done': 'done' };
    const reverseMap = { 'todo': 'To Do', 'inprogress': 'In Progress', 'done': 'Done' };

    const internalStatus = statusMap[currentStatus] || 'todo';
    const currentIndex = columnOrder.indexOf(internalStatus);

    if (currentIndex < columnOrder.length - 1) {
      const nextInternalStatus = columnOrder[currentIndex + 1];
      const nextStatus = reverseMap[nextInternalStatus];
      moveTaskOptimistically(task, nextStatus);
    }
  };

  const handleRegressTask = (task) => {
    const statusMap = { 'To Do': 'todo', 'In Progress': 'inprogress', 'Done': 'done' };
    const reverseMap = { 'todo': 'To Do', 'inprogress': 'In Progress', 'done': 'Done' };

    const internalStatus = statusMap[task.status] || 'todo';
    const currentIndex = columnOrder.indexOf(internalStatus);

    if (currentIndex > 0) {
      const prevInternalStatus = columnOrder[currentIndex - 1];
      const prevStatus = reverseMap[prevInternalStatus];
      moveTaskOptimistically(task, prevStatus);
    }
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

      if (res.ok) {
        fetchTeamAndTasks();
      }
    } catch (error) {
      console.error("Error rejecting member:", error);
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

      // Moving between columns - mark as pending to avoid socket duplicate processing
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

      // Remove from pending after a delay to ensure socket event is ignored
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
                onDragEnd={onDragEnd}
                onEditTask={(task) => { setEditingTask(task); setIsTaskModalOpen(true); }}
                onDeleteTask={handleDeleteTask}
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
      />

      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        team={team}
        currentUser={user}
        onApprove={handleApproveMember}
        onReject={handleRejectMember}
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

function BoardView({ tasks, columns, columnOrder, onDragEnd, onEditTask, onDeleteTask, onAddTask, onAdvanceTask, onRegressTask }) {
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
                <h3 className="font-bold text-lg text-zinc-100 tracking-wide">{column.title}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-black/40 text-zinc-400 border border-white/5">
                    {colTasks.length}
                  </span>
                  <button
                    onClick={() => onAddTask(column.id)}
                    className="p-1.5 rounded-lg hover:bg-orange-500/10 text-zinc-400 hover:text-orange-400 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
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
      </div>
    </DragDropContext>
  );
}

function CalendarView({ tasks, currentDate, onDateChange, onDateClick, onTaskClick }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const tasksByDate = Object.values(tasks).reduce((acc, task) => {
    const date = task.dueDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(task);
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
