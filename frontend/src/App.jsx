import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import JoinTeam from "./pages/JoinTeam";
import LandingPage from "./pages/LandingPage";
import Profile from "./pages/Profile";
import TeamSelector from "./pages/TeamSelector";
import { env } from "./config";
import { getTeamPath, getTeamSettingsPath } from "./utils/teamUrl";
import "./index.css";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrapAuth = async () => {
      const token = localStorage.getItem("token");
      const savedUserRaw = localStorage.getItem("user");

      if (!token) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      let cachedUser = null;
      if (savedUserRaw) {
        try {
          cachedUser = JSON.parse(savedUserRaw);
        } catch (error) {
          console.error("Failed to parse user data:", error);
          localStorage.removeItem("user");
        }
      }

      if (!cancelled && cachedUser) {
        setUser({ token, ...cachedUser });
      }

      try {
        const res = await fetch(`${env.BACKEND_URL}/api/me`, {
          headers: { Authorization: token }
        });

        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          if (!cancelled) setUser(null);
        } else if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            localStorage.setItem("user", JSON.stringify(data.user));
            if (!cancelled) setUser({ token, ...data.user });
          }
        }
      } catch (_error) {
        // Network issues shouldn't force logout; rely on cached user if present.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    bootstrapAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = (token, userData) => {
    const isTest = userData?.isTest;
    
    if (isTest) {
      setUser({ token, ...userData });
      return;
    }

    localStorage.setItem("token", token);
    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
      setUser({ token, ...userData });
    } else {
      const defaultUser = { id: "user-1", name: "Kushagra", username: "kushagra", role: "admin" };
      localStorage.setItem("user", JSON.stringify(defaultUser));
      setUser({ token, ...defaultUser });
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth/login" replace />;
  return <Outlet />;
}

function AuthRedirect({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/teams" />;
  return children;
}

const themes = [
  { name: "Professional Dark", primary: "#E4E4E7", secondary: "transparent" },
];

export default function App() {
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  useEffect(() => {
    const theme = themes[currentThemeIndex] || themes[0];
    if (theme) {
      document.documentElement.style.setProperty("--primary", theme.primary);
      document.documentElement.style.setProperty("--secondary", theme.secondary);
    }
  }, [currentThemeIndex]);

  useEffect(() => {
    const savedThemeIndex = localStorage.getItem("themeIndex");
    if (savedThemeIndex !== null) {
      const index = parseInt(savedThemeIndex, 10);
      if (index >= 0 && index < themes.length) {
        setCurrentThemeIndex(index);
      } else {
        setCurrentThemeIndex(0);
        localStorage.setItem("themeIndex", "0");
      }
    }
  }, []);

  const selectTheme = (index) => {
    setCurrentThemeIndex(index);
    localStorage.setItem("themeIndex", index.toString());
    setShowThemeSelector(false);
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen font-sans transition-colors duration-300">
          <AnimatedRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}


function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/auth/login" element={<AuthRedirect><PageWrapper><Login /></PageWrapper></AuthRedirect>} />
        <Route path="/auth/signup" element={<AuthRedirect><PageWrapper><Signup /></PageWrapper></AuthRedirect>} />
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        <Route path="/signup" element={<Navigate to="/auth/signup" replace />} />
        <Route path="/join/:teamId" element={<PageWrapper><JoinTeam /></PageWrapper>} />
        <Route path="/" element={<AuthRedirect><PageWrapper><LandingPage /></PageWrapper></AuthRedirect>} />

        <Route element={<ProtectedRoute />}>
          <Route path="/teams" element={<PageWrapper><TeamSelector /></PageWrapper>} />
          <Route path="/workspace/:username/:teamSlug" element={<PageWrapper><Dashboard /></PageWrapper>} />
          <Route path="/workspace/:username/:teamSlug/settings" element={<PageWrapper><Dashboard openSettings={true} /></PageWrapper>} />

          <Route path="/u/:username/:teamSlug/:projectId" element={<LegacyTeamRouteRedirect />} />
          <Route path="/u/:username/:teamSlug/:projectId/settings" element={<LegacyTeamRouteRedirect settings />} />
          <Route path="/project/:projectId" element={<LegacyTeamRouteRedirect />} />
          <Route path="/team/:teamId/settings" element={<LegacyTeamRouteRedirect settings />} />

          <Route path="/dashboard" element={<Navigate to="/teams" replace />} />
          <Route path="/me" element={<PageWrapper><Profile /></PageWrapper>} />
          <Route path="/profile" element={<Navigate to="/me" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );
}

function LegacyTeamRouteRedirect({ settings = false }) {
  const { user, logout } = useAuth();
  const { projectId, teamId } = useParams();
  const [target, setTarget] = useState("");

  useEffect(() => {
    let mounted = true;
    const legacyTeamId = projectId || teamId;

    const resolveLegacyRoute = async () => {
      if (!legacyTeamId || !user?.token) {
        if (mounted) setTarget("/teams");
        return;
      }

      try {
        const res = await fetch(`${env.BACKEND_URL}/api/teams/${legacyTeamId}`, {
          headers: { Authorization: user.token }
        });

        if (res.status === 401) {
          logout();
          if (mounted) setTarget("/auth/login");
          return;
        }

        if (!res.ok) {
          if (mounted) setTarget("/teams");
          return;
        }

        const data = await res.json();
        const resolvedPath = settings
          ? getTeamSettingsPath(user, data.team)
          : getTeamPath(user, data.team);

        if (mounted) setTarget(resolvedPath);
      } catch (_error) {
        if (mounted) setTarget("/teams");
      }
    };

    resolveLegacyRoute();
    return () => {
      mounted = false;
    };
  }, [projectId, teamId, settings, user]);

  if (!target) return null;
  return <Navigate to={target} replace />;
}

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3 }}
    className="w-full h-full"
  >
    {children}
  </motion.div>
);

