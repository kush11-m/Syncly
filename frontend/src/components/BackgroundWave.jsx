import { useRef, useEffect } from "react";

export default function BackgroundWave({ opacity = 0.6 }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particles = [];
        let time = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        const initParticles = () => {
            particles = [];
            const numParticlesX = Math.floor(canvas.width / 30);
            const numParticlesY = Math.floor(canvas.height / 30);

            for (let i = 0; i < numParticlesX; i++) {
                for (let j = 0; j < numParticlesY; j++) {
                    particles.push({
                        x: i * 30 + 15,
                        y: j * 30 + 15,
                        originX: i * 30 + 15,
                        originY: j * 30 + 15,
                        color: 'rgba(255, 255, 255, 0.5)',
                        size: 1,
                    });
                }
            }
        };

        const animate = () => {
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            time += 0.005;

            particles.forEach((p) => {
                const wave1 = Math.sin(p.x * 0.01 + time) * 20;
                const wave2 = Math.cos(p.y * 0.01 + time * 1.5) * 20;
                const wave3 = Math.sin((p.x + p.y) * 0.005 + time * 0.5) * 30;

                const currentY = p.originY + wave1 + wave2 + wave3;
                const waveHeight = wave1 + wave2 + wave3;
                const normalizedHeight = (waveHeight + 70) / 140;

                const size = p.size + normalizedHeight * 1.5;

                ctx.beginPath();
                ctx.arc(p.x, currentY, Math.max(0.1, size), 0, Math.PI * 2);

                const r = 255;
                const g = Math.floor(100 + normalizedHeight * 100);
                const b = Math.floor(normalizedHeight * 100);
                const alpha = 0.1 + normalizedHeight * 0.5;

                if (Math.random() > 0.999) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random()})`;
                } else {
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                }

                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resize);
        resize();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <>
            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-0 pointer-events-none"
                style={{ opacity }}
            />
            {/* Vignette overlay */}
            <div className="absolute inset-0 z-0 bg-radial-gradient from-transparent via-background/60 to-background pointer-events-none" />
        </>
    );
}
