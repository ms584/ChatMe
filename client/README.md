# ChatMe - Frontend Interface 🌐

Modern, lightning-fast React + Vite frontend for the ChatMe customer support portal. Designed with premium Glassmorphism aesthetics, dynamic micro-animations, and full Socket.io integrations.

## ✨ Key Features

- **Real-Time Data Streams:** Integrated \`Socket.io-client\` manages high-concurrency connections safely, with graceful reconnection logic if the backend encounters connection limits.
- **Glassmorphism UI:** Sophisticated user interface using CSS modules and modern styling paradigms (CSS Custom Properties, Contexts) without relying on Tailwind.
- **Optimistic UI Updates:** Instant typing indicators, cached context retrievals, and smooth infinite scrolling (pagination handles out-of-order limits gracefully).
- **Responsive Navigation:** Single Page Application (SPA) routing powered by \`react-router-dom\` with Private/Admin route protections.
- **Oversized Token Filter:** Custom Axios interceptors automatically evict corrupt or oversized JWT tokens locally to prevent triggering CPU spikes on the API server.

## 🛠️ Tech Stack

- **Framework:** React.js + Vite (Fast HMR)
- **State Management:** React Context API (\`AuthContext\`, \`SocketContext\`, \`ConversationContext\`)
- **Networking:** Axios + Socket.io-client
- **Styling:** Vanilla CSS with modern Glassmorphism aesthetics
- **Routing:** React Router v6

## 🚀 Local Development

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Environment Variables**
   Create a \`.env\` file in the \`client\` directory:
   \`\`\`env
   # Ensure no trailing slash for the proxy routes
   VITE_API_URL=http://localhost:5000
   \`\`\`

3. **Start the Frontend Application**
   \`\`\`bash
   npm run dev
   \`\`\`
   The UI will be accessible at [http://localhost:5173](http://localhost:5173).

### 📁 Architecture Outline
- **\`/src/components\`**: Reusable UI blocks (ProtectedRoutes, Sidebars, GlassContainers)
- **\`/src/pages\`**: Full application views (ChatPage, AdminDashboard, CallbackPage)
- **\`/src/context\`**: Centralized auth and active connection states

## Production build
To build for production, run:
\`\`\`bash
npm run build
\`\`\`
Assets will be generated in the \`dist/\` directory, fully minified and ready to be served over HTTP servers or CDNs.
