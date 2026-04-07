import { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, Edit2, Check, X, Shield, MoreVertical } from "lucide-react";
import { getInitials } from "./TaskCard";

export default function RightSidebar({ team, currentUser, onInvite, onRenameTeam, onManageMember }) {
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(team?.name || "");

    if (!team) return (
        <div className="w-80 border-l border-zinc-800 p-6 hidden lg:block glass bg-zinc-900/50">
            <div className="animate-pulse space-y-4">
                <div className="h-8 bg-zinc-800 rounded w-3/4"></div>
                <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
                <div className="space-y-3 pt-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-10 bg-zinc-800 rounded"></div>)}
                </div>
            </div>
        </div>
    );

    const isAdmin = currentUser?.id === team.adminId || currentUser?.role === 'admin';

    const handleRenameSubmit = (e) => {
        e.preventDefault();
        if (newName.trim()) {
            onRenameTeam(newName);
            setIsRenaming(false);
        }
    };

    return (
        <div className="w-80 border-l border-white/5 flex flex-col h-full hidden lg:flex bg-black/10 backdrop-blur-md">
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between mb-1">
                    {isRenaming ? (
                        <form onSubmit={handleRenameSubmit} className="flex items-center gap-2 w-full">
                            <input
                                autoFocus
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full px-2 py-1.5 rounded-lg border text-lg font-bold bg-white/5 text-white focus:outline-none focus:ring-1 focus:ring-orange-500/50 border-white/10"
                                onBlur={() => setIsRenaming(false)}
                            />
                            <button type="submit" className="p-1 text-green-500 hover:bg-green-500/10 rounded"><Check size={16} /></button>
                        </form>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold truncate text-zinc-100 tracking-tight">{team.name}</h2>
                            {isAdmin && (
                                <button
                                    onClick={() => {
                                        setNewName(team.name);
                                        setIsRenaming(true);
                                    }}
                                    className="p-1.5 rounded hover:bg-white/5 opacity-50 hover:opacity-100 transition-all text-zinc-300"
                                    title="Rename Team"
                                >
                                    <Edit2 size={14} />
                                </button>
                            )}
                        </>
                    )}
                </div>
                <p className="text-xs font-medium opacity-60 uppercase tracking-wider text-zinc-400">
                    {team.members?.length || 0} Members
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {team.members?.map(member => (
                    <div
                        key={member.id}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <Link to={`/u/${member.username || member.userId}`} className="relative block">
                                <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border border-white/5 bg-zinc-800 text-white"
                                >
                                    {member.avatarUrl ? (
                                        <img
                                            src={member.avatarUrl}
                                            alt={member.name}
                                            className="h-full w-full rounded-full object-cover"
                                        />
                                    ) : (
                                        getInitials(member.name)
                                    )}
                                </div>
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-zinc-900 rounded-full"></div>
                            </Link>

                            <div className="flex flex-col">
                                <Link to={`/u/${member.username || member.userId}`} className="font-medium text-sm leading-tight text-zinc-200 hover:text-white transition-colors">
                                    {member.name} {member.userId === currentUser?.id && "(You)"}
                                </Link>
                                <span className="text-[10px] opacity-60 text-zinc-400 mt-0.5">
                                    {member.role}
                                </span>
                            </div>
                        </div>

                        {isAdmin && member.userId !== currentUser?.id && (
                            <button
                                onClick={() => onManageMember(member)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded transition-all text-zinc-400"
                            >
                                <MoreVertical size={14} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-white/5 bg-black/10">
                <button
                    onClick={onInvite}
                    className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all transform hover:-translate-y-0.5 bg-orange-600 hover:bg-orange-500 text-white"
                >
                    <UserPlus size={18} /> Invite Member
                </button>
            </div>
        </div>
    );
}
