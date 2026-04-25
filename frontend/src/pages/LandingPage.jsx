import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { ArrowRight, Zap, Users, Clock, GitBranch } from "lucide-react";
import { motion } from "framer-motion";
import BackgroundWave from "../components/BackgroundWave";
import Navbar from "../components/Navbar";
import { env } from "../config";

export default function LandingPage() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleTestDrive = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${env.BACKEND_URL}/api/test-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();
            if (res.ok) {
                login(data.token, data.user);
                navigate("/teams");
            } else {
                alert(data.message || "Test drive failed");
            }
        } catch (err) {
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                alert("Could not connect to the server. Please wait a few seconds for the backend to finish starting up and try again.");
            } else {
                alert("An error occurred during test drive. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="app-page font-sans">
            <BackgroundWave opacity={0.4} />
            <div className="pointer-events-none absolute left-[-140px] top-16 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-120px] right-[-120px] h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
            <Navbar />

            {/* Hero Section */}
            <section className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-16">
                <div className="max-w-5xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="space-y-8"
                    >
                        {/* Logo Badge */}
                        <div className="flex justify-center">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500 animate-pulse"></div>
                                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-black flex items-center justify-center shadow-2xl border border-white/10">
                                    <img src="/logo.png" alt="Syncly Logo" className="w-full h-full object-contain" />
                                </div>
                            </div>
                        </div>

                        {/* Headline */}
                        <div className="space-y-4">
                            <h1 className="app-title text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 leading-tight px-2">
                                Real-Time Task Management<br />for Modern Teams
                            </h1>
                            <p className="text-lg sm:text-xl md:text-2xl text-zinc-400 font-light max-w-3xl mx-auto leading-relaxed px-4">
                                Syncly keeps your team aligned with live updates, visual workflows, and seamless collaboration.
                            </p>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            {user ? (
                                // Logged in: Single CTA
                                <Link to="/teams" className="w-full sm:w-auto">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full sm:w-auto app-btn-primary px-8 py-4 text-lg"
                                    >
                                        Choose Your Team <ArrowRight className="inline ml-2" size={20} />
                                    </motion.button>
                                </Link>
                            ) : (
                                // Logged out: Primary + Secondary CTAs
                                <>
                                    <Link to="/auth/signup" className="w-full sm:w-auto">
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-full sm:w-auto app-btn-primary px-8 py-4 text-lg"
                                        >
                                            Create Free Account <ArrowRight className="inline ml-2" size={20} />
                                        </motion.button>
                                    </Link>
                                    <Link to="/auth/login" className="w-full sm:w-auto">
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-full sm:w-auto app-btn-ghost px-8 py-4 text-lg"
                                        >
                                            Sign In
                                        </motion.button>
                                    </Link>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleTestDrive}
                                        disabled={loading}
                                        className="w-full sm:w-auto px-8 py-4 text-lg rounded-xl font-medium transition-all border border-orange-500/20 text-orange-400 hover:border-orange-500/50 hover:bg-orange-500/5 disabled:opacity-70"
                                    >
                                        {loading ? "Creating..." : "Try Demo (No Signup)"}
                                    </motion.button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            </section>



            {/* Problems Section */}
            <section id="features" className="relative z-10 py-16 px-6 sm:py-20 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-zinc-950/50">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12 sm:mb-16"
                    >
                        <h2 className="app-title text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 px-2">
                            Stop fighting your tools
                        </h2>
                        <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto px-4">
                            Traditional task managers slow you down. Syncly is built for speed.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Clock,
                                title: "Real-Time Updates",
                                description: "See changes instantly. No more refresh buttons or outdated views."
                            },
                            {
                                icon: GitBranch,
                                title: "Visual Workflows",
                                description: "Drag, drop, and organize tasks with intuitive Kanban boards."
                            },
                            {
                                icon: Users,
                                title: "Seamless Collaboration",
                                description: "Work together without stepping on each other's toes."
                            }
                        ].map((feature, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="app-card p-6 hover:border-orange-500/30 transition-all group"
                            >
                                <feature.icon className="text-orange-400 mb-4 group-hover:scale-110 transition-transform" size={32} />
                                <h3 className="app-title text-lg sm:text-xl font-bold mb-2 text-white">{feature.title}</h3>
                                <p className="text-sm sm:text-base text-zinc-400">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="relative z-10 py-16 px-6 sm:py-20 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12 sm:mb-16"
                    >
                        <h2 className="app-title text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 px-2">
                            Get started in 3 steps
                        </h2>
                    </motion.div>

                    <div className="space-y-12">
                        {[
                            {
                                step: "01",
                                title: "Create your workspace",
                                description: "Sign up and set up your first team in seconds."
                            },
                            {
                                step: "02",
                                title: "Invite your team",
                                description: "Share a simple link and start collaborating instantly."
                            },
                            {
                                step: "03",
                                title: "Start organizing",
                                description: "Create tasks, assign work, and watch productivity soar."
                            }
                        ].map((item, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.15 }}
                                className="relative flex items-start gap-4 sm:gap-6 p-6 rounded-xl border border-white/10 bg-zinc-950/60 backdrop-blur-xl hover:border-orange-500/20 transition-all overflow-hidden"
                            >
                                <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-orange-400/90 flex-shrink-0">{item.step}</div>
                                <div className="flex-1">
                                    <h3 className="app-title text-xl sm:text-2xl font-bold mb-2 text-white">{item.title}</h3>
                                    <p className="text-zinc-400 text-base sm:text-lg">{item.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Real-Time Advantage */}
            <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-zinc-950/50">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="p-8 sm:p-12 rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent backdrop-blur-xl overflow-visible"
                    >
                        <Zap className="text-orange-400 mx-auto mb-6" size={48} />
                        <h2 className="app-title text-3xl sm:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 leading-tight">
                            Live collaboration that feels magical
                        </h2>
                        <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                            Every change syncs instantly across all devices. Your team always sees the latest state—no delays, no conflicts, no confusion.
                        </p>
                    </motion.div>
                </div>
            </section>





            {/* Footer */}
            <footer className="relative z-10 border-t border-white/5 bg-black/40 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid md:grid-cols-3 gap-8 items-center">
                        {/* Logo & Tagline */}
                        <div className="flex flex-col items-start gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-black flex items-center justify-center">
                                    <img src="/logo.png" alt="Syncly Logo" className="w-full h-full object-contain" />
                                </div>
                                <span className="app-title text-xl font-bold text-white">Syncly</span>
                            </div>
                            <p className="text-sm text-zinc-500">Modern task management for modern teams</p>
                        </div>

                        {/* Links */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                            {user && (
                                <Link to="/teams" className="text-sm text-zinc-400 hover:text-white transition-colors">
                                    Teams
                                </Link>
                            )}
                        </div>

                        {/* Copyright */}
                        <div className="text-center md:text-right">
                            <p className="text-sm text-zinc-500">
                                © {new Date().getFullYear()} Syncly. All rights reserved.
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
