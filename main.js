/**
 * WebGL Portfolio Experience
 * Uses Three.js for a 3D robot that tracks mouse movement.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- CONFIGURATION ---
const CONFIG = {
    // Rotation limits (in radians)
    headRotationLimit: { x: 0.5, y: 0.8 }, // x: up/down, y: left/right
    smoothing: 0.1, // Lerp factor (lower = smoother/slower)
    breathingSpeed: 0.002,
    breathingAmplitude: 0.1, // Vertical float amount
    modelPath: 'assets/robot.glb', // Path to your GLB file
    // Debug: Set this to true to see a placeholder cube if no model is loaded
    usePlaceholder: true,
    showPlaceholderAlways: true // For now, use the cool wireframe placeholder
};

// --- STATE ---
const state = {
    mouse: new THREE.Vector2(),
    targetRotation: { x: 0, y: 0 },
    windowHalf: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    robot: null,
    head: null, // Reference to the head bone
    mixer: null,
    clock: new THREE.Clock()
};

// --- SCENE SETUP ---
const scene = new THREE.Scene();

// Camera setup - Positioned to frame model on the RIGHT side of viewport
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
// X offset positive = camera shifts left, model appears on RIGHT
// Y offset = vertical centering (slightly above center)
camera.position.set(-4.5, 0.5, 5);
camera.lookAt(0, 0, 0);

// Renderer setup
const canvasContainer = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true, // Transparent background
    powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
canvasContainer.appendChild(renderer.domElement);

// --- LIGHTING ---
// Cinematic lighting setup
function setupLighting() {
    // 1. Ambient Light (Fill) - Soft blue-ish for shadows
    const ambientLight = new THREE.AmbientLight(0x4040a0, 1.5);
    scene.add(ambientLight);

    // 2. Key Light (Main Directional) - Warm/White from top-right
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(5, 5, 5);
    scene.add(keyLight);

    // 3. Rim Light (Backlight) - Bright Cyan/Blue accent from behind/side
    const rimLight = new THREE.SpotLight(0x00f0ff, 5);
    rimLight.position.set(-2, 3, -4);
    rimLight.lookAt(0, 0, 0);
    scene.add(rimLight);

    // 4. Fill Light (Secondary) - Purple/Pink from bottom-left
    const fillLight = new THREE.PointLight(0xa000ff, 1.5);
    fillLight.position.set(-3, 0, 3);
    scene.add(fillLight);
}

setupLighting();

// --- THEME OBSERVER ---
// Watch for theme changes and update lighting accordingly
function updateLightingForTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    scene.traverse((child) => {
        if (child.isAmbientLight) {
            child.color.setHex(isDark ? 0x4040a0 : 0x8080c0);
            child.intensity = isDark ? 1.5 : 2.0;
        }
        if (child.isDirectionalLight) {
            child.intensity = isDark ? 2.5 : 3.5;
        }
        if (child.isSpotLight) {
            child.color.setHex(isDark ? 0x00f0ff : 0x0066cc);
            child.intensity = isDark ? 5 : 3;
        }
        if (child.isPointLight) {
            child.color.setHex(isDark ? 0xa000ff : 0x7c3aed);
        }
    });
}

// Initial lighting update
updateLightingForTheme();

// Observe theme changes
const themeObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
            updateLightingForTheme();
        }
    });
});

themeObserver.observe(document.documentElement, { attributes: true });

// --- MODEL LOADING ---
const loader = new GLTFLoader();
const loadingScreen = document.getElementById('loader');

function loadModel() {
    if (CONFIG.showPlaceholderAlways) {
        console.log('Using placeholder model (no robot.glb found). To use a real model, place robot.glb in assets/ and set showPlaceholderAlways to false.');
        createPlaceholder();
        hideLoader();
        return;
    }

    loader.load(
        CONFIG.modelPath,
        (gltf) => {
            console.log('Model loaded successfully');
            state.robot = gltf.scene;

            // Center the model
            const box = new THREE.Box3().setFromObject(state.robot);
            const center = box.getCenter(new THREE.Vector3());
            state.robot.position.sub(center); // Center at (0,0,0)

            // Adjust scale if needed (heuristic)
            // const size = box.getSize(new THREE.Vector3());
            // const maxDim = Math.max(size.x, size.y, size.z);
            // const scale = 2 / maxDim;
            // state.robot.scale.set(scale, scale, scale);

            // Find Head Bone for rotation
            // NOTE: You will need to inspect your specific GLB to find the correct bone name
            // Common names: 'Head', 'Neck', 'mixamorigHead', etc.
            state.head = state.robot.getObjectByName('Head') || state.robot.getObjectByName('mixamorigHead') || state.robot.getObjectByName('neck');

            if (!state.head) {
                console.warn('Head bone not found. Calculating rotation on entire model or upper body instead.');
                // Fallback: rotate the whole group or find a spine bone
                state.head = state.robot;
            }

            // Material cleanup (optional)
            state.robot.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    // Increase metalness/roughness for premium look if materials are basic
                    if (child.material) {
                        child.material.envMapIntensity = 1;
                    }
                }
            });

            scene.add(state.robot);
            hideLoader();
        },
        (xhr) => {
            // Progress
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
            console.error('An error happened loading the model:', error);
            if (CONFIG.usePlaceholder) {
                console.log('Using placeholder model instead. To use a real model, add robot.glb to the assets folder.');
                createPlaceholder();
                hideLoader();
            } else {
                console.error('Model loading failed and placeholder is disabled.');
            }
        }
    );
}

function createPlaceholder() {
    // Create a slick cyborg-like placeholder
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const material = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.2,
        metalness: 0.8,
        wireframe: true
    });

    // Inner core
    const coreGeom = new THREE.IcosahedronGeometry(0.5, 2);
    const coreMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        wireframe: true,
        transparent: true,
        opacity: 0.5
    });

    const group = new THREE.Group();
    const outer = new THREE.Mesh(geometry, material);
    const inner = new THREE.Mesh(coreGeom, coreMat);

    group.add(outer);
    group.add(inner);

    state.robot = group;
    state.head = group; // Rotate the whole thing
    scene.add(group);
}

function hideLoader() {
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 500);
}

// --- INPUT HANDLING ---
document.addEventListener('mousemove', onMouseMove, false);

function onMouseMove(event) {
    // Convert mouse pixels to normalized coordinates (-1 to +1)
    state.mouse.x = (event.clientX - state.windowHalf.x) / state.windowHalf.x;
    state.mouse.y = (event.clientY - state.windowHalf.y) / state.windowHalf.y;

    // Calculate target rotation based on mouse position
    // We invert Y so moving mouse up looks up
    state.targetRotation.x = state.mouse.y * CONFIG.headRotationLimit.x;
    state.targetRotation.y = state.mouse.x * CONFIG.headRotationLimit.y;
}

// --- RESIZE HANDLING ---
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    state.windowHalf.x = window.innerWidth / 2;
    state.windowHalf.y = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    // Responsive camera positioning
    // Desktop: offset camera left so model appears on right third
    // Tablet/Mobile: center the model (though it's hidden via CSS)
    if (window.innerWidth > 1024) {
        camera.position.set(-4.5, 0.5, 5);
    } else {
        camera.position.set(0, 0.5, 5);
    }
    camera.lookAt(0, 0, 0);
}

// --- ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);

    const delta = state.clock.getDelta();
    const time = state.clock.getElapsedTime();

    if (state.robot) {
        // 1. Idle Breathing Animation (Sine Wave)
        // Move slightly up and down
        state.robot.position.y = Math.sin(time * 2) * CONFIG.breathingAmplitude * 0.5; // reduced amp

        // Optional: Scale pulsing (subtle breathing chest)
        // const scale = 1 + Math.sin(time * 2) * 0.005;
        // state.robot.scale.set(scale, scale, scale);

        // 2. Smooth Look-At (Damping)
        if (state.head) {
            // Smoothly interpolate current rotation to target rotation
            // We use simple Euler rotation lerping here. For bones, usually standard rotation is enough.

            // X axis (Up/Down) - Note: Bone axes might differ! tweak as needed.
            // Often Head bone Y is twist, X is nod, Z is tilt. 
            // Let's assume standard object rotation for now: X is pitch, Y is yaw.

            // We'll use a helper object logic or raw rotation values
            const currentX = state.head.rotation.x;
            const currentY = state.head.rotation.y;

            const targetX = state.targetRotation.x;
            const targetY = state.targetRotation.y;

            // Lerp
            state.head.rotation.x += (targetX - currentX) * CONFIG.smoothing;
            state.head.rotation.y += (targetY - currentY) * CONFIG.smoothing;
        }

        // Rotate the inner core of placeholder if it exists
        if (CONFIG.usePlaceholder && state.robot.children[1]) {
            state.robot.children[1].rotation.x -= delta * 0.5;
            state.robot.children[1].rotation.y -= delta * 0.5;
        }
    }

    renderer.render(scene, camera);
}

// Start
loadModel();
animate();

// --- INSTRUCTIONS ---
console.log(`
%c WebGL Portfolio Setup Instructions
------------------------------------
1. Place your robot model file (GLB/GLTF) in 'assets/robot.glb'.
2. If your model's head bone is named differently than 'Head', update the 'line 80' in main.js.
3. Adjust lighting positions in 'setupLighting()' to match your model's mood.
`, "color: #00f0ff; font-size: 14px; font-weight: bold; background: #222; padding: 10px;");
