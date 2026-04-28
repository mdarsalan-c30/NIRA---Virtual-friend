import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import logo from '../assets/logo.png';

const Auth = ({ onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                if (!name.trim()) throw new Error("Name is required");
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: name });
                
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    name: name,
                    email: email,
                    createdAt: serverTimestamp(),
                    lastActive: serverTimestamp(),
                    isPro: false,
                    usageMinutes: 0,
                    totalInteractions: 0
                });
            }
            onAuthSuccess();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div className="glass-panel" style={{ padding: '40px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                <img src={logo} alt="NYRA Logo" style={{ height: '60px', width: 'auto', marginBottom: '20px', objectFit: 'contain' }} />
                <h1 style={{ marginBottom: '24px', fontSize: '2rem', background: 'linear-gradient(to right, #8b5cf6, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {isLogin ? 'Welcome Back' : 'Join NYRA'}
                </h1>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {!isLogin && (
                        <input
                            type="text"
                            placeholder="Your Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                            required
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                        required
                    />
                    <button type="submit" className="glow-btn">
                        {isLogin ? 'Login' : 'Sign Up'}
                    </button>
                </form>

                {error && <p style={{ color: '#ef4444', marginTop: '16px', fontSize: '0.9rem' }}>{error}</p>}

                <p style={{ marginTop: '24px', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
                </p>

                <div style={{ marginTop: '32px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
                    Developed with ❤️ by <a href="https://mdarsalan.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Md Arsalan</a>
                </div>
            </div>
        </div>
    );
};

export default Auth;
