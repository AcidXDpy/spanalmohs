"use client";

import { motion } from "framer-motion";
import { useMotionPreference as useReducedMotion } from "@/components/analytics/use-motion-preference";

export default function Template({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0.7 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
    >
      {children}
    </motion.div>
  );
}
