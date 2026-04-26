export const env = {
    BACKEND_URL: import.meta.env.VITE_API_URL || "http://localhost:8000",
    PUSHER_KEY: import.meta.env.VITE_PUSHER_KEY,
    PUSHER_CLUSTER: import.meta.env.VITE_PUSHER_CLUSTER || "mt1"
};
