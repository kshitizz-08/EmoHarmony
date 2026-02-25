import { useState, useEffect, useRef } from "react";

/**
 * useCountUp
 * Counts from 0 to `end` over `duration` ms once the ref element is in view.
 * Returns [displayValue, ref] — attach `ref` to the DOM node you want observed.
 */
const useCountUp = (end, duration = 1600, suffix = "") => {
    const [value, setValue] = useState(0);
    const ref = useRef(null);
    const started = useRef(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started.current) {
                    started.current = true;
                    const startTime = performance.now();
                    const endNum = parseFloat(end);

                    const tick = (now) => {
                        const elapsed = now - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        // ease-out cubic
                        const eased = 1 - Math.pow(1 - progress, 3);
                        setValue(Number.isInteger(endNum)
                            ? Math.round(eased * endNum)
                            : (eased * endNum).toFixed(1)
                        );
                        if (progress < 1) requestAnimationFrame(tick);
                    };
                    requestAnimationFrame(tick);
                }
            },
            { threshold: 0.3 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [end, duration]);

    return [suffix ? `${value}${suffix}` : `${value}`, ref];
};

export default useCountUp;
