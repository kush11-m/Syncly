import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Shield, Users } from "lucide-react";
import { env } from "../config";
import BackgroundWave from "../components/BackgroundWave";

export default function UserProfile() {
    const { username } = useParams();
    const navigate = useNavigate();
    
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const res = await fetch(`${env.BACKEND_URL}/api/users/${username}`);
                if (!res.ok) {
                    setError("User not found");
                    setLoading(false);
                    return;
                }
                const data = await res.json();
                setProfileData(data);
            } catch (err) {
                console.error("Failed to fetch user profile:", err);
                setError("Failed to fetch user profile");
            } finally {
                setLoading(false);
            }
        };

        if (username) {
            fetchUserProfile();
        }
    }, [username]);

    return (
        <div className="app-page flex flex-col transition-colors duration-300 min-h-screen relative">
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
                <h1 className="app-title text-xl font-bold">Profile</h1>
            </header>

            <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-8 relative z-10">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
                    </div>
                ) : error ? (
                    <div className="text-center p-12 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                        <h2 className="text-2xl font-bold text-zinc-200 mb-2">User Not Found</h2>
                        <p className="text-zinc-500">The user you are looking for does not exist or may have been removed.</p>
                        <button
                            onClick={() => navigate(-1)}
                            className="mt-6 px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white font-medium"
                        >
                            Go Back
                        </button>
                    </div>
                ) : profileData && (
                    <>
                        {/* User Card */}
                        <section className="app-panel p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-all duration-700 group-hover:bg-orange-500/10"></div>

                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="relative">
                                        {profileData.user.avatarUrl ? (
                                            <img
                                                src={profileData.user.avatarUrl}
                                                alt={profileData.user.name}
                                                className="w-24 h-24 rounded-2xl object-cover shadow-xl shadow-orange-500/20 ring-1 ring-white/10"
                                            />
                                        ) : (
                                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-orange-500/20 ring-1 ring-white/10">
                                                {profileData.user.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="text-center md:text-left space-y-2 flex-1">
                                    <h2 className="app-title text-3xl font-bold">{profileData.user.name}</h2>
                                    <p className="text-zinc-500 text-sm">@{profileData.user.username}</p>
                                    <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                                        <span className="px-3 py-1 rounded-lg bg-white/5 text-xs font-bold text-orange-200 uppercase tracking-wider flex items-center gap-1 border border-white/5">
                                            <Shield size={12} /> {profileData.user.role}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Teams Section */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                    <Users size={24} />
                                </div>
                                <h3 className="app-title text-2xl font-bold">Teams</h3>
                                <span className="ml-auto px-3 py-1 rounded-full bg-white/5 text-zinc-400 text-sm font-medium border border-white/5">
                                    {profileData.teams.length} Teams
                                </span>
                            </div>

                            {profileData.teams.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {profileData.teams.map((team) => (
                                        <div
                                            key={team.id}
                                            className="group relative p-6 app-card bg-white/[0.04] transition-all border border-white/5 block overflow-hidden"
                                        >
                                            <div className="flex items-center justify-between relative z-10">
                                                <div>
                                                    <h4 className="font-bold text-lg text-zinc-200">
                                                        {team.name}
                                                    </h4>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-zinc-500 bg-zinc-950/60 backdrop-blur-md rounded-2xl border border-white/10 border-dashed">
                                    <Users size={48} className="mx-auto mb-4 opacity-30" />
                                    <p className="text-lg font-medium">Not part of any teams publicly visible.</p>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}
