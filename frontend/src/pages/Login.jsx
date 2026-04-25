import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../App";
import { env } from "../config";
import BackgroundWave from "../components/BackgroundWave";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${env.BACKEND_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user || { id: "user-1", name: "Kushagra", role: "admin" });
        navigate("/teams");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (_err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestDrive = async () => {
    setError("");
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
        setError(data.message || "Test drive failed");
      }
    } catch (_err) {
      setError("An error occurred during test drive. Please try again.");
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
          <h1 className="app-title text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">Welcome Back</h1>
          <p className="text-zinc-400 font-light">Enter your details to sign in.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 text-red-200 text-sm font-medium border border-red-500/20 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-3.5 pr-12 rounded-xl outline-none transition-all border border-white/5 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 bg-white/5 text-zinc-100 placeholder-zinc-600 focus:bg-white/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="app-btn-primary w-full py-4 text-lg disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            <span className="relative z-10">{loading ? "Logging in..." : "Sign in"}</span>
          </motion.button>
        </form>

        <div className="mt-6 flex items-center my-4 before:flex-1 before:border-t before:border-white/10 before:mr-6 after:flex-1 after:border-t after:border-white/10 after:ml-6">
          <span className="text-zinc-500 text-sm">OR</span>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleTestDrive}
          disabled={loading}
          className="app-btn-ghost w-full py-4 text-lg disabled:opacity-70 disabled:cursor-not-allowed border border-orange-500/20 hover:border-orange-500/50"
        >
          <span className="relative z-10 text-orange-400">{loading ? "Creating..." : "Recruiter Test Drive"}</span>
        </motion.button>

        <div className="mt-8 text-center text-sm">
          <span className="text-zinc-500">Don't have an account? </span>
          <Link
            to="/auth/signup"
            className="font-medium text-orange-400 hover:text-orange-300 transition-colors ml-1"
          >
            Sign up
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
