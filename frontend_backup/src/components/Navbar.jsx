import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../App";

export default function Navbar() {
    const { user } = useAuth();

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-zinc-950/75 backdrop-blur-xl font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Left: Logo & Links */}
                    <div className="flex items-center gap-8">
                        <Link to={user ? "/teams" : "/"} className="flex items-center gap-2 group">
                            <div className="relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-amber-600 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                                <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-black flex items-center justify-center shadow-lg">
                                    <img src="/logo.png" alt="Syncly Logo" className="w-full h-full object-contain" />
                                </div>
                            </div>
                            <span className="app-title text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-300">
                                Syncly
                            </span>
                        </Link>

                        {/* Anchor Links - Hidden on mobile */}
                        <div className="hidden md:flex items-center gap-6">
                            <button
                                onClick={() => scrollToSection("features")}
                                className="text-sm text-zinc-400 hover:text-white transition-colors"
                            >
                                Features
                            </button>
                            <button
                                onClick={() => scrollToSection("how-it-works")}
                                className="text-sm text-zinc-400 hover:text-white transition-colors"
                            >
                                How It Works
                            </button>
                        </div>
                    </div>

                    {/* Right: Auth-aware buttons */}
                    <div className="flex items-center gap-3">
                        {user ? (
                            // Logged in: Show profile access
                            <Link to="/me">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="app-btn-ghost"
                                >
                                    View Profile
                                </motion.button>
                            </Link>
                        ) : (
                            // Logged out: Show Sign In + Sign Up
                            <>
                                <Link to="/auth/login">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors"
                                    >
                                        Sign In
                                    </motion.button>
                                </Link>
                                <Link to="/auth/signup">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="app-btn-primary"
                                    >
                                        Sign Up
                                    </motion.button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
