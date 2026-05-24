"use client";

import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-surface-dark via-[#0a1628] to-surface-dark">
      {/* Animated background beams */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-px"
            style={{
              background: i % 2 === 0
                ? "linear-gradient(90deg, transparent, #F6C90E40, transparent)"
                : "linear-gradient(90deg, transparent, #3B82F640, transparent)",
              width: "60%",
              top: `${15 + i * 14}%`,
              left: i % 2 === 0 ? "0%" : "40%",
            }}
            animate={{
              x: i % 2 === 0 ? ["0%", "100%"] : ["0%", "-100%"],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 4 + i * 0.8,
              repeat: Infinity,
              delay: i * 0.6,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-screen-xl mx-auto px-6 py-16 md:py-20">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Text content */}
          <div className="flex-1 text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-solar/10 border border-solar/20 text-solar text-xs font-medium mb-4">
                <span>☀️</span>
                <span>Interactive Solar Simulator</span>
              </div>
            </motion.div>

            <motion.h1
              className="font-display font-bold text-text-primary leading-tight mb-4"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Solar System —{" "}
              <span className="text-solar">Live Dekho,</span>
              <br />
              Live Samjho
            </motion.h1>

            <motion.p
              className="text-text-secondary text-base md:text-lg mb-8 max-w-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Appliance on karo, time change karo — solar system khud reaction dega.
              On-Grid, Off-Grid, aur Hybrid ka fark seedha samjho.
            </motion.p>

            <motion.a
              href="#simulator"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, boxShadow: "0 0 0 0 rgba(246,201,14,0.4)" }}
              whileHover={{
                boxShadow: "0 0 20px 4px rgba(246,201,14,0.3)",
              }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="inline-block bg-solar text-surface-dark font-semibold px-8 py-3 rounded-full text-sm hover:bg-solar/90 transition-colors"
            >
              Live Demo Dekho ↓
            </motion.a>
          </div>

          {/* Mini schematic visual */}
          <motion.div
            className="flex-1 max-w-sm"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="bg-surface-card rounded-2xl border border-surface-stroke p-6 space-y-4">
              {/* Mini visual of 3 modes */}
              {[
                { mode: "On-Grid", color: "#3B82F6", icon: "🔌", desc: "Sabse sasta, power cut mein band" },
                { mode: "Off-Grid", color: "#F97316", icon: "🏝️", desc: "Grid se azaad, battery zaroori" },
                { mode: "Hybrid", color: "#22C55E", icon: "⭐", desc: "Best of both — Mandawar ke liye" },
              ].map((item, i) => (
                <motion.div
                  key={item.mode}
                  className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{ borderColor: `${item.color}30`, backgroundColor: `${item.color}08` }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: item.color }}>
                      {item.mode}
                    </div>
                    <div className="text-xs text-text-muted">{item.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Key stats row */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {[
            { label: "Panel Capacity", value: "4.4 kWp", sub: "8 panels, Durasol" },
            { label: "Peak Solar", value: "4,180 W", sub: "12 PM clear day" },
            { label: "Battery", value: "5.12 kWh", sub: "LiFePO4, 4.38 kWh usable" },
            { label: "Location", value: "Bijnor, UP", sub: "26°N, 5.0 PSH/day" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-card/60 border border-surface-stroke rounded-xl p-4 text-center"
            >
              <div className="text-solar font-bold font-display text-lg">{stat.value}</div>
              <div className="text-text-primary text-xs font-medium mt-0.5">{stat.label}</div>
              <div className="text-text-muted text-[10px] mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
