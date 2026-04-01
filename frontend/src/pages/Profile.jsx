import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../App";
import { env } from "../config";
import { User, LogOut, ArrowLeft, Shield, Users } from "lucide-react";
import BackgroundWave from "../components/BackgroundWave";
import { getTeamPath, getUserSlug } from "../utils/teamUrl";

export default function Profile() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const res = await fetch(`${env.BACKEND_URL}/api/teams`, {
                    headers: { 'Authorization': user?.token }
                });
                if (res.ok) {
                    const data = await res.json();
                    setTeams(data.teams);
                }
            } catch (error) {
                console.error("Failed to fetch teams:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTeams();
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <div className="app-page flex flex-col transition-colors duration-300">
            <BackgroundWave opacity={0.3} />
            <div className="pointer-events-none absolute left-[-140px] top-12 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-120px] right-[-120px] h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

            {/* Header */}
            <header className="px-6 py-4 flex items-center gap-4 border-b border-white/10 bg-zinc-950/75 backdrop-blur-xl z-20 sticky top-0 shadow-lg">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="app-title text-xl font-bold">My Profile</h1>
            </header>

            <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">

                {/* User Card */}
                <section className="app-panel p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-all duration-700 group-hover:bg-orange-500/10"></div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-orange-500/20 ring-1 ring-white/10">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>

                        <div className="text-center md:text-left space-y-2 flex-1">
                            <h2 className="app-title text-3xl font-bold">{user?.name}</h2>
                            <p className="text-zinc-400 font-medium text-lg">{user?.email || "No email provided"}</p>
                            <p className="text-zinc-500 text-sm">@{getUserSlug(user)}</p>
                            <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                                <span className="px-3 py-1 rounded-lg bg-white/5 text-xs font-bold text-orange-200 uppercase tracking-wider flex items-center gap-1 border border-white/5">
                                    <Shield size={12} /> {user?.role || "Member"}
                                </span>
                                <span className="px-3 py-1 rounded-lg bg-white/5 text-xs font-bold text-zinc-500 font-mono border border-white/5">
                                    ID: {user?.id}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 transition-all font-bold shadow-lg group"
                        >
                            <LogOut size={18} className="transition-transform group-hover:-translate-x-1" />
                            Sign Out
                        </button>
                    </div>
                </section>

                {/* Teams Section */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            <Users size={24} />
                        </div>
                        <h3 className="app-title text-2xl font-bold">My Teams</h3>
                        <span className="ml-auto px-3 py-1 rounded-full bg-white/5 text-zinc-400 text-sm font-medium border border-white/5">
                            {teams.length} Teams
                        </span>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2].map(i => (
                                <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse border border-white/5"></div>
                            ))}
                        </div>
                    ) : teams.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {teams.map((team) => (
                                <Link
                                    to={getTeamPath(user, team)}
                                    key={team.id}
                                    className="group relative p-6 app-card hover:bg-white/[0.08] transition-all hover:shadow-xl hover:border-orange-500/30 block overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                    <div className="flex items-center justify-between relative z-10">
                                        <div>
                                            <h4 className="font-bold text-lg text-zinc-200 group-hover:text-white transition-colors">
                                                {team.name}
                                            </h4>
                                            <p className="text-sm text-zinc-500 mt-1">
                                                Member since {new Date(team.createdAt || Date.now()).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 group-hover:bg-orange-500 group-hover:text-white transition-all transform group-hover:scale-110 shadow-inner border border-white/5 group-hover:border-orange-400">
                                            <ArrowLeft size={18} className="rotate-180" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-zinc-500 bg-zinc-950/60 backdrop-blur-md rounded-2xl border border-white/10 border-dashed">
                            <Users size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">You are not part of any teams yet.</p>
                        </div>
                    )}
                </section>

            </main>
        </div>
    );
}
