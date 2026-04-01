import { useState } from "react";
import { X, Copy, Check, UserPlus, Shield, User } from "lucide-react";

export default function TeamModal({ isOpen, onClose, team, currentUser, onApprove, onReject }) {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !team) return null;

    // Convert IDs to numbers for comparison
    const isAdmin = Number(currentUser?.id) === Number(team.adminId) || currentUser?.role === 'admin';

    const members = team.members || [];

    const activeMembers = members.filter(m => m.status === "Active");
    const pendingMembers = members.filter(m => m.status === "Pending");

    const handleCopyInvite = () => {
        const inviteUrl = `${window.location.origin}/join/${team.id}`;
        navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-2xl rounded-2xl shadow-2xl p-6 transform transition-all scale-100 max-h-[90vh] overflow-y-auto bg-black/40 backdrop-blur-xl border border-white/10">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Team Settings</h2>
                        <p className="opacity-70 text-sm text-zinc-400">Manage members and permissions</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-zinc-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="mb-8 p-4 rounded-xl border border-white/5 bg-white/5">
                    <h3 className="font-bold mb-2 flex items-center gap-2 text-zinc-200">
                        <UserPlus size={18} /> Invite Members
                    </h3>
                    <div className="flex gap-2">
                        <input
                            readOnly
                            value={`${window.location.origin}/join/${team.id}`}
                            className="flex-1 px-3 py-2.5 rounded-lg border border-white/5 bg-black/20 text-sm text-zinc-300 font-mono"
                        />
                        <button
                            onClick={handleCopyInvite}
                            className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all bg-white text-black hover:bg-zinc-200 shadow-sm"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? "Copied" : "Copy Link"}
                        </button>
                    </div>
                </div>

                {isAdmin && pendingMembers.length > 0 && (
                    <div className="mb-8">
                        <h3 className="font-bold mb-3 flex items-center gap-2 text-zinc-200">
                            Pending Requests <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">{pendingMembers.length}</span>
                        </h3>
                        <div className="space-y-2">
                            {pendingMembers.map(member => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center font-bold text-zinc-300 border border-white/5">
                                            {member.name[0]}
                                        </div>
                                        <div>
                                            <p className="font-medium text-zinc-200">{member.name}</p>
                                            <p className="text-xs opacity-70 text-zinc-400">Requested to join</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onApprove(member.id)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/20"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => onReject(member.id)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <h3 className="font-bold mb-3 flex items-center gap-2 text-zinc-200">
                        Team Members <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/5">{activeMembers.length}</span>
                    </h3>
                    <div className="space-y-2">
                        {activeMembers.map(member => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold bg-gradient-to-br from-zinc-700 to-zinc-800 text-white shadow-sm border border-white/5">
                                        {member.name[0]}
                                    </div>
                                    <div>
                                        <p className="font-medium text-zinc-200">{member.name}</p>
                                        <p className="text-xs opacity-70 text-zinc-400">{member.role}</p>
                                    </div>
                                </div>
                                {member.role === 'Admin' ? (
                                    <Shield size={16} className="text-orange-500" />
                                ) : (
                                    <User size={16} className="opacity-50 text-zinc-600" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
