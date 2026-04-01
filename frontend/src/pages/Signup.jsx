import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../App";
import { env } from "../config";
import BackgroundWave from "../components/BackgroundWave";

export default function Signup() {
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${env.BACKEND_URL}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) {
          login(data.token, data.user || {
            id: "user-" + Date.now(),
            name: form.name,
            username: form.username.trim().toLowerCase(),
            role: "admin"
          });
          navigate("/teams");
        } else {
          const loginRes = await fetch(`${env.BACKEND_URL}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: form.email, password: form.password }),
          });
          const loginData = await loginRes.json();
          if (loginRes.ok && loginData.token) {
            login(loginData.token, loginData.user || {
              id: "user-" + Date.now(),
              name: form.name,
              username: form.username.trim().toLowerCase(),
              role: "admin"
            });
            navigate("/teams");
          } else {
            alert("Signup successful! Please login.");
            navigate("/auth/login");
          }
        }
      } else {
        setError(data.message || "Signup failed");
      }
    } catch (_err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-page flex flex-col items-center justify-center p-4">
      <BackgroundWave opacity={0.4} />
      <div className="pointer-events-none absolute left-[-140px] top-12 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] right-[-120px] h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="app-panel w-full max-w-md p-8 sm:p-10 relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="app-title text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">Create Account</h1>
          <p className="text-zinc-400 font-light">Join Syncly today.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 text-red-200 text-sm font-medium border border-red-500/20 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300 ml-1">Name</label>
            <input
              name="name"
              type="text"
              required
              placeholder="Your Name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-4 py-3.5 rounded-xl outline-none transition-all border border-white/5 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 bg-white/5 text-zinc-100 placeholder-zinc-600 focus:bg-white/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300 ml-1">Username</label>
            <input
              name="username"
              type="text"
              required
              placeholder="unique_username"
              value={form.username}
              onChange={handleChange}
              className="w-full px-4 py-3.5 rounded-xl outline-none transition-all border border-white/5 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 bg-white/5 text-zinc-100 placeholder-zinc-600 focus:bg-white/10"
            />
            <p className="text-xs text-zinc-500 mt-1 ml-1">Use lowercase letters, numbers, and underscores only.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300 ml-1">Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-3.5 rounded-xl outline-none transition-all border border-white/5 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 bg-white/5 text-zinc-100 placeholder-zinc-600 focus:bg-white/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300 ml-1">Password</label>
            <input
              name="password"
              type="password"
              required
              placeholder="Create a password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-3.5 rounded-xl outline-none transition-all border border-white/5 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 bg-white/5 text-zinc-100 placeholder-zinc-600 focus:bg-white/10"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="app-btn-primary w-full py-4 text-lg disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            <span className="relative z-10">{loading ? "Creating account..." : "Sign up"}</span>
          </motion.button>
        </form>

        <div className="mt-8 text-center text-sm">
          <span className="text-zinc-500">Already have an account? </span>
          <Link
            to="/auth/login"
            className="font-medium text-orange-400 hover:text-orange-300 transition-colors ml-1"
          >
            Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
