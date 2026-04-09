Syncly – The Real-Time Task Board
A collaborative, real-time project management platform built to keep teams connected, updated, and
productive.
Live Links (Add yours here)
- Frontend: https://syncly-d3jz.vercel.app/
- Backend: http://syncly-production-0246.up.railway.app/
Overview
Syncly is a real-time task management dashboard designed for teams that need instant updates,
smooth communication, and a powerful visual workflow. Includes multiple theme-changing options.
Key Features
- Authentication & authorization (JWT)
- Kanban boards with drag-and-drop
- Real-time updates via Socket.IO
- Comments, activity feed & notifications
- Global search, filters, sorting & pagination 
- Multiple theme switcher options
- Role-based permissions
Tech Stack
Frontend: React, React Router, Context/Redux, TailwindCSS, Axios, react-beautiful-dnd
Backend: Node.js, Express, Socket.IO
Database: MongoDB Atlas (Mongoose)
Hosting: Vercel/Netlify (Frontend), Render/Railway (Backend)
API Overview
Includes authentication, project, task, comments, notifications, and user management endpoints.
Installation
1. Clone: git clone https://github.com/yourusername/syncly.git
2. Install: cd client && npm install; cd server && npm install
3. Run: npm run dev (frontend), npm start (backend)
Theme Changing
Supports multiple themes including light, dark, and accent themes.
License
MIT License.
