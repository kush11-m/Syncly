import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, ArrowRight, Building2, Sparkles, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../App";
import { env } from "../config";
import BackgroundWave from "../components/BackgroundWave";
import { getTeamPath, getTeamSlug, getUserSlug } from "../utils/teamUrl";

export default function TeamSelector() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!user?.token) return;

      setLoading(true);
      setError("");

      try {
        const res = await fetch(`${env.BACKEND_URL}/api/teams`, {
          headers: { Authorization: user.token },
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Failed to fetch teams");
          setTeams([]);
          return;
        }

        setTeams(data.teams || []);
      } catch (_fetchError) {
        setError("Failed to fetch teams");
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [user]);

  const handleCreateTeam = async (event) => {
    event.preventDefault();

    if (!newTeamName.trim()) {
      setError("Team name is required");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const res = await fetch(`${env.BACKEND_URL}/api/teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: user?.token,
        },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to create team");
        return;
      }

      const createdTeam = data.team;
      setTeams((prev) => [...prev, createdTeam]);
      setNewTeamName("");
      navigate(getTeamPath(user, createdTeam));
    } catch (_createError) {
      setError("Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#090b10] text-zinc-100">
      <BackgroundWave opacity={0.2} />
      <div className="pointer-events-none absolute left-[-140px] top-12 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] right-[-120px] h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-10 pt-8 sm:px-8 sm:pt-12 font-['Space_Grotesk']">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-6 rounded-3xl border border-white/10 bg-zinc-950/70 p-6 backdrop-blur-xl sm:mb-8 sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-200">
                <Sparkles size={14} />
                Team Spaces
              </span>
              <h1 className="font-['Syne'] text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Welcome back, @{getUserSlug(user)}
              </h1>
              <p className="mt-2 text-sm text-zinc-300 sm:text-base">
                Pick a workspace to continue or create a new one for your next sprint.
              </p>
            </div>

            <button
              onClick={() => navigate("/me")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-orange-300/40 hover:bg-orange-500/10 hover:text-white"
            >
              View Profile
            </button>
          </div>
        </motion.header>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.45 }}
            className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-xl sm:p-6"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white sm:text-2xl">Your Workspaces</h2>
                <p className="text-sm text-zinc-400">Open a team board and keep momentum high.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">
                {teams.length} {teams.length === 1 ? "workspace" : "workspaces"}
              </span>
            </div>

            {loading ? (
              <div className="grid gap-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]"
                  />
                ))}
              </div>
            ) : teams.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
                <Users size={42} className="mx-auto mb-3 text-zinc-500" />
                <p className="text-base font-medium text-zinc-200">No teams yet</p>
                <p className="mt-1 text-sm text-zinc-500">Create your first workspace from the panel on the right.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {teams.map((team, index) => (
                  <motion.button
                    key={team.id}
                    onClick={() => navigate(getTeamPath(user, team))}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 + 0.12, duration: 0.3 }}
                    whileHover={{ y: -2 }}
                    className="group w-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-4 text-left transition-colors hover:border-orange-300/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-sm font-bold text-orange-200">
                          {(team.name || "T").trim().charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-zinc-100">{team.name}</p>
                          <p className="mt-1 truncate text-xs text-zinc-500">/workspace/{getUserSlug(user)}/{getTeamSlug(team)}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-orange-300 transition-colors group-hover:text-orange-200">
                        Open
                        <ArrowRight size={14} />
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.45 }}
            className="space-y-6"
          >
            <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-xl sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-orange-500/20 p-2 text-orange-200">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Create Workspace</h3>
                  <p className="text-xs text-zinc-400">Set up a team hub in seconds.</p>
                </div>
              </div>

              <form onSubmit={handleCreateTeam} className="space-y-3">
                <label htmlFor="new-team-name" className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Team Name
                </label>
                <input
                  id="new-team-name"
                  type="text"
                  value={newTeamName}
                  onChange={(event) => setNewTeamName(event.target.value)}
                  placeholder="Design Ops, Growth Lab..."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-orange-400/50 focus:outline-none focus:ring-1 focus:ring-orange-400/40"
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Building2 size={16} />
                  {creating ? "Creating Team..." : "Create Team"}
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-xl sm:p-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-300">Workspace Notes</h3>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-start gap-2">
                  <ShieldCheck size={16} className="mt-0.5 text-emerald-300" />
                  Team paths are personalized with your username for cleaner sharing.
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles size={16} className="mt-0.5 text-orange-300" />
                  Every board opens with real-time updates already active.
                </li>
              </ul>
            </section>
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
