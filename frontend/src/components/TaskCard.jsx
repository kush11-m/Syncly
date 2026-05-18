import { useState } from "react";
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
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const status = task?.status;
    const isDone = status === 'done' || status === 'Done';
    const isTodo = status === 'todo' || status === 'To Do' || !status;
    const description = (task?.description || "").trim();
    const hasLongDescription = description.length > 100;
    const previewDescription = hasLongDescription && !isDescriptionExpanded
        ? `${description.slice(0, 100)}...`
        : description;

    const assigneeNames = (() => {
        if (Array.isArray(task?.assignees) && task.assignees.length) return task.assignees.map(a => a.name).filter(Boolean);
        if (task?.assignee && typeof task.assignee === 'object' && task.assignee.name) return [task.assignee.name];
        if (typeof task?.assignee === 'string') return [task.assignee];
        if (Array.isArray(task?.assigneeIds) && task.assigneeIds.length && Array.isArray(task?.assigneeNames)) return task.assigneeNames;
        return [];
    })();
    
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

                        {description ? (
                            <div className="mb-3">
                                <p className="text-xs text-zinc-400 leading-relaxed break-words">
                                    {previewDescription}
                                </p>
                                {hasLongDescription ? (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsDescriptionExpanded((prev) => !prev);
                                        }}
                                        className="mt-1 text-[11px] text-orange-300 hover:text-orange-200 transition-colors"
                                    >
                                        {isDescriptionExpanded ? "Show less" : "Show more"}
                                    </button>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="flex justify-between items-center mt-auto">
                            <span className="text-xs opacity-60 font-medium text-zinc-400">
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                            </span>

                            {assigneeNames && assigneeNames.length > 0 ? (
                                <div className="text-xs text-zinc-400 flex items-center gap-2">
                                    <span className="font-medium text-zinc-300">Assigned to:</span>
                                    <span className="truncate">{assigneeNames.join(', ')}</span>
                                </div>
                            ) : null}
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
