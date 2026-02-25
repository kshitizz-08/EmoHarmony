import React, { useRef, useEffect } from "react";

/**
 * NeuralNetworkCanvas
 * Animated canvas: floating nodes connected by lines when close — brain network visual.
 * Fully transparent overlay; place it as absolute inside a relative container.
 */
const NODE_COUNT = 55;
const MAX_DIST = 160;
const NODE_SPEED = 0.35;

function randomNode(w, h) {
    return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * NODE_SPEED,
        vy: (Math.random() - 0.5) * NODE_SPEED,
        r: Math.random() * 2 + 1.5,
    };
}

const NeuralNetworkCanvas = ({ className = "" }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        let animId;
        let nodes = [];

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            nodes = Array.from({ length: NODE_COUNT }, () =>
                randomNode(canvas.width, canvas.height)
            );
        };

        const draw = () => {
            const { width: W, height: H } = canvas;
            ctx.clearRect(0, 0, W, H);

            // Update positions
            for (const n of nodes) {
                n.x += n.vx;
                n.y += n.vy;
                if (n.x < 0 || n.x > W) n.vx *= -1;
                if (n.y < 0 || n.y > H) n.vy *= -1;
            }

            // Draw edges
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < MAX_DIST) {
                        const alpha = (1 - dist / MAX_DIST) * 0.35;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.strokeStyle = `rgba(6,182,212,${alpha})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            }

            // Draw nodes
            for (const n of nodes) {
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(14,165,233,0.65)";
                ctx.fill();
                // soft glow ring
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r + 2, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(6,182,212,0.18)";
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            animId = requestAnimationFrame(draw);
        };

        resize();
        draw();
        window.addEventListener("resize", resize);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        />
    );
};

export default NeuralNetworkCanvas;
