import { Draggable } from "@hello-pangea/dnd";
import { createPortal } from "react-dom";
import { Trash2, MoreHorizontal, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
        case 'high': return 'bg-red-500/10 text-red-400 border-red-500/20';
        case 'medium': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        case 'low': return 'bg-green-500/10 text-green-400 border-green-500/20';
        default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
};

export default function TaskCard({ task, index, onClick, onDelete, onAdvance, onRegress }) {
    const status = task?.status;
    const isDone = status === 'done' || status === 'Done';
    const isTodo = status === 'todo' || status === 'To Do' || !status;

    const assigneeName =
        typeof task?.assignee === 'string'
            ? task.assignee
            : task?.assignee?.name;
    
    return (
        <Draggable draggableId={String(task.id)} index={index}>
            {(provided, snapshot) => {
                const child = (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="group rounded-xl mb-3"
                        style={{
                            ...provided.draggableProps.style,
                            outline: 'none'
                        }}
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowRight' && !isDone) {
                                e.preventDefault();
                                onAdvance(task);
                            } else if (e.key === 'ArrowLeft' && !isTodo) {
                                e.preventDefault();
                                onRegress(task);
                            } else if (e.key === 'Enter') {
                                e.preventDefault();
                                onClick(task);
                            }
                        }}
                    >
                        <motion.div
                            onClick={() => onClick(task)}
                            whileHover={!snapshot.isDragging ? { y: -4, boxShadow: "0 10px 30px -10px rgba(255, 85, 0, 0.15)" } : {}}
                            transition={{ duration: 0.2 }}
                            className={`p-4 rounded-xl shadow-sm border border-zinc-800 hover:border-orange-500/30 transition-colors cursor-pointer bg-zinc-900/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${snapshot.isDragging ? "shadow-2xl bg-zinc-800 ring-1 ring-orange-500 scale-105" : ""}`}
                        >
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                                {task.priority?.toUpperCase() || 'NORMAL'}
                            </span>
                            <div className="flex items-center gap-1">
                                {!isTodo && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRegress(task);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 rounded-md"
                                        title="Move to Previous Stage"
                                    >
                                        <ArrowLeft size={14} />
                                    </button>
                                )}
                                {!isDone && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAdvance(task);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 rounded-md"
                                        title="Move to Next Stage"
                                    >
                                        <ArrowRight size={14} />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(task.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-500/10 text-red-500 rounded-md"
                                    title="Delete Task"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        <h4 className="font-semibold text-sm mb-3 line-clamp-2 text-zinc-200">
                            {task.content}
                        </h4>

                        <div className="flex justify-between items-center mt-auto">
                            <span className="text-xs opacity-60 font-medium text-zinc-400">
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                            </span>

                            {assigneeName && (
                                <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border shadow-sm bg-zinc-800 text-white border-zinc-700"
                                    title={assigneeName}
                                >
                                    {getInitials(assigneeName)}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            );
            
            if (snapshot.isDragging) {
                return createPortal(child, document.body);
            }
            return child;
        }}
        </Draggable>
    );
}
