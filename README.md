# ChatMe 💬

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/Frontend-React%20v18-61DAFB?logo=react&logoColor=white)
![Express](https://img.shields.io/badge/Backend-Express.js-000000?logo=express&logoColor=white)
![Socket.io](https://img.shields.io/badge/Realtime-Socket.io-010101?logo=socket.io&logoColor=white)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb&logoColor=white)

> **The Pain Point:** GitHub is the world’s largest and most active developer platform, yet it crucially lacks a native, real-time direct messaging system. Developers rely on scattered third-party tools to communicate. 

**ChatMe** solves this by bridging the gap with a hyper-secure, real-time customer support and developer communication layer that authenticates users directly via GitHub OAuth. It serves as an instant "Developer Helpdesk" or direct messaging interface for project administrators.

---

## ✨ Features
- **GitHub Single Sign-On (SSO):** Seamless 1-click login using GitHub OAuth.
- **Real-Time Messaging:** Instant delivery, read status, and live typing indicators powered by Socket.io.
- **Centralized Admin Dashboard:** Administrators have a dynamic, real-time overview of all active user conversations.
- **Push Broadcasting:** Admins can instantly broadcast messages to all non-blocked users.
- **Administrative Moderation:** Hard delete messages, block abusive users, and clear malicious bot conversations.
- **Glassmorphism UI:** Stunning, responsive front-end crafted with modern CSS Custom Properties.

## 🛡️ Enterprise-Grade Security
ChatMe was explicitly engineered under rigorous penetration testing principles to handle hostile traffic:
- **Authentication:** Stateless Pinned JWT (HS256) stored securely; resistant to `alg:none` bypassing and CPU-exhaustion (Long-token) attacks. 
- **Database Safety:** Mongoose casting strictness, Index-Miss protections to stop O(N) Collection Scans, and NoSQL Injection sanitization (`express-mongo-sanitize`).
- **Denial of Service (DoS) Hardening:** 
  - Thundering Herd (Cache Stampede) Single-Flight limiters in memory.
  - Granular API Rate Limiting + WebSocket message rate-limiting per client IP (`X-Forwarded-For` proxy resolution).
  - Socket.io Max Payload bounded to 10KB to prevent Memory Exhaustion crashes.
- **Data Leak Prevention:** Aggressive stripping of internal architecture metadata (e.g., MongoDB `__v`) before API JSON serialization.

---

## 🏗️ Technical Stack

### **Frontend (`/client`)**
- **Core:** React 18, Vite
- **Routing:** React Router DOM v6
- **State:** React Context API (Auth, Socket, Conversations)
- **Networking:** Axios, Socket.io-client
- **Styling:** Vanilla CSS Modules with dynamic variables

### **Backend (`/server`)**
- **Core:** Node.js, Express.js
- **Database:** MongoDB, Mongoose ORM
- **Auth:** Passport.js (GitHub Strategy), JSON Web Tokens (JWT)
- **Security:** Helmet, CORS, Express Rate Limit

---

## 🚀 How to Use / Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/) (Local instance or Atlas URI)
- A GitHub OAuth Application (Setup via *GitHub Settings > Developer settings > OAuth Apps*)

### 1. Clone the Repository
\`\`\`bash
git clone https://github.com/ms584/ChatMe.git
cd ChatMe
\`\`\`

### 2. Environment Configuration
You need two \`.env\` files (one for the client, one for the server).

**Server:** Create \`server/.env\`
\`\`\`env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/chatme
JWT_SECRET=your_32_character_super_secret_string
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:5000/auth/github/callback
ADMIN_GITHUB_USERNAME=your_github_username
\`\`\`

**Client:** Create \`client/.env\`
\`\`\`env
VITE_API_URL=http://localhost:5000
\`\`\`

### 3. Install Dependencies
Open two terminals and install packages for both ends:
\`\`\`bash
# Terminal 1: Setup Backend
cd server
npm install
npm run dev

# Terminal 2: Setup Frontend
cd client
npm install
npm run dev
\`\`\`

### 4. Experience ChatMe
- Navigate to `http://localhost:5173`
- Click **Login with GitHub**
- Since your Username matches `ADMIN_GITHUB_USERNAME`, you will unlock the **Admin Dashboard**.
- Other users logging in will be routed directly to the customer chat interface.

---

## ☁️ Deployment (Render.com)

ChatMe is perfectly optimized for free-tier or production deployment on [Render](https://render.com). The repository contains two distinct applications that you should deploy separately.

### 1. Deploy the Backend Server (Web Service)
1. In Render, create a new **Web Service**.
2. Connect this GitHub repository.
3. Configure the settings:
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` (Make sure you have `"start": "node server.js"` in `server/package.json`)
4. Add all your Environment Variables (`MONGO_URI`, `JWT_SECRET`, etc.).
   - Set `NODE_ENV=production`.
   - Set `CLIENT_URL` to what your Frontend URL will be.
5. Deploy the Service. *Copy the backend URL (e.g., https://chatme-backend.onrender.com).*

### 2. Update GitHub OAuth Settings
Before deploying the frontend, go to your GitHub Developer Settings and update your OAuth App:
- **Homepage URL:** Your planned Frontend URL
- **Authorization callback URL:** Your new Backend URL + `/auth/github/callback` (e.g., `https://chatme-backend.onrender.com/auth/github/callback`)

### 3. Deploy the Frontend (Static Site)
1. In Render, create a new **Static Site**.
2. Connect this same GitHub repository.
3. Configure the settings:
   - **Root Directory:** `client`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Add Environment Variables:
   - `VITE_API_URL` = Your Backend Render URL
5. **CRITICAL:** Add a Redirect/Rewrite rule under the Render "Redirects/Rewrites" tab so React Router works on refresh:
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Status:** `200`
6. Deploy the Site!

---

## 📄 License
This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for more details.
