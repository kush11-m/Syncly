import { useState } from "react";
import { X, Plus } from "lucide-react";

export default function CreateTeamModal({ isOpen, onClose, onCreate }) {
    const [teamName, setTeamName] = useState("");

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (teamName.trim()) {
            onCreate(teamName);
            setTeamName("");
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl shadow-2xl p-6 transform transition-all scale-100 bg-black/40 backdrop-blur-xl border border-white/10">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Create New Team</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-zinc-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2 opacity-80 text-zinc-400">Team Name</label>
                        <input
                            autoFocus
                            required
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-orange-500/50 bg-white/5 border-white/5 text-zinc-100 placeholder-zinc-600 focus:bg-white/10 transition-colors"
                            placeholder="e.g. Engineering, Marketing..."
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl font-medium border hover:bg-white/5 transition-colors border-white/10 text-zinc-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!teamName.trim()}
                            className="px-6 py-2 rounded-xl font-bold shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-orange-600 hover:bg-orange-500 text-white"
                        >
                            <Plus size={18} /> Create Team
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
