"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { formatNumber } from "@/lib/utils";

interface HeroStatProps {
  value: number;
  label: string;
}

function AnimatedCounter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const duration = 1200; // ms
    const steps = 40;
    const stepTime = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      // Ease-out cubic for the counter
      const progress = current / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * value));

      if (current >= steps) {
        clearInterval(timer);
        setDisplayed(value);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [isInView, value]);

  return <span ref={ref}>{formatNumber(displayed)}</span>;
}

export function HeroStat({ value, label }: HeroStatProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.7,
        ease: [0.215, 0.61, 0.355, 1],
      }}
      className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 py-12"
    >
      <p className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
        <AnimatedCounter value={value} />
      </p>
      <p className="mt-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
        {label}
      </p>
    </motion.div>
  );
}
