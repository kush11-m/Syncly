import { useState } from "react";
import { Link } from "react-router-dom";
import { X, Copy, Check, UserPlus, Shield, User } from "lucide-react";

export default function TeamModal({ isOpen, onClose, team, currentUser, onApprove, onReject, onRoleChange }) {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !team) return null;

    // Convert IDs to numbers for comparison
    const currentUserMember = team?.members?.find(m => Number(m.userId) === Number(currentUser?.id));
    const isOwner = Number(currentUser?.id) === Number(team.adminId);
    
    let isTeamAdmin = isOwner;
    if (currentUserMember && currentUserMember.role && typeof currentUserMember.role === 'string') {
        if (currentUserMember.role.toLowerCase() === 'admin') {
            isTeamAdmin = true;
        }
    }

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
                    <div className="flex gap-3 items-center">
                        <div className="flex-1 px-4 py-3 rounded-xl border border-orange-500/20 bg-orange-500/5 text-sm text-orange-200 font-mono tracking-wide">
                            syncly.com/join/ <span className="text-zinc-500">{team.id.substring(0,8)}...</span>
                        </div>
                        <button
                            onClick={handleCopyInvite}
                            className="px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20"
                        >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                            {copied ? "Copied" : "Copy Link"}
                        </button>
                    </div>
                </div>

                {isTeamAdmin && pendingMembers.length > 0 && (
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
                                            {member.avatarUrl ? (
                                                <img
                                                    src={member.avatarUrl}
                                                    alt={member.name}
                                                    className="h-full w-full rounded-full object-cover"
                                                />
                                            ) : (
                                                member.name[0]
                                            )}
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
                            <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <Link to={`/u/${member.username || member.userId}`} className="block relative">
                                        {member.avatarUrl ? (
                                            <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/20 flex items-center justify-center text-sm font-bold text-orange-200">
                                                {member.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                        )}
                                    </Link>
                                    <div>
                                        <Link to={`/u/${member.username || member.userId}`} className="font-medium text-zinc-200 hover:text-white transition-colors">{member.name}</Link>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {(()=>{
                                                let canEditRole = false;
                                                const isTargetOwner = Number(member.userId) === Number(team.adminId);
                                                
                                                if (isOwner) {
                                                    canEditRole = !isTargetOwner;
                                                } else if (isTeamAdmin) {
                                                    const targetRole = (member.role && typeof member.role === 'string') ? member.role.toLowerCase() : '';
                                                    if (!isTargetOwner && targetRole !== 'admin') {
                                                        canEditRole = true;
                                                    }
                                                }

                                                if (canEditRole) {
                                                    return (
                                                        <select
                                                            value={member.role || 'Member'}
                                                            onChange={(e) => onRoleChange && onRoleChange(member.id, e.target.value)}
                                                            className="bg-black/40 border border-white/10 text-zinc-300 text-xs rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                                                        >
                                                            {isOwner ? <option value="Admin">Admin</option> : null}
                                                            <option value="Member">Member</option>
                                                            <option value="Viewer">Viewer</option>
                                                        </select>
                                                    );
                                                } else {
                                                    return <span className="text-xs text-zinc-500">{member.role || ''}</span>;
                                                }
                                            })()}
                                            {Number(member.userId) === Number(team.adminId) && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-medium">Owner</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
