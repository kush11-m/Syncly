import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Check, UserPlus, Trash2, Edit3, CheckCircle } from "lucide-react";
import { env } from "../config";
import { useAuth } from "../App";

export default function NotificationPanel({ isOpen, onClose, user, onNotificationClick, socket, onUnreadCountChange }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const { logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && user) {
            fetchNotifications();
        }
    }, [isOpen, user]);

    // Listen for real-time notifications
    useEffect(() => {
        if (!socket || !user) return;

        const handleNewNotification = async () => {
            // Refresh notifications when a new one arrives
            if (isOpen) {
                await fetchNotifications();
            }
        };

        const channel = socket.subscribe(`user_${user.id}`);
        channel.bind('new_notification', handleNewNotification);

        return () => {
            channel.unbind('new_notification', handleNewNotification);
        };
    }, [socket, isOpen, user]);


    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${env.BACKEND_URL}/api/notifications`, {
                headers: { 'Authorization': user?.token }
            });
            if (res.status === 401) {
                logout();
                navigate('/auth/login', { replace: true });
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            const res = await fetch(`${env.BACKEND_URL}/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': user?.token }
            });
            if (res.status === 401) {
                logout();
                navigate('/auth/login', { replace: true });
                return;
            }
            setNotifications(prev => {
                const updated = prev.map(n => n.id === notificationId ? { ...n, read: true } : n);
                // Update parent's unread count
                if (onUnreadCountChange) {
                    const newUnreadCount = updated.filter(n => !n.read).length;
                    onUnreadCountChange(newUnreadCount);
                }
                return updated;
            });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const res = await fetch(`${env.BACKEND_URL}/api/notifications/read-all`, {
                method: 'PUT',
                headers: { 'Authorization': user?.token }
            });
            if (res.status === 401) {
                logout();
                navigate('/auth/login', { replace: true });
                return;
            }
            setNotifications(prev => {
                const updated = prev.map(n => ({ ...n, read: true }));
                // Update parent's unread count to 0
                if (onUnreadCountChange) {
                    onUnreadCountChange(0);
                }
                return updated;
            });
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            const res = await fetch(`${env.BACKEND_URL}/api/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: { 'Authorization': user?.token }
            });
            if (res.status === 401) {
                logout();
                navigate('/auth/login', { replace: true });
                return;
            }
            setNotifications(prev => {
                const updated = prev.filter(n => n.id !== notificationId);
                // Update parent's unread count
                if (onUnreadCountChange) {
                    const newUnreadCount = updated.filter(n => !n.read).length;
                    onUnreadCountChange(newUnreadCount);
                }
                return updated;
            });
        } catch (error) {
            console.error("Error deleting notification:", error);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'join_request': return <UserPlus size={18} className="text-blue-400" />;
            case 'member_approved': return <CheckCircle size={18} className="text-green-400" />;
            case 'member_rejected': return <X size={18} className="text-red-400" />;
            case 'task_created': return <Edit3 size={18} className="text-orange-400" />;
            case 'task_updated': return <Edit3 size={18} className="text-yellow-400" />;
            case 'task_deleted': return <Trash2 size={18} className="text-red-400" />;
            default: return <Check size={18} className="text-zinc-400" />;
        }
    };

    if (!isOpen) return null;

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed right-0 top-0 h-full w-full sm:w-96 z-50 bg-black/95 backdrop-blur-xl border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-zinc-100">Notifications</h2>
                            {unreadCount > 0 && (
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    {unreadCount} unread
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Actions */}
                    {unreadCount > 0 && (
                        <div className="px-4 py-2 border-b border-white/5">
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors"
                            >
                                Mark all as read
                            </button>
                        </div>
                    )}

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <Check size={32} className="text-zinc-600" />
                                </div>
                                <p className="text-zinc-400 font-medium">No notifications</p>
                                <p className="text-xs text-zinc-600 mt-1">You're all caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-white/5 transition-colors cursor-pointer group ${!notification.read ? 'bg-white/[0.02]' : ''
                                            }`}
                                        onClick={() => {
                                            markAsRead(notification.id);
                                            if (onNotificationClick) {
                                                onNotificationClick(notification);
                                            }
                                        }}
                                    >
                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 mt-0.5">
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${!notification.read ? 'font-medium text-zinc-100' : 'text-zinc-300'}`}>
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-zinc-500 mt-1">
                                                    {new Date(notification.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notification.id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 hover:bg-red-500/10 text-red-500 rounded transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        {!notification.read && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-orange-500 rounded-r"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
