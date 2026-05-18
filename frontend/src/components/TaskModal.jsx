import { useState, useEffect } from "react";
import { X } from "lucide-react";

const toDateInputValue = (value) => {
    if (!value) return "";
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (typeof value === 'string') {
        const isoPrefix = value.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(isoPrefix)) return isoPrefix;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().slice(0, 10);
};

export default function TaskModal({ isOpen, onClose, onSave, task, initialDate, initialStatus = "todo", statusOptions = [], teamMembers = [] }) {
    const [formData, setFormData] = useState({
        content: "",
        description: "",
        status: "todo",
        priority: "Medium",
        assigneeIds: [],
        dueDate: "",
    });

    useEffect(() => {
        if (isOpen) {
            if (task) {
                const normalizedTaskStatus = String(task.status || "").trim().toLowerCase();
                const matchedStatusOption = statusOptions.find((option) => {
                    if (!option) return false;
                    const optionId = String(option.id || "").trim().toLowerCase();
                    const optionTitle = String(option.title || "").trim().toLowerCase();
                    return optionId === normalizedTaskStatus || optionTitle === normalizedTaskStatus;
                });
                const internalStatus = matchedStatusOption?.id || task.status || initialStatus;

                setFormData({
                    content: task.content || "",
                    description: task.description || "",
                    status: internalStatus,
                    priority: task.priority || "Medium",
                    assigneeIds: (task.assigneeIds ?? (task.assigneeId ? [task.assigneeId] : []) ?? []).map((v) => String(v)),
                    dueDate: toDateInputValue(task.dueDate ? task.dueDate : new Date()),
                });
            } else {
                setFormData({
                    content: "",
                    description: "",
                    status: initialStatus,
                    priority: "Medium",
                    assigneeIds: [],
                    dueDate: toDateInputValue(initialDate || new Date()),
                });
            }
        }
    }, [isOpen, task, initialDate, initialStatus, statusOptions]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            id: task?.id,
            assigneeIds: Array.isArray(formData.assigneeIds) ? formData.assigneeIds.map(v => Number(v)) : (formData.assigneeIds ? [Number(formData.assigneeIds)] : [])
        });
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
                        <label className="block text-sm font-medium mb-1 opacity-80 text-zinc-400">Assignees</label>
                        <select
                            multiple
                            value={formData.assigneeIds}
                            onChange={(e) => {
                                const values = Array.from(e.target.selectedOptions).map(o => o.value);
                                setFormData({ ...formData, assigneeIds: values });
                            }}
                            className="w-full px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-orange-500/50 bg-white/5 border-white/5 text-zinc-100 focus:bg-white/10 transition-colors appearance-none"
                        >
                            <option value="" className="bg-zinc-900 text-zinc-100">Unassigned</option>
                            {teamMembers.map((member) => (
                                <option key={member.userId} value={member.userId} className="bg-zinc-900 text-zinc-100">
                                    {member.name}
                                </option>
                            ))}
                        </select>
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
