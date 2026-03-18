"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MotionSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function MotionSection({ children, className, delay = 0 }: MotionSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.215, 0.61, 0.355, 1],
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export function MotionStagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        visible: { transition: { staggerChildren: 0.1 } },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export function MotionItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.215, 0.61, 0.355, 1] },
        },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
