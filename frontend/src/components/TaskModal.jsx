import { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function TaskModal({ isOpen, onClose, onSave, task, initialDate, initialStatus = "todo" }) {
    const [formData, setFormData] = useState({
        content: "",
        description: "",
        status: "todo",
        priority: "Medium",
        assignee: "",
        dueDate: "",
    });

    useEffect(() => {
        if (isOpen) {
            if (task) {
                // Map backend status format to internal format
                const statusMap = {
                    'To Do': 'todo',
                    'In Progress': 'inprogress',
                    'Done': 'done'
                };
                const internalStatus = statusMap[task.status] || task.status || 'todo';

                setFormData({
                    content: task.content || "",
                    description: task.description || "",
                    status: internalStatus,
                    priority: task.priority || "Medium",
                    assignee: task.assignee || "",
                    dueDate: task.dueDate || "",
                });
            } else {
                setFormData({
                    content: "",
                    description: "",
                    status: initialStatus,
                    priority: "Medium",
                    assignee: "",
                    dueDate: initialDate || new Date().toISOString().split('T')[0],
                });
            }
        }
    }, [isOpen, task, initialDate, initialStatus]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...formData, id: task?.id });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl shadow-2xl p-6 transform transition-all scale-100 bg-black/40 backdrop-blur-xl border border-white/10">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
                        {task ? "Edit Task" : "New Task"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-zinc-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 opacity-80 text-zinc-400">Title</label>
                        <input
                            required
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-orange-500/50 bg-white/5 border-white/5 text-zinc-100 placeholder-zinc-600 focus:bg-white/10 transition-colors"
                            placeholder="Task title"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 opacity-80 text-zinc-400">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-1 resize-none focus:ring-orange-500/50 bg-white/5 border-white/5 text-zinc-100 placeholder-zinc-600 focus:bg-white/10 transition-colors"
                            rows={3}
                            placeholder="Add details..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 opacity-80 text-zinc-400">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-orange-500/50 bg-white/5 border-white/5 text-zinc-100 focus:bg-white/10 transition-colors appearance-none"
                            >
                                <option value="Low" className="bg-zinc-900 text-zinc-100">Low</option>
                                <option value="Medium" className="bg-zinc-900 text-zinc-100">Medium</option>
                                <option value="High" className="bg-zinc-900 text-zinc-100">High</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 opacity-80 text-zinc-400">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-orange-500/50 bg-white/5 border-white/5 text-zinc-100 focus:bg-white/10 transition-colors appearance-none"
                            >
                                <option value="todo" className="bg-zinc-900 text-zinc-100">To Do</option>
                                <option value="inprogress" className="bg-zinc-900 text-zinc-100">In Progress</option>
                                <option value="done" className="bg-zinc-900 text-zinc-100">Done</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 opacity-80 text-zinc-400">Due Date</label>
                            <input
                                type="date"
                                required
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-orange-500/50 bg-white/5 border-white/5 text-zinc-100 focus:bg-white/10 transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 opacity-80 text-zinc-400">Assignee</label>
                        <input
                            value={formData.assignee}
                            onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-orange-500/50 bg-white/5 border-white/5 text-zinc-100 placeholder-zinc-600 focus:bg-white/10 transition-colors"
                            placeholder="Assign to..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl font-medium border hover:bg-white/5 transition-colors border-white/10 text-zinc-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 rounded-xl font-bold shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 transition-all transform hover:-translate-y-0.5 bg-orange-600 hover:bg-orange-500 text-white"
                        >
                            {task ? "Save Changes" : "Create Task"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
