# ChatMe - Backend Server 🛡️

The robust, highly secure Node.js backend for the ChatMe customer support application. Powered by Express, MongoDB, and Socket.io, it is engineered for extreme concurrency, enterprise-level security, and seamless real-time communication.

## 🔥 Key Security Features (Hardened)

This backend has undergone extensive penetration testing and auditing (10+ rigorous rounds) to handle catastrophic production loads safely:

- **JWT Stateless Authentication:** Pinned HS256 algorithms with token length validations to prevent \`alg:none\` and CPU-spike DoS attacks.
- **Thundering Herd Mitigation:** Custom single-flight promise locks in caching layers prevent MongoDB Connection Pool exhaustion during massive bursts of concurrent logins.
- **Memory Exhaustion Protection:** Socket.io max payload size reduced to 10KB. Connection memory limits scaled strictly to 50,000 requests.
- **Deep Proxy Rate Limiting:** Utilizes \`X-Forwarded-For\` fallback resolution to calculate real IPs rather than internal cloud load balancer IPs, preventing self-inflicted proxy DoS.
- **Injection Proof:** Hardened against NoSQL injections (\`express-mongo-sanitize\`) and strictly enforces Object IDs casting in Mongoose queries to prevent silent index-miss queries (O(N) Collection Scans).
- **Data Integrity:** \`__v\` field strips, input data trimming, and pagination parameter bounds (negative limit bypass protections).

## 🛠️ Tech Stack

- **Framework:** Express.js + Node.js
- **Database:** MongoDB + Mongoose
- **Real-time:** Socket.io (with typing indicators & connection rate-limiting)
- **Auth:** Passport.js (GitHub OAuth) + JSON Web Tokens (JWT)

## 📦 Local Setup

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Environment Variables**
   Create a \`.env\` file in the \`server\` directory:
   \`\`\`env
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   MONGO_URI=mongodb://localhost:27017/chatme
   JWT_SECRET=your_super_secret_key_minimum_32_characters
   GITHUB_CLIENT_ID=your_github_oauth_client_id
   GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
   GITHUB_CALLBACK_URL=http://localhost:5000/auth/github/callback
   ADMIN_GITHUB_USERNAME=your_own_github_username
   \`\`\`

3. **Start the Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`
   The server will run on [http://localhost:5000](http://localhost:5000)

## 📡 API Architecture
- \`GET /auth/github\` - GitHub OAuth flow
- \`GET /conversations\` - (Admin) Fetch all active conversations
- \`POST /messages\` - REST fallback for sending chat messages
- **Socket.io Events:** \`send_message\`, \`new_message\`, \`typing\`, \`stop_typing\`
