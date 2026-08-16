import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const AIAssistantBubble = ({ sensitivity = 2.0, blobSize = 2.0, blobColor = '#00f0ff', isUserSpeaking = false, isJarvisSpeaking = false, isProcessing = false, isListening = false }) => {
    const containerRef = useRef(null);
    const audioAmplitudeRef = useRef(0);
    const currentScaleRef = useRef(blobSize);
    const sensitivityRef = useRef(sensitivity);
    const blobSizeRef = useRef(blobSize);

    // Draggable position state with localStorage persistence
    const [pos, setPos] = useState(() => {
        try {
            const saved = localStorage.getItem('jarvis_blob_pos');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                    return parsed;
                }
            }
        } catch (e) {}
        return {
            x: Math.max(10, Math.floor((window.innerWidth - 440) / 2)),
            y: Math.max(70, Math.floor((window.innerHeight - 440) / 2))
        };
    });

    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });

    const handleMouseDown = (e) => {
        if (e.button !== 0) return;
        setIsDragging(true);
        dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initX: pos.x,
            initY: pos.y
        };
    };

    const handleTouchStart = (e) => {
        if (!e.touches || e.touches.length === 0) return;
        const touch = e.touches[0];
        setIsDragging(true);
        dragStartRef.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            initX: pos.x,
            initY: pos.y
        };
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            const deltaX = e.clientX - dragStartRef.current.startX;
            const deltaY = e.clientY - dragStartRef.current.startY;
            const newX = Math.max(-100, Math.min(window.innerWidth - 340, dragStartRef.current.initX + deltaX));
            const newY = Math.max(40, Math.min(window.innerHeight - 340, dragStartRef.current.initY + deltaY));
            setPos({ x: newX, y: newY });
        };

        const handleTouchMove = (e) => {
            if (!e.touches || e.touches.length === 0) return;
            const touch = e.touches[0];
            const deltaX = touch.clientX - dragStartRef.current.startX;
            const deltaY = touch.clientY - dragStartRef.current.startY;
            const newX = Math.max(-100, Math.min(window.innerWidth - 340, dragStartRef.current.initX + deltaX));
            const newY = Math.max(40, Math.min(window.innerHeight - 340, dragStartRef.current.initY + deltaY));
            setPos({ x: newX, y: newY });
        };

        const handleEnd = () => setIsDragging(false);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleEnd);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging]);

    useEffect(() => {
        try {
            localStorage.setItem('jarvis_blob_pos', JSON.stringify(pos));
        } catch (e) {}
    }, [pos]);

    const isUserSpeakingRef = useRef(isUserSpeaking);
    const isJarvisSpeakingRef = useRef(isJarvisSpeaking);
    const isProcessingRef = useRef(isProcessing);
    const isListeningRef = useRef(isListening);

    const coreMatRef = useRef(null);
    const shellMatRef = useRef(null);

    useEffect(() => {
        isUserSpeakingRef.current = isUserSpeaking;
    }, [isUserSpeaking]);

    useEffect(() => {
        isJarvisSpeakingRef.current = isJarvisSpeaking;
    }, [isJarvisSpeaking]);

    useEffect(() => {
        isProcessingRef.current = isProcessing;
    }, [isProcessing]);

    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);

    // Keep sensitivityRef updated
    useEffect(() => {
        sensitivityRef.current = sensitivity;
    }, [sensitivity]);

    // Keep blobSizeRef updated for real-time smooth size scaling
    useEffect(() => {
        blobSizeRef.current = blobSize;
    }, [blobSize]);

    // Dynamic Color Update Effect
    useEffect(() => {
        if (coreMatRef.current && shellMatRef.current) {
            const primary = new THREE.Color(blobColor);
            const deep = primary.clone().multiplyScalar(0.12);
            const mid = primary.clone().multiplyScalar(0.5);

            coreMatRef.current.uniforms.uColorCyan.value.copy(primary);
            coreMatRef.current.uniforms.uColorBright.value.copy(primary);
            coreMatRef.current.uniforms.uColorMid.value.copy(mid);
            coreMatRef.current.uniforms.uColorDeep.value.copy(deep);

            shellMatRef.current.uniforms.uColor.value.copy(primary);
        }
    }, [blobColor]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // --- 1. THREE.JS SCENE SETUP (TRANSPARENT CANVAS) ---
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            60,
            container.clientWidth / container.clientHeight,
            0.1,
            100
        );
        camera.position.set(0, 0, 4.8);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0); // 100% Transparent WebGL Canvas
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.95;
        container.appendChild(renderer.domElement);

        // --- ORBIT CONTROLS (MOVE OPTION DISABLED) ---
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enablePan = false;
        controls.minDistance = 2.0;
        controls.maxDistance = 12.0;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.8;

        const mainGroup = new THREE.Group();
        mainGroup.scale.setScalar(blobSize);
        scene.add(mainGroup);

        // --- 2. GLSL SHADER NOISE CHUNK ---
        const noiseChunk = `
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
            vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

            float snoise(vec3 v) {
                const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                vec3 i = floor(v + dot(v, C.yyy));
                vec3 x0 = v - i + dot(i, C.xxx);
                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min(g.xyz, l.zxy);
                vec3 i2 = max(g.xyz, l.zxy);
                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;
                i = mod289(i);
                vec4 p = permute(permute(permute(
                            i.z + vec4(0.0, i1.z, i2.z, 1.0))
                        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                float n_ = 0.142857142857;
                vec3 ns = n_ * D.wyz - D.xzx;
                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_);
                vec4 x = x_ * ns.x + ns.yyyy;
                vec4 y = y_ * ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);
                vec4 b0 = vec4(x.xy, y.xy);
                vec4 b1 = vec4(x.zw, y.zw);
                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                vec3 p0 = vec3(a0.xy, h.x);
                vec3 p1 = vec3(a0.zw, h.y);
                vec3 p2 = vec3(a1.xy, h.z);
                vec3 p3 = vec3(a1.zw, h.w);
                vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
                p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
                vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m;
                return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
            }

            float fbm(vec3 p) {
                float total = 0.0;
                float amp = 0.5;
                float freq = 1.0;
                for (int i = 0; i < 4; i++) {
                    total += snoise(p * freq) * amp;
                    amp *= 0.5;
                    freq *= 2.0;
                }
                return total;
            }
        `;

        // --- 3. DYNAMIC VOICE-REACTING CORE BLOB ---
        const initialPrimary = new THREE.Color(blobColor);
        const initialDeep = initialPrimary.clone().multiplyScalar(0.12);
        const initialMid = initialPrimary.clone().multiplyScalar(0.5);

        // GPU Optimized Icosahedron detail (24 subdivision levels for 60FPS smoothness)
        const coreGeo = new THREE.IcosahedronGeometry(0.85, 24);
        const coreMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uAudioAmplitude: { value: 0 },
                uColorDeep: { value: initialDeep },
                uColorMid: { value: initialMid },
                uColorBright: { value: initialPrimary },
                uColorCyan: { value: initialPrimary }
            },
            vertexShader: `
                uniform float uTime;
                uniform float uAudioAmplitude;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying float vDisplacement;

                ${noiseChunk}

                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vec3 pos = position;

                    float noise = fbm(pos * 2.4 + vec3(0.0, uTime * 0.28, 0.0));
                    float displacement = noise * (0.08 + uAudioAmplitude * 0.45);
                    vDisplacement = displacement;

                    pos += normal * displacement;

                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    vPosition = mvPosition.xyz;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uAudioAmplitude;
                uniform vec3 uColorDeep;
                uniform vec3 uColorMid;
                uniform vec3 uColorBright;
                uniform vec3 uColorCyan;

                varying vec3 vNormal;
                varying vec3 vPosition;
                varying float vDisplacement;

                void main() {
                    vec3 viewDir = normalize(-vPosition);
                    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.2);

                    vec3 baseColor = mix(uColorDeep, uColorMid, smoothstep(-0.2, 0.25, vDisplacement));
                    baseColor = mix(baseColor, uColorBright, smoothstep(0.08, 0.35, vDisplacement));

                    vec3 speechColor = mix(uColorBright, uColorCyan, sin(uTime * 1.8 + vDisplacement * 3.0) * 0.5 + 0.5);
                    vec3 finalColor = mix(baseColor, speechColor, uAudioAmplitude * 0.75);

                    float fresnelGlow = fresnel * (0.45 + uAudioAmplitude * 0.5);
                    finalColor += uColorCyan * fresnelGlow * 0.75;

                    float alpha = 0.92 + fresnel * 0.08;
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.NormalBlending,
            depthWrite: true
        });
        coreMatRef.current = coreMat;
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        mainGroup.add(coreMesh);

        // --- 4. HOLOGRAPHIC GLASS SHELL ---
        const shellGeo = new THREE.IcosahedronGeometry(0.98, 12);
        const shellMat = new THREE.ShaderMaterial({
            uniforms: {
                uAudioAmplitude: { value: 0 },
                uColor: { value: initialPrimary.clone() }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vViewPosition = -mvPosition.xyz;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                uniform vec3 uColor;
                uniform float uAudioAmplitude;

                void main() {
                    float fresnel = pow(1.0 - dot(normalize(vNormal), normalize(vViewPosition)), 3.0);
                    float alpha = fresnel * (0.20 + uAudioAmplitude * 0.25);
                    vec3 glowColor = mix(uColor, vec3(1.0), uAudioAmplitude * 0.35);
                    gl_FragColor = vec4(glowColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        shellMatRef.current = shellMat;
        const shellMesh = new THREE.Mesh(shellGeo, shellMat);
        mainGroup.add(shellMesh);

        // --- 5. RENDER & ANIMATION LOOP ---
        const clock = new THREE.Clock();
        let animationFrameId;

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const time = clock.getElapsedTime();
            const amp = audioAmplitudeRef.current;

            // Controlled Scale Interpolation driven by user blobSize setting
            const baseSize = blobSizeRef.current;
            const targetScale = baseSize + amp * (baseSize * 0.28);
            currentScaleRef.current = THREE.MathUtils.lerp(currentScaleRef.current, targetScale, 0.08);
            mainGroup.scale.setScalar(currentScaleRef.current);

            coreMat.uniforms.uTime.value = time;
            coreMat.uniforms.uAudioAmplitude.value = amp;
            shellMat.uniforms.uAudioAmplitude.value = amp;

            // Rotate faster when user is speaking
            const rotSpeed = isUserSpeakingRef.current ? 0.45 : isProcessingRef.current ? 0.35 : 0.12;
            mainGroup.rotation.y = time * rotSpeed;
            mainGroup.rotation.x = Math.sin(time * 0.12) * 0.08;

            controls.update();
            renderer.render(scene, camera);
        };

        animate();

        const handleResize = () => {
            if (!container) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            if (container && renderer.domElement && container.contains(renderer.domElement)) {
                try {
                    container.removeChild(renderer.domElement);
                } catch (e) {}
            }
            try {
                renderer.dispose();
            } catch (e) {}
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- STATE-DRIVEN HIGH REACTIVITY VOICE PULSE ANIMATION ENGINE ---
    useEffect(() => {
        let animationFrameId;
        const clock = new THREE.Clock();

        const updatePulseData = () => {
            const time = clock.getElapsedTime();

            let targetAmp = 0.25;

            if (isUserSpeakingRef.current) {
                // High dynamic plasma pulse when user is actively speaking into mic
                targetAmp = 0.82 + (Math.sin(time * 14.0) * 0.18 + Math.cos(time * 9.0) * 0.12);
            } else if (isJarvisSpeakingRef.current) {
                // Bright neural electric frequency pulse when JARVIS is speaking back
                targetAmp = 0.70 + (Math.sin(time * 10.0) * 0.20 + Math.sin(time * 5.0) * 0.10);
            } else if (isProcessingRef.current) {
                // Energetic rhythmic spin when LLM is thinking/processing
                targetAmp = 0.55 + Math.sin(time * 6.0) * 0.20;
            } else if (isListeningRef.current) {
                // Gentle listening breathing pulse
                targetAmp = 0.30 + Math.sin(time * 3.0) * 0.12;
            } else {
                targetAmp = 0.18 + Math.sin(time * 1.5) * 0.06;
            }

            audioAmplitudeRef.current = THREE.MathUtils.lerp(
                audioAmplitudeRef.current,
                Math.min(targetAmp, 1.0),
                0.22
            );

            animationFrameId = requestAnimationFrame(updatePulseData);
        };

        updatePulseData();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            style={{
                position: 'fixed',
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: '440px',
                height: '440px',
                pointerEvents: 'auto',
                zIndex: isDragging ? 90 : 42,
                userSelect: 'none',
                cursor: isDragging ? 'grabbing' : 'grab',
                background: 'transparent',
                backgroundColor: 'transparent',
                border: 'none',
                boxShadow: 'none',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none'
            }}
            title="Click and drag anywhere on the JARVIS Sphere to move it"
        >
            {/* 3D Fixed-Ratio Sphere Viewport (100% Transparent, Never changes scale or aspect ratio on drag) */}
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    background: 'transparent',
                    backgroundColor: 'transparent',
                    pointerEvents: 'none'
                }}
            />
        </div>
    );
};

export default AIAssistantBubble;
