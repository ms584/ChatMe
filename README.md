# ChatMe 💬

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/Frontend-React%20v18-61DAFB?logo=react&logoColor=white)
![Express](https://img.shields.io/badge/Backend-Express.js-000000?logo=express&logoColor=white)
![Socket.io](https://img.shields.io/badge/Realtime-Socket.io-010101?logo=socket.io&logoColor=white)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb&logoColor=white)

[![💬 Open ChatMe — Live Demo](https://img.shields.io/badge/%F0%9F%92%AC%20Open%20ChatMe-Live%20Demo-6C63FF?style=for-the-badge)](https://chatme-t2ke.onrender.com)

> **The Problem:** GitHub is the world's largest developer platform — yet it has no native real-time messaging. Developers rely on scattered third-party tools just to talk about the code they're already collaborating on.
>
> **ChatMe** bridges that gap. It's a hyper-secure, real-time support and messaging layer that authenticates users directly via GitHub OAuth — acting as an instant **Developer Helpdesk** for project administrators.

---

## 🖥️ Screenshots

<table>
  <tr>
    <td align="center" width="50%">
      <b>🔐 Login Page</b><br/><br/>
      <img width="655" height="608" alt="ChatMe Login Page" src="https://github.com/user-attachments/assets/9edb2c4c-b84f-42e5-81f2-ac14156830ce" />
      <sub>GitHub OAuth · Glassmorphism UI</sub>
    </td>
    <td align="center" width="50%">
      <b>🖥️ Admin Dashboard</b><br/><br/>
      <img width="1919" height="938" alt="ChatMe Admin Dashboard" src="https://github.com/user-attachments/assets/da3744b6-4887-4fa1-8611-0fbbd4d728bf" />
      <sub>Real-time conversation list · Broadcast · Block History</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <b>💬 Admin Chat View</b><br/><br/>
      <img width="1918" height="942" alt="ChatMe Admin Chat" src="https://github.com/user-attachments/assets/84df8265-927c-4cf6-ab88-65540daff1b9" />
      <sub>Block · Clear Chat · Broadcast per user</sub>
    </td>
    <td align="center" width="50%">
      <b>👤 User Chat View</b><br/><br/>
      <img width="1919" height="943" alt="ChatMe User Chat" src="https://github.com/user-attachments/assets/439bccec-d4da-4092-bbda-1eeaa31b4d3a" />
      <sub>Real-time messaging · Connected status</sub>
    </td>
  </tr>
</table>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **GitHub Single Sign-On** | 1-click login via GitHub OAuth — no passwords needed |
| ⚡ **Real-Time Messaging** | Instant delivery, read receipts & live typing indicators via Socket.io |
| 🖥️ **Admin Dashboard** | Centralized real-time overview of all active user conversations |
| 📢 **Push Broadcasting** | Instantly blast a message to all non-blocked users |
| 🛡️ **Moderation Tools** | Hard-delete messages, block abusive users, clear bot conversations |
| 🎨 **Glassmorphism UI** | Stunning, responsive frontend built with modern CSS Custom Properties |

---

## 🛡️ Enterprise-Grade Security

ChatMe was explicitly engineered under rigorous penetration-testing principles to handle hostile traffic.

**🔑 Authentication**
- Stateless Pinned JWT (HS256) stored securely
- Resistant to `alg:none` bypass and CPU-exhaustion (long-token) attacks

**🗄️ Database Safety**
- Mongoose strict casting + Index-Miss protections to stop O(N) collection scans
- NoSQL injection sanitization via `express-mongo-sanitize`

**🔥 Denial of Service Hardening**
- Thundering Herd (Cache Stampede) single-flight limiters in memory
- Granular API rate limiting + WebSocket message rate-limiting per client IP (`X-Forwarded-For` proxy resolution)
- Socket.io max payload bounded to **10KB** to prevent memory exhaustion crashes

**🔒 Data Leak Prevention**
- Aggressive stripping of internal architecture metadata (e.g., MongoDB `__v`) before API JSON serialization

---

## 🏗️ Technical Stack

### Frontend (`/client`)

| Layer | Technology |
|---|---|
| Core | React 18, Vite |
| Routing | React Router DOM v6 |
| State | React Context API (Auth, Socket, Conversations) |
| Networking | Axios, Socket.io-client |
| Styling | Vanilla CSS Modules with dynamic CSS variables |

### Backend (`/server`)

| Layer | Technology |
|---|---|
| Core | Node.js, Express.js |
| Database | MongoDB, Mongoose ORM |
| Auth | Passport.js (GitHub Strategy), JSON Web Tokens (JWT) |
| Security | Helmet, CORS, Express Rate Limit, express-mongo-sanitize |

---

## 🚀 Local Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or higher
- [MongoDB](https://www.mongodb.com/) (local instance or Atlas URI)
- A GitHub OAuth App — create one at **GitHub Settings → Developer settings → OAuth Apps**

### 1. Clone the Repository

```bash
git clone https://github.com/ms584/ChatMe.git
cd ChatMe
```

### 2. Environment Configuration

You need two `.env` files — one for each end of the stack.

**`server/.env`**
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/chatme
JWT_SECRET=your_32_character_super_secret_string
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:5000/auth/github/callback
ADMIN_GITHUB_USERNAME=your_github_username
```

**`client/.env`**
```env
VITE_API_URL=http://localhost:5000
```

### 3. Install Dependencies

Open two terminals and run both simultaneously:

```bash
# Terminal 1 — Backend
cd server
npm install
npm run dev

# Terminal 2 — Frontend
cd client
npm install
npm run dev
```

### 4. Open the App

Navigate to `http://localhost:5173` and click **Sign in with GitHub**.

> **Tip:** If your GitHub username matches `ADMIN_GITHUB_USERNAME`, you'll be routed to the **Admin Dashboard**. All other users land in the standard chat interface.

---

## ☁️ Deployment (Render.com)

ChatMe is optimized for free-tier or production deployment on [Render](https://render.com). Deploy the two apps separately.

### Step 1 — Deploy the Backend (Web Service)

1. Create a new **Web Service** in Render and connect this repository.
2. Configure:
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. Add all environment variables from `server/.env`, setting `NODE_ENV=production` and `CLIENT_URL` to your planned frontend URL.
4. Deploy and copy the backend URL (e.g. `https://chatme-backend.onrender.com`).

### Step 2 — Update GitHub OAuth Settings

In **GitHub Developer Settings → OAuth Apps**, update your app:
- **Homepage URL:** your planned frontend URL
- **Authorization callback URL:** `https://chatme-backend.onrender.com/auth/github/callback`

### Step 3 — Deploy the Frontend (Static Site)

1. Create a new **Static Site** in Render and connect this repository.
2. Configure:
   - **Root Directory:** `client`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
3. Add environment variable: `VITE_API_URL` = your backend Render URL
4. Under **Redirects/Rewrites**, add:

   | Source | Destination | Status |
   |---|---|---|
   | `/*` | `/index.html` | `200` |

   > This is **critical** — without it, React Router will break on page refresh.

5. Deploy!

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
