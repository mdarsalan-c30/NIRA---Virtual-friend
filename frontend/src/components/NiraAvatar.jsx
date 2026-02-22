import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

// --- Global Error Boundary for 3D Errors ---
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true };
    }
    componentDidCatch(error, errorInfo) {
        console.error("3D Render Error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) return this.props.fallback;
        return this.props.children;
    }
}

// --- Particle Sphere Component ---
const ParticleSphere = ({ isSpeaking, isThinking, isListening, glowColor }) => {
    const pointsRef = useRef();
    const count = 3000;

    const [positions, sizes] = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const sz = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 2 + Math.random() * 0.2;

            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);

            sz[i] = Math.random();
        }
        return [pos, sz];
    }, []);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (pointsRef.current) {
            // Base rotation
            pointsRef.current.rotation.y = time * 0.15;
            pointsRef.current.rotation.z = time * 0.1;

            // Reaction to status
            let speed = 0.5;
            let intensity = 1.0;

            if (isSpeaking) {
                speed = 2.0;
                intensity = 1.2 + Math.sin(time * 15) * 0.1;
            } else if (isListening) {
                speed = 1.0;
                intensity = 1.3;
            } else if (isThinking) {
                speed = 0.3;
                intensity = 1.1;
            }

            pointsRef.current.scale.setScalar(intensity * (1 + Math.sin(time * speed) * 0.03));
        }
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.035} // Slightly larger for better visibility
                color={glowColor}
                transparent
                opacity={0.9}
                blending={THREE.AdditiveBlending}
                sizeAttenuation
            />
        </points>
    );
};

// --- Main Avatar Component ---
const NiraAvatar = ({ isSpeaking = false, isListening = false, isThinking = false, isFullScreen = false, persona = 'nira' }) => {
    const isAli = persona === 'ali';
    const baseColor = isAli ? '#0ea5e9' : '#8b5cf6'; // Blue for Ali, Purple for Nira
    const glowColor = isListening ? '#10b981' : isSpeaking ? baseColor : isThinking ? (isAli ? '#22d3ee' : '#c084fc') : (isAli ? '#0369a1' : '#6366f1');

    return (
        <div style={{
            width: '100%',
            height: isFullScreen ? '100vh' : '320px',
            position: isFullScreen ? 'fixed' : 'relative',
            top: 0, left: 0,
            overflow: 'hidden',
            background: isFullScreen ? '#020205' : 'transparent',
            zIndex: isFullScreen ? 0 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.5s ease',
        }}>
            <Canvas
                camera={{ position: [0, 0, 7], fov: 40 }}
                gl={{ antialias: true, alpha: true }}
                style={{ width: '100%', height: '100%' }}
            >
                {isFullScreen && <color attach="background" args={['#020205']} />}

                <Suspense fallback={null}>
                    <ErrorBoundary fallback={<mesh><sphereGeometry args={[2, 32, 32]} /><meshBasicMaterial wireframe color={glowColor} /></mesh>}>
                        <Float speed={2} rotationIntensity={1} floatIntensity={1}>
                            <ParticleSphere
                                isSpeaking={isSpeaking}
                                isThinking={isThinking}
                                isListening={isListening}
                                glowColor={glowColor}
                            />
                        </Float>
                        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                    </ErrorBoundary>
                </Suspense>

                {isFullScreen && <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />}
            </Canvas>

            {/* Status Label Overlay */}
            <div style={{
                position: 'absolute',
                bottom: isFullScreen ? '120px' : '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '10px 24px',
                borderRadius: '50px',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: `0 0 30px ${glowColor}33`,
                transition: 'all 0.4s',
            }}>
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: glowColor,
                    boxShadow: `0 0 10px ${glowColor}`,
                    animation: isListening || isSpeaking ? 'pulse-light 1s infinite' : 'none'
                }} />
                <span style={{
                    color: 'white',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                }}>
                    {isListening ? 'Listening' : isSpeaking ? 'Speaking' : isThinking ? 'Thinking' : 'Online'}
                </span>
            </div>

            <style>{`
                @keyframes pulse-light {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.3); opacity: 0.5; }
                }
            `}</style>
        </div>
    );
};

export default NiraAvatar;
