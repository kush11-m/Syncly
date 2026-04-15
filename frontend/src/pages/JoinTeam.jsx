import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Loader2, Users } from "lucide-react";
import { useAuth } from "../App";
import { env } from "../config";
import BackgroundWave from "../components/BackgroundWave";

export default function JoinTeam() {
    const { teamId } = useParams();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [status, setStatus] = useState("joining");
    const [message, setMessage] = useState("Joining team...");

    useEffect(() => {
        if (!user) {
            navigate("/auth/login", { state: { from: location } });
            return;
        }

        const joinTeam = async () => {
            try {
                const response = await fetch(`${env.BACKEND_URL}/api/teams/join`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: user.token
                    },
                    body: JSON.stringify({ teamId })
                });

                if (response.status === 401) {
                    logout();
                    navigate("/auth/login", { replace: true, state: { from: location } });
                    return;
                }

                const data = await response.json();

                if (response.ok) {
                    setStatus("success");
                    setMessage("Successfully requested to join the team!");
                    setTimeout(() => {
                        navigate("/teams");
                    }, 2000);
                } else {
                    setStatus("error");
                    setMessage(data.message || "Failed to join team");
                }
            } catch (_error) {
                setStatus("error");
                setMessage("An error occurred. Please try again.");
            }
        };

        joinTeam();
    }, [teamId, user, navigate, location]);

    const statusIcon =
        status === "error" ? (
            <AlertTriangle size={34} className="text-red-300" />
        ) : status === "success" ? (
            <CheckCircle2 size={34} className="text-emerald-300" />
        ) : (
            <Loader2 size={34} className="text-orange-300 animate-spin" />
        );

    const statusTone =
        status === "error"
            ? "border-red-500/30 bg-red-500/10 text-red-200"
            : status === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-orange-500/30 bg-orange-500/10 text-orange-100";

    return (
        <div className="app-page flex items-center justify-center px-4 py-8">
            <BackgroundWave opacity={0.3} />
            <div className="pointer-events-none absolute left-[-140px] top-12 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-120px] right-[-120px] h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

            <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="app-panel relative z-10 max-w-lg w-full p-8 sm:p-10 text-center"
            >
                <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    {statusIcon}
                </div>

                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-200">
                    <Users size={13} />
                    Team Access
                </div>
                <h2 className="app-title text-3xl font-bold">Join Team</h2>
                <p className="mt-2 text-sm text-zinc-400">We are processing your request and validating access.</p>

                <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-medium ${statusTone}`}>
                    {message}
                </div>

                {status === "error" && (
                    <button
                        onClick={() => navigate("/teams")}
                        className="app-btn-primary mt-6 w-full"
                    >
                        Go to Teams
                    </button>
                )}

                {status === "success" && (
                    <p className="mt-4 text-xs text-zinc-500">Redirecting to your teams...</p>
                )}
            </motion.div>
        </div>
    );
}
