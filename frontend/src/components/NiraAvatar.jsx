import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float, MeshDistortMaterial, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';

// --- Custom Digital AI Entity ---
const DigitalEntity = ({ isSpeaking, isListening, isThinking }) => {
    const headRef = useRef();
    const mouthRef = useRef();
    const leftEyeRef = useRef();
    const rightEyeRef = useRef();

    // Status-based colors
    const primaryColor = isListening ? '#10b981' : isSpeaking ? '#8b5cf6' : isThinking ? '#6366f1' : '#6366f1';
    const emissiveInt = isSpeaking ? 1.5 : isListening ? 2 : 0.8;

    useFrame((state) => {
        const time = state.clock.getElapsedTime();

        // 1. Subtle Head Sway
        if (headRef.current) {
            headRef.current.rotation.y = Math.sin(time * 0.5) * 0.1;
            headRef.current.rotation.x = Math.cos(time * 0.3) * 0.05;
        }

        // 2. Blinking Logic
        const blink = (Math.sin(time * 0.5) > 0.98 || (time % 4 < 0.1)) ? 0 : 1;
        if (leftEyeRef.current) leftEyeRef.current.scale.y = THREE.MathUtils.lerp(leftEyeRef.current.scale.y, blink, 0.2);
        if (rightEyeRef.current) rightEyeRef.current.scale.y = THREE.MathUtils.lerp(rightEyeRef.current.scale.y, blink, 0.2);

        // 3. Lip Sync (Mouth Morphs)
        if (mouthRef.current) {
            const mouthScale = isSpeaking ? (0.2 + Math.abs(Math.sin(time * 20)) * 1.5) : 0.1;
            mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, mouthScale, 0.3);
            mouthRef.current.scale.x = isSpeaking ? (1 + Math.sin(time * 10) * 0.2) : 1;
        }
    });

    return (
        <group position={[0, 0, 0]}>
            {/* Inner Core Nucleus */}
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.4, 32, 32]} />
                <meshStandardMaterial color={primaryColor} emissive={primaryColor} emissiveIntensity={5} />
            </mesh>

            <mesh ref={headRef} position={[0, 0, 0]}>
                <sphereGeometry args={[1, 64, 64]} />
                <MeshDistortMaterial
                    color={primaryColor}
                    envMapIntensity={1}
                    clearcoat={1}
                    clearcoatRoughness={0}
                    metalness={0.9}
                    roughness={0.1}
                    distort={isSpeaking ? 0.4 : 0.2}
                    speed={isSpeaking ? 5 : 2}
                />
            </mesh>

            {/* Thinking Ring */}
            {isThinking && (
                <Float speed={5} rotationIntensity={2} floatIntensity={1}>
                    <mesh rotation={[Math.PI / 2, 0.2, 0]}>
                        <torusGeometry args={[1.3, 0.02, 16, 100]} />
                        <meshStandardMaterial color={primaryColor} emissive={primaryColor} emissiveIntensity={2} />
                    </mesh>
                </Float>
            )}

            <mesh ref={leftEyeRef} position={[-0.35, 0.2, 0.85]}>
                <sphereGeometry args={[0.08, 32, 32]} />
                <meshStandardMaterial color="white" emissive={primaryColor} emissiveIntensity={emissiveInt} />
            </mesh>
            <mesh ref={rightEyeRef} position={[0.35, 0.2, 0.85]}>
                <sphereGeometry args={[0.08, 32, 32]} />
                <meshStandardMaterial color="white" emissive={primaryColor} emissiveIntensity={emissiveInt} />
            </mesh>
            <mesh ref={mouthRef} position={[0, -0.4, 0.9]}>
                <capsuleGeometry args={[0.03, 0.3, 4, 16]} />
                <meshStandardMaterial color="white" emissive={primaryColor} emissiveIntensity={emissiveInt * 2} />
            </mesh>

            {/* Body base */}
            <mesh position={[0, -1.8, -0.2]}>
                <cylinderGeometry args={[0.4, 0.8, 2, 32]} />
                <meshStandardMaterial color="#0a0a0f" transparent opacity={0.6} roughness={0} metalness={1} />
            </mesh>

            <Float speed={2} rotationIntensity={1} floatIntensity={1}>
                <group position={[0, 0, -1]}>
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[1.5, 0.01, 16, 100]} />
                        <meshStandardMaterial color={primaryColor} emissive={primaryColor} emissiveIntensity={0.5} transparent opacity={0.3} />
                    </mesh>
                    {/* Pulsating Field Particles could be added here */}
                </group>
            </Float>
        </group>
    );
};

// --- Camera Setup ---
const Rig = () => {
    const { camera, mouse, size } = useThree();
    const isMobile = size.width < 768;
    useFrame(() => {
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouse.x * 0.1, 0.05);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, (isMobile ? mouse.y * 0.05 : mouse.y * 0.1), 0.05);
        const aspect = size.width / size.height;
        camera.fov = aspect < 1 ? 48 : 35; // Increased FOV for mobile to make avatar smaller
        camera.updateProjectionMatrix();
        camera.lookAt(0, isMobile ? 0.4 : 0.2, 0); // Looking higher for mobile
    });
    return null;
};


// --- 2. Chibi Anime Entity (Refined Ultra Cute) ---
const ChibiEntity = ({ isSpeaking, isListening, mood, statusColor }) => {
    const headRef = useRef();
    const eyesRef = useRef();
    const mouthRef = useRef();

    const { mouse } = useThree();

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (headRef.current) {
            headRef.current.position.y = Math.sin(time * 1.5) * 0.02;
            // Smoothly look towards mouse
            headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, mouse.x * 0.3, 0.1);
            headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -mouse.y * 0.2, 0.1);
        }
        if (eyesRef.current) {
            const blink = (Math.sin(time * 0.4) > 0.98 || (time % 5 < 0.1)) ? 0.1 : 1.1;
            eyesRef.current.scale.y = THREE.MathUtils.lerp(eyesRef.current.scale.y, blink, 0.2);
            // Pupils move slightly with mouse too
            eyesRef.current.children.forEach(eye => {
                const pupils = eye.children[0];
                if (pupils) {
                    pupils.position.x = mouse.x * 0.05;
                    pupils.position.y = mouse.y * 0.05;
                }
            });
        }
        if (mouthRef.current) {
            const scale = isSpeaking ? (0.5 + Math.abs(Math.sin(time * 15)) * 1.5) : 0.5;
            mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, scale, 0.3);
        }
    });

    return (
        <group>
            {/* DIGITAL ACCESSORIES: Floating Ears */}
            <group position={[0, 0.8, 0]}>
                <mesh position={[-0.6, 0.2, -0.2]} rotation={[0, 0, 0.4]}>
                    <coneGeometry args={[0.2, 0.5, 3]} />
                    <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={2} transparent opacity={0.8} />
                </mesh>
                <mesh position={[0.6, 0.2, -0.2]} rotation={[0, 0, -0.4]}>
                    <coneGeometry args={[0.2, 0.5, 3]} />
                    <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={2} transparent opacity={0.8} />
                </mesh>
            </group>

            {/* AI Core Nucleus for Chibi */}
            <mesh position={[0, -0.1, 0.8]} scale={0.05}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshBasicMaterial color={statusColor} />
            </mesh>

            <mesh ref={headRef}>
                {/* Face Background */}
                <mesh scale={[1.1, 1, 1.05]}>
                    <sphereGeometry args={[1, 64, 64]} />
                    <meshStandardMaterial color="#ffb6c1" roughness={0.3} metalness={0.1} />
                </mesh>

                {/* Swapped Color: Light Glossy Eyes with Black Pupils */}
                <group ref={eyesRef} position={[0, 0.2, 0.85]}>
                    {[-0.4, 0.4].map((x, i) => (
                        <group key={i} position={[x, 0, 0]}>
                            <mesh>
                                <sphereGeometry args={[0.25, 32, 32]} />
                                <meshPhongMaterial color="#fff5f5" emissive="#ffffff" emissiveIntensity={0.3} shininess={100} />
                            </mesh>

                            {/* SMALL BLACK PUPILS */}
                            <mesh position={[0, 0, 0.22]}>
                                <sphereGeometry args={[0.08, 16, 16]} />
                                <meshBasicMaterial color="#000000" />
                            </mesh>

                            {/* Specular Highlight */}
                            <mesh position={[0.08, 0.08, 0.25]}>
                                <sphereGeometry args={[0.04, 16, 16]} />
                                <meshBasicMaterial color="white" />
                            </mesh>
                        </group>
                    ))}
                </group>

                {/* Enhanced Cute/Heart Mouth */}
                <group ref={mouthRef} position={[0, -0.3, 0.95]}>
                    <mesh rotation={[0, 0, Math.PI / 4]}>
                        <capsuleGeometry args={[0.02, 0.1, 4, 16]} />
                        <meshBasicMaterial color="#ff4d6d" />
                    </mesh>
                    {/* Small blush under mouth when speaking */}
                    {isSpeaking && (
                        <mesh position={[0, -0.05, -0.05]}>
                            <sphereGeometry args={[0.05, 16, 16]} />
                            <meshBasicMaterial color="#ff69b4" transparent opacity={0.4} />
                        </mesh>
                    )}
                </group>

                {/* Permanent Subtle Blush */}
                <group position={[0, -0.1, 0.88]}>
                    <mesh position={[-0.55, 0, 0]}>
                        <planeGeometry args={[0.25, 0.12]} />
                        <meshBasicMaterial color="#ff69b4" transparent opacity={0.3} />
                    </mesh>
                    <mesh position={[0.55, 0, 0]}>
                        <planeGeometry args={[0.25, 0.12]} />
                        <meshBasicMaterial color="#ff69b4" transparent opacity={0.3} />
                    </mesh>
                </group>
            </mesh>

            {/* Soft AI Glow */}
            <mesh scale={1.15}>
                <sphereGeometry args={[1, 32, 32]} />
                <meshBasicMaterial color={statusColor} transparent opacity={0.1} side={THREE.BackSide} />
            </mesh>
        </group>
    );
};

// --- Main Avatar Component ---
const NiraAvatar = ({ isSpeaking = false, isListening = false, isThinking = false, isFullScreen = false, immersionMode = false, persona = 'nira', avatarType = 'digital', mood = 'NEUTRAL' }) => {
    const statusColor = isListening ? '#10b981' : isSpeaking ? '#8b5cf6' : '#6366f1';
    const isMobile = window.innerWidth < 768;

    return (
        <div style={{
            width: '100%', height: isFullScreen ? '100vh' : '400px',
            position: isFullScreen ? 'fixed' : 'relative',
            background: avatarType === 'chibi' ? 'radial-gradient(circle at center, #2e1a2e, #0a1a14, #000000)' : 'radial-gradient(circle at center, #0f0c29, #0a0a25, #000000)',
            transition: 'all 1s'
        }}>
            <Canvas shadows camera={{ position: [0, 0.2, isMobile ? 3.5 : 2.8], fov: isMobile ? 40 : 35 }} gl={{ antialias: true }}>
                <color attach="background" args={['#010103']} />
                <fog attach="fog" args={['#010103', 5, 10]} />
                <ambientLight intensity={0.4} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
                <pointLight position={[-2, 2, 2]} intensity={1} color={statusColor} />
                <Suspense fallback={null}>
                    <group position={[0, isMobile ? 0.35 : -0.2, 0]} scale={isMobile ? 0.6 : 1.1}>
                        {avatarType === 'chibi' ? (
                            <ChibiEntity isSpeaking={isSpeaking} isListening={isListening} mood={mood} statusColor={statusColor} />
                        ) : (
                            <DigitalEntity isSpeaking={isSpeaking} isListening={isListening} isThinking={isThinking} statusColor={statusColor} />
                        )}
                    </group>
                    <Environment preset="night" />
                    <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2} far={1} />
                </Suspense>
                <Rig />
                {!isFullScreen && <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />}
            </Canvas>

            {!immersionMode && (
                <div style={{
                    position: 'absolute',
                    bottom: isMobile ? '130px' : '40px', // Higher on mobile to avoid mic overlap
                    left: '50%',
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                    pointerEvents: 'none'
                }}>
                    <div style={{
                        width: isMobile ? '80px' : '100px', // Slightly smaller on mobile
                        height: isMobile ? '80px' : '100px',
                        borderRadius: '50%', border: `2px solid ${statusColor}`,
                        boxShadow: `0 0 30px ${statusColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: isSpeaking || isListening ? 'pulse 2s infinite' : 'none'
                    }}>
                        <span style={{ color: 'white', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>
                            {isListening ? 'Alive' : isThinking ? 'Thinking' : 'NYRA'}
                        </span>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.05); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.8; }
                }
            `}</style>
        </div>
    );
};

export default NiraAvatar;
