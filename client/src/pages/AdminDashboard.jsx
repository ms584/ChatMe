import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import ProfileModal from '../components/ProfileModal';
import api from '../api/axios';
import { safeAvatar } from '../utils/safeAvatar';

/* ───────────────── Block History Modal ───────────────── */
const BlockHistoryModal = ({ onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/conversations/block-history')
      .then(({ data }) => setLogs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (iso) => new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card block-history-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="broadcast-header" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 16 }}>
          <span className="broadcast-icon">📋</span>
          <div>
            <h2 className="modal-name">Block History</h2>
            <p className="modal-handle">Audit log of all block / unblock actions</p>
          </div>
        </div>

        <div className="block-history-list">
          {loading ? (
            <div className="chat-loading" style={{ padding: 40 }}><div className="spinner" /></div>
          ) : logs.length === 0 ? (
            <div className="block-history-empty">
              <span style={{ fontSize: 32 }}>🎉</span>
              <p>No block actions yet</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log._id} className="block-history-item">
                <img
                  src={safeAvatar(log.userId?.avatar)}
                  alt={log.userId?.displayName}
                  className="bh-avatar"
                />
                <div className="bh-info">
                  <div className="bh-name">
                    {log.userId?.displayName || log.userId?.username}
                    <span className={`bh-badge ${log.action}`}>
                      {log.action === 'blocked' ? '🚫 Blocked' : '✅ Unblocked'}
                    </span>
                  </div>
                  <div className="bh-meta">
                    by {log.adminId?.displayName || log.adminId?.username} · {fmt(log.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* ───────────────── Broadcast Modal ───────────────── */
const BroadcastModal = ({ onClose, onSent }) => {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      const { data } = await api.post('/messages/broadcast', { content: content.trim() });
      setResult(data.message);
      onSent?.();
    } catch (err) {
      setResult(err.response?.data?.error || 'Broadcast failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card broadcast-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="broadcast-header">
          <span className="broadcast-icon">📢</span>
          <div>
            <h2 className="modal-name">Broadcast Message</h2>
            <p className="modal-handle">Send to all users simultaneously</p>
          </div>
        </div>
        {result ? (
          <div className="broadcast-result">
            <span className="broadcast-result-icon">✅</span>
            <p>{result}</p>
            <button className="send-btn-full" onClick={onClose}>Done</button>
          </div>
        ) : (
          <div className="broadcast-body">
            <textarea
              className="broadcast-textarea"
              placeholder="Type your broadcast message…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              rows={4}
              autoFocus
            />
            <div className="broadcast-footer">
              <span className="char-count">{content.length}/2000</span>
              <button
                className="send-btn-full"
                onClick={handleSend}
                disabled={!content.trim() || sending}
              >
                {sending ? 'Sending…' : '📢 Send to All'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ───────────────── Admin Dashboard ───────────────── */
const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const token = localStorage.getItem('chatme_token');

  const [conversations, setConversations] = useState([]);
  const [filteredConvs, setFilteredConvs] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const [modalProfile, setModalProfile] = useState(null);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showBlockHistory, setShowBlockHistory] = useState(false);
  const [blockingUser, setBlockingUser] = useState(false);
  const [clearingConv, setClearingConv] = useState(false);
  const messagesEndRef = useRef(null);

  // ── Socket handlers ─────────────────────────────────────────────────────────
  const handleNewMessage = useCallback((msg) => {
    const senderId = msg.senderId?._id || msg.senderId;
    const receiverId = msg.receiverId?._id || msg.receiverId;
    const otherUserId = senderId === user._id ? receiverId : senderId;

    if (selectedUser && otherUserId === selectedUser._id) {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    }
    setConversations((prev) =>
      prev.map((c) =>
        c.userId?._id === otherUserId
          ? { ...c, lastMessage: msg.content, lastMessageAt: msg.createdAt }
          : c
      )
    );
  }, [selectedUser, user._id]);

  const handleTyping = useCallback(({ senderId, isTyping }) => {
    setTypingUsers((prev) => {
      const next = new Set(prev);
      isTyping ? next.add(senderId) : next.delete(senderId);
      return next;
    });
  }, []);

  const handleMessageDeleted = useCallback(({ messageId }) => {
    setMessages((prev) => prev.filter((m) => m._id !== messageId));
  }, []);

  const handleConversationCleared = useCallback(({ userId }) => {
    setMessages((prev) => prev.length > 0 && (prev[0]?.senderId?._id === userId || prev[0]?.receiverId?._id === userId) ? [] : prev);
    setConversations((prev) => prev.map((c) => c.userId?._id === userId ? { ...c, lastMessage: '', lastMessageAt: null } : c));
  }, []);

  const { sendMessage, sendTyping, socket } = useSocket(token, handleNewMessage, handleTyping);

  // Socket listeners
  useEffect(() => {
    const s = socket?.current;
    if (!s) return;
    s.on('message_deleted', handleMessageDeleted);
    s.on('conversation_cleared', handleConversationCleared);
    return () => {
      s.off('message_deleted', handleMessageDeleted);
      s.off('conversation_cleared', handleConversationCleared);
    };
  }, [socket, handleMessageDeleted, handleConversationCleared]);

  // ── Load conversations ───────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/conversations');
      setConversations(data);
      setFilteredConvs(data);
    } catch {}
    finally { setLoadingConvs(false); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Search filter
  useEffect(() => {
    if (!search.trim()) { setFilteredConvs(conversations); return; }
    const q = search.toLowerCase();
    setFilteredConvs(conversations.filter((c) => {
      const u = c.userId;
      return (
        u?.displayName?.toLowerCase().includes(q) ||
        u?.username?.toLowerCase().includes(q) ||
        u?.email?.toLowerCase().includes(q)
      );
    }));
  }, [search, conversations]);

  // ── Load messages ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedUser) return;
    setLoadingMsgs(true);
    setMessages([]);
    api.get(`/messages/${selectedUser._id}`)
      .then(({ data }) => setMessages(data))
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [selectedUser]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending || !selectedUser) return;
    setSending(true);
    setInput('');

    // Prefer socket; fall back to REST if socket is offline
    const socketConnected = socket?.current?.connected;
    if (socketConnected) {
      sendMessage(content, selectedUser._id);
      setSending(false);
      return;
    }

    try {
      const { data } = await api.post('/messages', { content, receiverId: selectedUser._id });
      setMessages((prev) => [...prev, data]);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Send failed:', err);
      setInput(content);
    } finally { setSending(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Delete message ───────────────────────────────────────────────────────────
  const handleDelete = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.delete(`/messages/${messageId}`);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  // ── Block / Unblock user ─────────────────────────────────────────────────────
  const handleBlockToggle = async () => {
    if (!selectedUser || blockingUser) return;
    const isBlocked = selectedUser.isBlocked;
    if (!window.confirm(`${isBlocked ? 'Unblock' : 'Block'} ${selectedUser.displayName}?`)) return;
    setBlockingUser(true);
    try {
      const { data } = await api.patch(`/conversations/${selectedUser._id}/block`);
      // Update selectedUser and conversations list
      const updated = { ...selectedUser, isBlocked: data.isBlocked };
      setSelectedUser(updated);
      setConversations((prev) => prev.map((c) =>
        c.userId?._id === selectedUser._id ? { ...c, userId: updated } : c
      ));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update block status');
    } finally { setBlockingUser(false); }
  };

  // ── Clear conversation ───────────────────────────────────────────────────────
  const handleClearConversation = async () => {
    if (!selectedUser || clearingConv) return;
    if (!window.confirm(`Clear ALL messages with ${selectedUser.displayName}? This cannot be undone.`)) return;
    setClearingConv(true);
    try {
      await api.delete(`/conversations/${selectedUser._id}`);
      setMessages([]);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to clear conversation');
    } finally { setClearingConv(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="admin-layout">
      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="brand-icon">💬</span>
            {sidebarOpen && <span>Chat<b>Me</b></span>}
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        {/* Admin info */}
        <div className="sidebar-admin-info" onClick={() => setModalProfile(user)} title="Your profile">
          <img src={safeAvatar(user.avatar)} alt={user.displayName} className="avatar-sm" />
          {sidebarOpen && (
            <div>
              <div className="sidebar-admin-name">{user.displayName}</div>
              <div className="sidebar-admin-role">Admin</div>
            </div>
          )}
        </div>

        {/* Broadcast button */}
        {sidebarOpen && (
          <button className="broadcast-btn" onClick={() => setShowBroadcast(true)}>
            <span>📢</span> Broadcast
          </button>
        )}
        {sidebarOpen && (
          <button className="broadcast-btn block-history-btn" onClick={() => setShowBlockHistory(true)}>
            <span>📋</span> Block History
          </button>
        )}

        {/* Search */}
        {sidebarOpen && (
          <div className="sidebar-search-wrap">
            <span className="sidebar-search-icon">🔍</span>
            <input
              className="sidebar-search"
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="sidebar-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
        )}

        <div className="sidebar-section-label">{sidebarOpen && `CONVERSATIONS (${filteredConvs.length})`}</div>

        <div className="sidebar-list">
          {loadingConvs ? (
            <div className="sidebar-loading"><div className="spinner-sm" /></div>
          ) : filteredConvs.length === 0 ? (
            sidebarOpen && (
              <div className="sidebar-empty">
                {search ? 'No results found' : 'No conversations yet'}
              </div>
            )
          ) : (
            filteredConvs.map((conv) => (
              <button
                key={conv._id}
                id={`conv-${conv.userId?._id}`}
                className={`sidebar-item ${selectedUser?._id === conv.userId?._id ? 'active' : ''} ${conv.userId?.isBlocked ? 'blocked' : ''}`}
                onClick={() => setSelectedUser(conv.userId)}
                title={conv.userId?.displayName}
              >
                <div className="sidebar-avatar-wrap">
                  <img
                    src={safeAvatar(conv.userId?.avatar) || '/default-avatar.png'}
                    alt={conv.userId?.displayName}
                    className={`avatar-sm ${conv.userId?.isBlocked ? 'avatar-blocked' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setModalProfile(conv.userId); }}
                    title="View profile"
                  />
                  {typingUsers.has(conv.userId?._id) && <span className="typing-dot" />}
                  {conv.userId?.isBlocked && <span className="blocked-dot" title="Blocked">🚫</span>}
                </div>
                {sidebarOpen && (
                  <div className="sidebar-item-info">
                    <div className="sidebar-item-name">
                      {conv.userId?.displayName || conv.userId?.username}
                      {conv.userId?.isBlocked && <span className="blocked-tag">Blocked</span>}
                    </div>
                    <div className="sidebar-item-preview">{conv.lastMessage || 'No messages yet'}</div>
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        <button className="logout-btn sidebar-logout" onClick={logout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          {sidebarOpen && 'Logout'}
        </button>
      </aside>

      {/* ── Main ── */}
      <main className="admin-main">
        {!selectedUser ? (
          <div className="admin-placeholder">
            <div className="placeholder-icon">👈</div>
            <h2>Select a conversation</h2>
            <p>Choose a user from the sidebar to start chatting.</p>
            {conversations.length > 0 && (
              <p className="placeholder-count">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="chat-header">
              <div className="chat-header-left">
                <div className="avatar-ring" onClick={() => setModalProfile(selectedUser)} style={{cursor:'pointer'}} title="View profile">
                  <img src={safeAvatar(selectedUser.avatar)} alt={selectedUser.displayName} className="avatar" />
                </div>
                <div>
                  <div className="chat-name">{selectedUser.displayName || selectedUser.username}</div>
                  <div className="chat-status">
                    {typingUsers.has(selectedUser._id)
                      ? <span className="typing-text">typing…</span>
                      : <span className="user-detail">@{selectedUser.username}</span>
                    }
                  </div>
                </div>
              </div>
              <div className="user-pills">
                <span className="pill">@{selectedUser.username}</span>
                {selectedUser.email && <span className="pill">{selectedUser.email}</span>}
                <button
                  className={`pill ${selectedUser.isBlocked ? 'pill-unblock' : 'pill-danger'}`}
                  onClick={handleBlockToggle}
                  disabled={blockingUser}
                  title={selectedUser.isBlocked ? 'Unblock user' : 'Block user'}
                >
                  {blockingUser ? '…' : selectedUser.isBlocked ? '✅ Unblock' : '🚫 Block'}
                </button>
                <button
                  className="pill pill-clear"
                  onClick={handleClearConversation}
                  disabled={clearingConv}
                  title="Clear all messages"
                >
                  {clearingConv ? '…' : '🗑️ Clear Chat'}
                </button>
                <button
                  className="pill pill-broadcast"
                  onClick={() => setShowBroadcast(true)}
                  title="Broadcast to all"
                >
                  📢 Broadcast
                </button>
              </div>
            </header>

            {/* Messages */}
            <div className="chat-body">
              {loadingMsgs ? (
                <div className="chat-loading"><div className="spinner" /></div>
              ) : messages.length === 0 ? (
                <div className="chat-empty">
                  <div className="chat-empty-icon">💬</div>
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = (msg.senderId?._id || msg.senderId) === user._id;
                  return (
                    <div
                      key={msg._id}
                      className={`message-row ${isMine ? 'mine' : 'theirs'}`}
                      onMouseEnter={() => setHoveredMsg(msg._id)}
                      onMouseLeave={() => setHoveredMsg(null)}
                    >
                      {!isMine && (
                        <img src={safeAvatar(selectedUser.avatar)} alt={selectedUser.displayName} className="msg-avatar" />
                      )}
                      <div className="bubble-col">
                        <span className="msg-sender-name">{isMine ? 'You' : (selectedUser.displayName || selectedUser.username)}</span>
                        <div className={`bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'}`}>
                          <p>{msg.content}</p>
                          <span className="msg-time">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      {/* Delete button on hover */}
                      {hoveredMsg === msg._id && (
                        <button
                          className="msg-delete-btn"
                          onClick={() => handleDelete(msg._id)}
                          title="Delete message"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  );
                })
              )}
              {typingUsers.has(selectedUser._id) && (
                <div className="message-row theirs">
                  <img src={safeAvatar(selectedUser.avatar)} alt={selectedUser.displayName} className="msg-avatar" />
                  <div className="bubble bubble-theirs typing-indicator"><span /><span /><span /></div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Blocked warning */}
            {selectedUser.isBlocked && (
              <div className="blocked-banner">
                🚫 <strong>{selectedUser.displayName}</strong> is blocked — they cannot send messages.
                <button className="blocked-banner-btn" onClick={handleBlockToggle}>Unblock</button>
              </div>
            )}

            {/* Input */}
            <footer className="chat-footer">
              <textarea
                id="admin-msg-input"
                className="msg-input"
                placeholder={`Reply to ${selectedUser.displayName}…`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={2000}
                disabled={sending}
              />
              <button
                id="admin-send-btn"
                className="send-btn"
                onClick={handleSend}
                disabled={!input.trim() || sending}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </footer>
          </>
        )}
      </main>

      {/* Profile Modal */}
      {modalProfile && (
        <ProfileModal
          profile={modalProfile}
          isOwnProfile={modalProfile._id === user._id}
          isAdminView={modalProfile._id !== user._id}
          onClose={() => setModalProfile(null)}
        />
      )}

      {/* Broadcast Modal */}
      {showBroadcast && (
        <BroadcastModal
          onClose={() => setShowBroadcast(false)}
          onSent={loadConversations}
        />
      )}

      {showBlockHistory && (
        <BlockHistoryModal onClose={() => setShowBlockHistory(false)} />
      )}
    </div>
  );
};

export default AdminDashboard;
