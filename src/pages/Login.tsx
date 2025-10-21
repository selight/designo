import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { loginOrRegisterAndLoad } from "../lib/auth.ts";

interface Props {
    onLoggedIn: () => void;
}

const Login: React.FC<Props> = ({ onLoggedIn }) => {
    const [name, setName] = useState("");
    const bgRef = useRef<HTMLDivElement | null>(null);
    const initializedRef = useRef<boolean>(false);

    useEffect(() => {
        if (!bgRef.current) return;
        if (initializedRef.current) return;
        initializedRef.current = true;

        const container = bgRef.current;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.set(0, 0, 12);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        container.appendChild(renderer.domElement);
        renderer.domElement.style.display = "block";

        // Particles
        const particleCount = 1500;
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            positions[i3 + 0] = (Math.random() - 0.5) * 40;
            positions[i3 + 1] = (Math.random() - 0.5) * 24;
            positions[i3 + 2] = (Math.random() - 0.5) * 40;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ color: 0x7dd3fc, size: 0.06, sizeAttenuation: true, transparent: true, opacity: 0.8 });
        const points = new THREE.Points(geometry, material);
        scene.add(points);

        const resize = () => {
            const rect = container.getBoundingClientRect();
            const w = Math.max(1, Math.floor(rect.width || window.innerWidth));
            const h = Math.max(1, Math.floor(rect.height || window.innerHeight));
            renderer.setSize(w, h, true);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };
        const ro = new ResizeObserver(resize);
        ro.observe(container);
        window.addEventListener("resize", resize);
        resize();

        let running = true;
        const animate = () => {
            if (!running) return;
            points.rotation.y += 0.0009;
            points.rotation.x += 0.0004;
            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        };
        animate();

        return () => {
            running = false;
            ro.disconnect();
            window.removeEventListener("resize", resize);
            geometry.dispose();
            material.dispose();
            renderer.dispose();
            if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
            initializedRef.current = false;
        };
    }, []);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        try {
            const { userName, isNew } = await loginOrRegisterAndLoad(name.trim());
            alert(isNew ? `Welcome ${userName}!` : `Hello again ${userName}!`);
            onLoggedIn();
        } catch (err) {
            console.error(err);
        }
    };

    // No user creation on input; only on Continue

    return (
        <div className="grid place-items-center w-screen h-dvh bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
            <div ref={bgRef} className="absolute inset-0 z-0 pointer-events-none" />
            <form onSubmit={submit} className="flex flex-col gap-3 w-[min(90vw,360px)] bg-slate-900 p-6 rounded-xl shadow-2xl relative z-10">
                <h4 className="m-0 text-2xl font-semibold">SignIn</h4>
                <label className="text-sm opacity-85">Name</label>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alice"
                    className="px-3.5 py-3 rounded-lg border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                    type="submit"
                    disabled={!name.trim()}
                    className={`mt-2 px-4 py-3 rounded-lg border-none ${
                        name.trim() 
                            ? "bg-secondary text-white font-bold  hover:border-primary cursor-pointer transition-all" 
                            : "bg-secondary opacity-50 border-secondary text-white cursor-not-allowed"
                    }`}
                >
                    Continue
                </button>


            </form>
        </div>
    );
};

export default Login;


