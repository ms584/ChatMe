import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import api from '../api/axios';
import ProfileModal from '../components/ProfileModal';
import { safeAvatar } from '../utils/safeAvatar';

const ChatPage = () => {
  const { user, logout } = useAuth();
  const token = localStorage.getItem('chatme_token');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);
  const [modalProfile, setModalProfile] = useState(null);
  const [modalIsOwn, setModalIsOwn] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const openAdminProfile = () => {
    if (adminInfo) { setModalProfile(adminInfo); setModalIsOwn(false); }
  };
  const openOwnProfile = () => {
    setModalProfile(user); setModalIsOwn(true);
  };

  const handleNewMessage = (msg) => {
    setMessages((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m._id === msg._id)) return prev;
      return [...prev, msg];
    });
  };

  const handleTyping = ({ isTyping }) => {
    setAdminTyping(isTyping);
  };

  const { sendMessage, sendTyping, socket } = useSocket(token, handleNewMessage, handleTyping);

  // Listen for block/account_status events
  useEffect(() => {
    const s = socket?.current;
    if (!s) return;
    const onBlocked = () => setIsBlocked(true);
    const onStatus = ({ isBlocked: b }) => setIsBlocked(b);
    s.on('message_blocked', onBlocked);
    s.on('account_status', onStatus);
    return () => { s.off('message_blocked', onBlocked); s.off('account_status', onStatus); };
  }, [socket]);

  // Load conversation history + admin info
  useEffect(() => {
    const load = async () => {
      try {
        const { data: msgs } = await api.get(`/messages/${user._id}`);
        setMessages(msgs);
        // Find admin from messages
        const adminMsg = msgs.find((m) => m.senderId?.role === 'admin');
        if (adminMsg) {
          setAdminInfo(adminMsg.senderId);
        } else {
          // No messages yet — fetch admin info via a dummy request workaround
          // We store ADMIN_GITHUB_USERNAME in env but can also check first message later
        }
      } catch { /* stay silent */ } finally {
        setLoading(false);
      }
    };
    load();
  }, [user._id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, adminTyping]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setInput('');
    sendTyping(null, false);

    // Use socket if connected; fall through to HTTP REST if not
    const socketConnected = socket?.current?.connected;
    if (socketConnected) {
      sendMessage(content);
      setSending(false);
      return;
    }

    // Socket offline — use REST fallback so message is never silently lost
    try {
      const { data } = await api.post('/messages', { content });
      setMessages((prev) => [...prev, data]);
    } catch {
      setInput(content); // restore input on failure
    } finally {
      setSending(false);
    }
  };

  const handleTypingInput = (e) => {
    setInput(e.target.value);
    if (adminInfo) sendTyping(adminInfo._id, true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (adminInfo) sendTyping(adminInfo._id, false);
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-left">
          {/* ChatMe brand logo */}
          <div className="user-brand">
            <span className="user-brand-icon">💬</span>
            <span className="user-brand-name">Chat<b>Me</b></span>
          </div>

          <div className="header-divider" />

          {/* Admin avatar + name — clickable */}
          <button className="header-profile-btn" onClick={openAdminProfile} title="View admin profile">
            {adminInfo ? (
              <div className="avatar-ring">
                <img src={safeAvatar(adminInfo.avatar)} alt={adminInfo.displayName} className="avatar" />
              </div>
            ) : (
              <div className="avatar-placeholder">👑</div>
            )}
            <div>
              <div className="chat-name">
                Chat with {adminInfo?.displayName || adminInfo?.username || 'ms584'}
              </div>
              <div className="chat-status online">● Connected</div>
            </div>
          </button>
        </div>
        <div className="chat-header-right">
          <button className="user-profile-chip" onClick={openOwnProfile} title="View your profile">
            <img src={safeAvatar(user.avatar)} alt={user.displayName} className="avatar-sm" />
            <div className="user-profile-info">
              <div className="user-profile-name">{user.displayName || user.username}</div>
              <div className="user-profile-handle">@{user.username}</div>
            </div>
          </button>
          <button className="logout-btn" onClick={logout} title="Logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* Profile Modal */}
      {modalProfile && (
        <ProfileModal
          profile={modalProfile}
          isOwnProfile={modalIsOwn}
          onClose={() => setModalProfile(null)}
        />
      )}

      {/* Messages */}
      <main className="chat-body">
        {loading ? (
          <div className="chat-loading"><div className="spinner" /></div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-visual">
              <div className="chat-empty-avatars">
                <div className="empty-avatar-admin">
                  {adminInfo ? <img src={safeAvatar(adminInfo.avatar)} alt="admin" /> : <span>👑</span>}
                </div>
                <div className="empty-avatar-pulse" />
                <div className="empty-avatar-user">
                  <img src={safeAvatar(user.avatar)} alt="you" />
                </div>
              </div>
            </div>
            <h3 className="chat-empty-title">Start the conversation</h3>
            <p className="chat-empty-sub">Say hello to {adminInfo?.displayName || 'ms584'}!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId?._id === user._id || msg.senderId === user._id;
            const senderAvatar = isMine ? user.avatar : (msg.senderId?.avatar || adminInfo?.avatar);
            const senderName = isMine ? 'You' : (msg.senderId?.displayName || msg.senderId?.username || 'Admin');
            return (
              <div key={msg._id} className={`message-row ${isMine ? 'mine' : 'theirs'}`}>
                <img src={safeAvatar(senderAvatar)} alt={senderName} className="msg-avatar" />
                <div className="bubble-col">
                  <span className="msg-sender-name">{senderName}</span>
                  <div className={`bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'}`}>
                    <p>{msg.content}</p>
                    <span className="msg-time">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {adminTyping && (
          <div className="message-row theirs">
            <img src={adminInfo?.avatar} alt="Admin" className="msg-avatar" />
            <div className="bubble-col">
              <span className="msg-sender-name">{adminInfo?.displayName || 'Admin'}</span>
              <div className="bubble bubble-theirs typing-indicator"><span /><span /><span /></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Blocked banner + Input */}
      {isBlocked ? (
        <div className="blocked-banner user-blocked-banner">
          🚫 Your account has been <strong>blocked</strong> by the admin — you cannot send messages.
        </div>
      ) : (
        <footer className="chat-footer">
          <textarea
            id="msg-input"
            className="msg-input"
            placeholder="Type a message…"
            value={input}
            onChange={handleTypingInput}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={2000}
            disabled={sending}
          />
          <button
            id="send-btn"
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim() || sending}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </footer>
      )}
    </div>
  );
};

export default ChatPage;
