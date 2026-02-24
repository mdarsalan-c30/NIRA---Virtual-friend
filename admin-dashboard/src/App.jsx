import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { LayoutDashboard, Users, Activity, Settings, LogOut, ShieldAlert } from 'lucide-react';

const AdminDashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalUsers: 0, activeToday: 0, apiCalls: 0 });
    const [recentUsers, setRecentUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!user) return;

        // Fetch Stats
        const usersQuery = query(collection(db, 'users'), orderBy('lastActive', 'desc'), limit(5));
        const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
            setRecentUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setStats(prev => ({ ...prev, totalUsers: snapshot.size }));
        });

        return unsubscribe;
    }, [user]);

    if (loading) return <div style={centerStyle}>Loading...</div>;

    if (!user) return <Login />;

    return (
        <div style={containerStyle}>
            {/* Sidebar */}
            <div style={sidebarStyle}>
                <div style={logoStyle}>NIRA Admin</div>
                <nav>
                    <NavItem icon={<LayoutDashboard size={20} />} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                    <NavItem icon={<Users size={20} />} label="Users" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
                    <NavItem icon={<Activity size={20} />} label="System" active={activeTab === 'system'} onClick={() => setActiveTab('system')} />
                    <NavItem icon={<Settings size={20} />} label="Identity" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
                </nav>
                <button onClick={() => signOut(auth)} style={logoutStyle}><LogOut size={18} /> Logout</button>
            </div>

            {/* Main Content */}
            <div style={contentStyle}>
                <header style={headerStyle}>
                    <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
                    <div style={userBadge}>{user.email} (Super Admin)</div>
                </header>

                {activeTab === 'overview' && (
                    <div style={gridStyle}>
                        <StatCard label="Total Friends" value={stats.totalUsers} color="#6366f1" />
                        <StatCard label="Active Interactions" value="1.2k" color="#10b981" />
                        <StatCard label="API Latency" value="452ms" color="#f59e0b" />

                        <div style={tableCardStyle}>
                            <h3>Recent Users</h3>
                            <div style={tableStyle}>
                                {recentUsers.map(u => (
                                    <div key={u.id} style={userRowStyle}>
                                        <span>{u.name || 'Anonymous'}</span>
                                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>{u.email || u.id.substring(0, 8)}</span>
                                        <span style={statusBadge}>{u.totalInteractions || 0} chats</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div style={cardStyle}>
                        <h3>AI Personality Control</h3>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Modify NIRA's core identity globally.</p>
                        <textarea
                            style={textareaStyle}
                            defaultValue="You are NIRA, an emotionally intelligent Indian AI companion..."
                        />
                        <button style={saveBtnStyle}>Update System Prompt</button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ... (Styles and Sub-components)
const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const handleLogin = async (e) => {
        e.preventDefault();
        try { await signInWithEmailAndPassword(auth, email, password); }
        catch (err) { alert(err.message); }
    };
    return (
        <div style={centerStyle}>
            <form onSubmit={handleLogin} style={loginCardStyle}>
                <h2 style={{ margin: '0 0 20px' }}>NIRA Admin Login</h2>
                <input placeholder="Admin Email" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} />
                <input type="password" placeholder="Passcode" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} />
                <button type="submit" style={loginBtnStyle}>Enter Dashboard</button>
            </form>
        </div>
    );
};

const NavItem = ({ icon, label, active, onClick }) => (
    <div onClick={onClick} style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px',
        cursor: 'pointer', transition: '0.2s',
        background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
        color: active ? '#818cf8' : 'rgba(255,255,255,0.6)',
        borderLeft: active ? '4px solid #6366f1' : '4px solid transparent'
    }}>
        {icon} <span>{label}</span>
    </div>
);

const StatCard = ({ label, value, color }) => (
    <div style={{ ...cardStyle, flex: 1, minWidth: '200px' }}>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>{label}</div>
        <div style={{ fontSize: '1.8rem', fontWeight: 700, color }}>{value}</div>
    </div>
);

// Styles
const containerStyle = { display: 'flex', height: '100vh', background: '#0a0a0c', color: 'white', fontFamily: 'Inter, sans-serif' };
const sidebarStyle = { width: '260px', background: '#111114', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' };
const logoStyle = { padding: '30px 20px', fontSize: '1.2rem', fontWeight: 800, color: '#6366f1', letterSpacing: '-0.5px' };
const contentStyle = { flex: 1, overflowY: 'auto', padding: '40px' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' };
const userBadge = { background: 'rgba(255,255,255,0.05)', padding: '6px 15px', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)' };
const gridStyle = { display: 'flex', flexWrap: 'wrap', gap: '20px' };
const cardStyle = { background: '#16161a', padding: '25px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' };
const tableCardStyle = { width: '100%', background: '#16161a', padding: '25px', borderRadius: '16px', marginTop: '20px' };
const tableStyle = { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' };
const userRowStyle = { display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' };
const statusBadge = { background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' };
const logoutStyle = { marginTop: 'auto', margin: '20px', padding: '12px', borderRadius: '10px', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };
const centerStyle = { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0c', color: 'white' };
const loginCardStyle = { background: '#16161a', padding: '40px', borderRadius: '24px', width: '380px', textAlign: 'center', border: '1px solid rgba(239,68,68,0.1)' };
const inputStyle = { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box' };
const loginBtnStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, cursor: 'pointer' };
const textareaStyle = { width: '100%', height: '120px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '15px', marginTop: '10px', fontFamily: 'inherit' };
const saveBtnStyle = { marginTop: '15px', padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#6366f1', color: 'white', cursor: 'pointer', fontWeight: 600 };

export default AdminDashboard;
