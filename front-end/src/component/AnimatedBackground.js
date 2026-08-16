import React, { useRef, useEffect } from 'react';
import bgImage from '../Images/backgroundimage.png';

/**
 * Ultra Sci-Fi AI Background — WebGL 2-Pass Renderer
 * Pass 1: Wave image with fluid distortion
 * Pass 2: Layered sci-fi overlays (neural grid, particle field, holographic scanlines, energy pulses)
 */
const AnimatedBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    if (!gl) return;

    let animationId;
    let startTime = Date.now();
    let texture = null;
    let imageLoaded = false;
    let mouseX = 0.5, mouseY = 0.5;

    // Track mouse for parallax interactivity
    const handleMouse = (e) => {
      mouseX = e.clientX / window.innerWidth;
      mouseY = e.clientY / window.innerHeight;
    };
    window.addEventListener('mousemove', handleMouse);

    // --- VERTEX SHADER ---
    const vertSrc = `
      attribute vec2 a_pos;
      varying vec2 vUv;
      void main() {
        gl_Position = vec4(a_pos, 0.0, 1.0);
        vUv = a_pos * 0.5 + 0.5;
      }
    `;

    // --- FRAGMENT SHADER: ULTRA SCI-FI AI ---
    const fragSrc = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D u_tex;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform vec2 u_res;

      #define PI 3.14159265
      #define TAU 6.28318530

      // --- NOISE FUNCTIONS ---
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float hash21(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                   mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p = rot * p * 2.0;
          a *= 0.5;
        }
        return v;
      }

      // --- NEURAL NETWORK GRID ---
      float neuralGrid(vec2 uv, float t) {
        vec2 grid = fract(uv * 18.0) - 0.5;
        vec2 id = floor(uv * 18.0);
        
        // Nodes: glowing dots at grid intersections
        float dist = length(grid);
        float node = smoothstep(0.08, 0.03, dist);
        
        // Pulse each node at different phase
        float phase = hash21(id) * TAU;
        node *= 0.5 + 0.5 * sin(t * 1.5 + phase);
        
        // Connection lines between nearby nodes
        float lineX = smoothstep(0.025, 0.005, abs(grid.y)) * step(0.3, hash21(id + 100.0));
        float lineY = smoothstep(0.025, 0.005, abs(grid.x)) * step(0.3, hash21(id + 200.0));
        float lines = (lineX + lineY) * 0.3;
        
        // Traveling data pulses along connections
        float pulseX = smoothstep(0.06, 0.0, abs(grid.y)) * 
                       pow(max(0.0, sin(uv.x * 60.0 - t * 4.0 + hash21(id) * TAU)), 16.0);
        float pulseY = smoothstep(0.06, 0.0, abs(grid.x)) * 
                       pow(max(0.0, sin(uv.y * 60.0 + t * 3.5 + hash21(id + 50.0) * TAU)), 16.0);
        
        return node * 0.8 + lines + (pulseX + pulseY) * 0.7;
      }

      // --- FLOATING PARTICLES ---
      float particles(vec2 uv, float t) {
        float v = 0.0;
        for (int i = 0; i < 30; i++) {
          float fi = float(i);
          vec2 pos = vec2(
            hash(vec2(fi, 0.0)) + sin(t * 0.2 + fi * 0.7) * 0.15,
            hash(vec2(0.0, fi)) + cos(t * 0.15 + fi * 0.5) * 0.2
          );
          pos = fract(pos + t * vec2(0.01, 0.015) * (0.5 + hash(vec2(fi, fi + 1.0))));
          float d = length(uv - pos);
          float brightness = hash(vec2(fi + 10.0, fi + 20.0));
          float twinkle = 0.6 + 0.4 * sin(t * (1.5 + brightness * 2.0) + fi);
          float size = 0.002 + 0.003 * brightness;
          v += smoothstep(size, 0.0, d) * twinkle * (0.4 + brightness * 0.6);
        }
        return v;
      }

      // --- HOLOGRAPHIC SCAN LINES ---
      float scanlines(vec2 uv, float t) {
        // Horizontal sweep
        float scan1 = smoothstep(0.015, 0.0, abs(uv.y - fract(t * 0.08))) * 0.35;
        float scan2 = smoothstep(0.008, 0.0, abs(uv.y - fract(t * 0.12 + 0.5))) * 0.20;
        // Micro scanlines for CRT feel
        float micro = sin(uv.y * u_res.y * 1.2) * 0.02 + 0.02;
        return scan1 + scan2 + micro;
      }

      // --- ENERGY PULSE RINGS ---
      float energyPulse(vec2 uv, float t) {
        vec2 center = vec2(0.5 + (u_mouse.x - 0.5) * 0.15, 0.5 + (u_mouse.y - 0.5) * 0.15);
        float d = length(uv - center);
        float v = 0.0;
        // 3 concentric expanding rings
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          float radius = fract(t * 0.12 + fi * 0.33) * 1.2;
          float fade = 1.0 - fract(t * 0.12 + fi * 0.33);
          float ring = smoothstep(0.015, 0.0, abs(d - radius)) * fade * fade;
          v += ring * 0.4;
        }
        return v;
      }

      // --- HEX GRID PATTERN ---
      float hexGrid(vec2 uv, float t) {
        vec2 r = vec2(1.0, 1.732);
        vec2 h = r * 0.5;
        vec2 a = mod(uv * 12.0, r) - h;
        vec2 b = mod(uv * 12.0 - h, r) - h;
        vec2 gv = length(a) < length(b) ? a : b;
        float d = length(gv);
        float edge = smoothstep(0.42, 0.40, d) - smoothstep(0.40, 0.38, d);
        float pulse = 0.3 + 0.2 * sin(t * 0.8 + length(floor(uv * 12.0)) * 0.5);
        return edge * pulse * 0.25;
      }

      // --- DATA STREAM RAIN ---
      float dataRain(vec2 uv, float t) {
        float v = 0.0;
        for (int i = 0; i < 12; i++) {
          float fi = float(i);
          float x = hash(vec2(fi * 7.3, 0.0));
          float speed = 0.15 + hash(vec2(fi, 3.0)) * 0.25;
          float y = fract(-t * speed + hash(vec2(fi, 1.0)));
          float bright = hash(vec2(fi, 2.0));
          
          // Vertical streak
          float dx = abs(uv.x - x);
          float dy = uv.y - y;
          float streak = smoothstep(0.003, 0.0, dx) * 
                         smoothstep(0.0, 0.12, dy) * smoothstep(0.25, 0.0, dy);
          v += streak * (0.3 + bright * 0.5);
        }
        return v;
      }

      void main() {
        vec2 uv = vUv;
        float t = u_time;
        float aspect = u_res.x / u_res.y;

        // === PASS 1: WAVE IMAGE WITH FLUID DISTORTION ===
        float fbmVal = fbm(uv * 3.0 + t * 0.15);
        
        float w1 = sin(uv.x * 3.5 + t * 0.55) * cos(uv.y * 2.8 + t * 0.4) * 0.022;
        float w2 = sin(uv.y * 4.2 - t * 0.5) * cos(uv.x * 3.0 + t * 0.45) * 0.018;
        float w3 = sin(uv.x * 7.0 + uv.y * 5.0 + t * 1.1) * 0.009;
        float w4 = cos(uv.x * 5.5 - uv.y * 6.0 - t * 0.85) * 0.007;
        float n1 = (fbmVal - 0.5) * 0.025;

        vec2 distUv = uv + vec2(w1 + w3 + n1, w2 + w4 + n1 * 0.7);
        distUv = clamp(distUv, 0.005, 0.995);

        vec4 img = texture2D(u_tex, distUv);

        // Boost cyan channel for sci-fi feel
        img.rgb = pow(img.rgb, vec3(0.92));
        img.b = min(1.0, img.b * 1.15);
        img.g = min(1.0, img.g * 1.08);

        // Caustic energy on image
        float c1 = pow(abs(sin(uv.x * 14.0 + uv.y * 9.0 + t * 1.6)), 14.0) * 0.3;
        float c2 = pow(abs(cos(uv.x * 10.0 - uv.y * 12.0 - t * 1.2)), 16.0) * 0.2;
        img.rgb += vec3(0.0, 0.82, 1.0) * (c1 + c2);

        // === PASS 2: SCI-FI AI OVERLAYS ===
        vec3 cyan = vec3(0.0, 0.88, 1.0);
        vec3 deepBlue = vec3(0.1, 0.3, 0.9);
        vec3 white = vec3(0.85, 0.95, 1.0);

        // Neural network grid (subtle)
        float nn = neuralGrid(uv + vec2(t * 0.008, t * 0.005), t);
        img.rgb += mix(deepBlue, cyan, 0.6) * nn * 0.18;

        // Hex grid underlay
        float hx = hexGrid(uv + vec2(sin(t * 0.1) * 0.02, cos(t * 0.08) * 0.02), t);
        img.rgb += cyan * hx * 0.15;

        // Floating particles
        float pt = particles(uv, t);
        img.rgb += white * pt * 0.6;

        // Holographic scanlines
        float sc = scanlines(uv, t);
        img.rgb += cyan * sc * 0.15;

        // Energy pulse rings from center / mouse
        float ep = energyPulse(uv, t);
        img.rgb += cyan * ep;

        // Data rain streams
        float dr = dataRain(uv, t);
        img.rgb += mix(cyan, vec3(0.0, 1.0, 0.6), 0.3) * dr * 0.35;

        // === ATMOSPHERIC EFFECTS ===
        // Breathing brightness
        float pulse = 0.90 + 0.10 * sin(t * 0.35);
        img.rgb *= pulse;

        // Mouse-reactive spotlight
        vec2 mousePos = vec2(u_mouse.x, 1.0 - u_mouse.y);
        float mouseDist = length(uv - mousePos);
        float spotlight = smoothstep(0.6, 0.0, mouseDist) * 0.12;
        img.rgb += cyan * spotlight;

        // Vignette
        vec2 vig = uv * (1.0 - uv);
        float vigFactor = vig.x * vig.y * 20.0;
        vigFactor = clamp(pow(vigFactor, 0.3), 0.0, 1.0);
        img.rgb *= mix(0.25, 1.0, vigFactor);

        // Edge atmospheric haze
        img.rgb += vec3(0.0, 0.04, 0.10) * (1.0 - vigFactor) * 0.7;

        // Slight film grain for realism
        float grain = hash(uv * u_res + t * 100.0) * 0.03 - 0.015;
        img.rgb += grain;

        gl_FragColor = vec4(clamp(img.rgb, 0.0, 1.0), 1.0);
      }
    `;

    // --- COMPILE ---
    const mkShader = (src, type) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };

    const vs = mkShader(vertSrc, gl.VERTEX_SHADER);
    const fs = mkShader(fragSrc, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Link error:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Fullscreen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');
    const uRes = gl.getUniformLocation(prog, 'u_res');

    // Load texture
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      imageLoaded = true;
    };
    img.src = bgImage;

    // Resize
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    // Render loop
    const render = () => {
      if (!imageLoaded) { animationId = requestAnimationFrame(render); return; }
      const t = (Date.now() - startTime) / 1000.0;
      gl.clearColor(0.008, 0.02, 0.05, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uMouse, mouseX, mouseY);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
      if (texture) gl.deleteTexture(texture);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  );
};

export default AnimatedBackground;
