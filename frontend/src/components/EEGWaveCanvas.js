import React, { useEffect, useRef } from "react";

/**
 * EEGWaveCanvas
 * Continuously scrolling multi-channel EEG sine-wave rendered on canvas.
 * Looks like a real hospital EEG monitor readout.
 */

const CHANNELS = [
    { freq: 1.2, amp: 18, phase: 0.0, color: "rgba(6,182,212,0.90)" },  // Delta-ish
    { freq: 2.1, amp: 12, phase: 1.1, color: "rgba(16,185,129,0.80)" },  // Theta-ish
    { freq: 3.4, amp: 9, phase: 2.3, color: "rgba(14,165,233,0.70)" },  // Alpha-ish
    { freq: 5.8, amp: 6, phase: 0.7, color: "rgba(99,102,241,0.65)" },  // Beta-ish
];

const EEGWaveCanvas = ({ height = 110, className = "" }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let animId;
        let t = 0;

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = height;
        };

        const draw = () => {
            const W = canvas.width;
            const H = canvas.height;
            ctx.clearRect(0, 0, W, H);

            // Grid lines (subtle)
            ctx.strokeStyle = "rgba(6,182,212,0.07)";
            ctx.lineWidth = 1;
            for (let x = 0; x < W; x += 40) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
            }
            for (let y = 0; y < H; y += 22) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
            }

            CHANNELS.forEach((ch, ci) => {
                const baseY = H / 2 + (ci - (CHANNELS.length - 1) / 2) * (H / (CHANNELS.length + 1));
                ctx.beginPath();
                for (let px = 0; px <= W; px += 2) {
                    const xNorm = px / W;
                    // composite wave = primary + harmonic noise
                    const y =
                        baseY
                        - Math.sin(xNorm * Math.PI * 2 * ch.freq * 3 + t + ch.phase) * ch.amp
                        - Math.sin(xNorm * Math.PI * 2 * ch.freq * 6 + t * 1.3) * (ch.amp * 0.35)
                        - Math.sin(xNorm * Math.PI * 2 * ch.freq * 11 + t * 0.7) * (ch.amp * 0.15);

                    px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
                }

                // Glow stroke
                ctx.shadowColor = ch.color;
                ctx.shadowBlur = 6;
                ctx.strokeStyle = ch.color;
                ctx.lineWidth = 1.6;
                ctx.stroke();
                ctx.shadowBlur = 0;
            });

            t += 0.025;
            animId = requestAnimationFrame(draw);
        };

        resize();
        draw();
        window.addEventListener("resize", resize);
        return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
    }, [height]);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{ width: "100%", height: `${height}px`, display: "block" }}
        />
    );
};

export default EEGWaveCanvas;
