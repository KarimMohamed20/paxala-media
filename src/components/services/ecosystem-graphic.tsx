"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, Lock } from "lucide-react";
import { SX } from "./service-shared";
import { ECO_NODES } from "./ecosystem-data";

const N = ECO_NODES.length;
const R = 38;
const CX = 50;
const CY = 50;

function pos(i: number) {
  const a = ((-90 + i * (360 / N)) * Math.PI) / 180;
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
}

const EASE = [0.16, 1, 0.3, 1] as const;

function hexToRgb(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return "255,32,32";
  return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`;
}

interface EcosystemGraphicProps {
  packageColor?: string;
  includedServices?: readonly string[] | null; // undefined = no filter; null = all; string[] = specific keys
}

export function EcosystemGraphic({ packageColor, includedServices }: EcosystemGraphicProps) {
  const [active, setActive] = useState<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openNode = useCallback((i: number) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActive(i);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setActive(null), 80);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  // Close panel whenever the package selection changes
  useEffect(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActive(null);
  }, [includedServices]);

  const accentColor = packageColor ?? SX.accent;
  const rgb = hexToRgb(accentColor);

  const activeNode = active !== null ? ECO_NODES[active] : null;
  const nodePos = active !== null ? pos(active) : null;

  function isNodeIncluded(key: string): boolean {
    if (includedServices === undefined) return true; // no package selected
    if (includedServices === null) return true;      // infinite: all included
    return includedServices.includes(key);
  }

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-center lg:gap-0">

      {/* ── ECOSYSTEM CIRCLE ── */}
      <div className="relative mx-auto aspect-square w-full max-w-[480px] shrink-0 lg:mx-0 lg:max-w-[460px]">

        {/* Ambient haze */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(${rgb},0.15) 0%, transparent 70%)`,
            filter: "blur(70px)",
            transition: "background 0.6s, opacity 0.5s",
            opacity: active !== null ? 1 : 0.7,
          }}
        />

        {/* SVG */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" style={{ overflow: "visible" }}>
          <defs>
            <filter id="eco-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="eco-glow-sm" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Strong orb glow for the traveling light */}
            <filter id="eco-glow-orb" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Orbit rings */}
          {[38, 26, 14].map((r) => (
            <circle key={r} cx={CX} cy={CY} r={r} fill="none"
              stroke={`rgba(${rgb},0.09)`}
              strokeWidth={0.7} vectorEffect="non-scaling-stroke"
              style={{ transition: "stroke 0.15s" }}
            />
          ))}


          {/* Particles */}
          {ECO_NODES.map((node, i) => {
            const { x, y } = pos(i);
            const lit = active === i;
            const included = isNodeIncluded(node.key);
            return (
              <motion.circle key={`ptcl-${i}`}
                r={lit ? 1.5 : 0.75}
                fill={accentColor}
                style={{ opacity: 0 }}
                animate={{
                  cx: [CX, x], cy: [CY, y],
                  opacity: lit ? [0, 1, 0] : included ? [0, 0.32, 0] : [0, 0.08, 0],
                }}
                transition={{ duration: lit ? 1.0 : 3.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.21 }}
              />
            );
          })}

          {/* Traveling light orb — no lines, just layered glowing circles moving along the curve */}
          {active !== null && nodePos && (
            <g key={`flash-${active}`}>
              {/* Outer ambient haze */}
              <circle r={10} fill={accentColor} filter="url(#eco-glow-orb)" opacity={0}>
                <animate attributeName="opacity" values="0;0.18;0.18;0" dur="0.5s" fill="freeze" />
                <animateMotion dur="0.5s" fill="freeze"
                  path={`M ${nodePos.x} ${nodePos.y} Q 114 ${nodePos.y} 114 50`} />
              </circle>
              {/* Mid glow */}
              <circle r={5} fill={accentColor} filter="url(#eco-glow-orb)" opacity={0}>
                <animate attributeName="opacity" values="0;0.55;0.55;0" dur="0.5s" fill="freeze" />
                <animateMotion dur="0.5s" fill="freeze"
                  path={`M ${nodePos.x} ${nodePos.y} Q 114 ${nodePos.y} 114 50`} />
              </circle>
              {/* Bright core */}
              <circle r={2} fill="white" filter="url(#eco-glow)" opacity={0}>
                <animate attributeName="opacity" values="0;1;1;0" dur="0.5s" fill="freeze" />
                <animateMotion dur="0.5s" fill="freeze"
                  path={`M ${nodePos.x} ${nodePos.y} Q 114 ${nodePos.y} 114 50`} />
              </circle>
            </g>
          )}
        </svg>

        {/* PMP core */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <motion.div
            className="flex aspect-square w-28 flex-col items-center justify-center rounded-full border sm:w-32"
            style={{
              backgroundColor: SX.card,
              borderColor: active !== null ? accentColor : `rgba(${rgb},0.4)`,
              transition: "border-color 0.12s",
            }}
            animate={{
              boxShadow: active !== null
                ? [`0 0 50px -6px rgba(${rgb},0.7)`, `0 0 90px -4px rgba(${rgb},1)`, `0 0 50px -6px rgba(${rgb},0.7)`]
                : [`0 0 38px -8px rgba(${rgb},0.45)`, `0 0 65px -6px rgba(${rgb},0.7)`, `0 0 38px -8px rgba(${rgb},0.45)`],
            }}
            transition={{ duration: active !== null ? 1.4 : 2.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="flex items-center text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              PMP
              <span className="ml-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor, transition: "background-color 0.12s" }} />
            </span>
            <span className="mt-1 text-[9px] font-medium tracking-[0.3em] text-white/40">ECOSYSTEM</span>
          </motion.div>
        </div>

        {/* Service nodes */}
        {ECO_NODES.map((node, i) => {
          const { x, y } = pos(i);
          const isActive = active === i;
          const included = isNodeIncluded(node.key);
          const isExcluded = !included;
          const isDimByHover = active !== null && !isActive;
          const opacity = isExcluded ? 0.7 : isDimByHover ? 0.35 : 1;

          return (
            <div key={node.key} className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
              <motion.button
                type="button"
                onMouseEnter={() => openNode(i)}
                onMouseLeave={scheduleClose}
                onClick={() => (active === i ? setActive(null) : openNode(i))}
                className="group block focus:outline-none"
              >
                <motion.div
                  className="relative flex aspect-square w-11 items-center justify-center rounded-full border sm:w-12"
                  style={{
                    backgroundColor: isActive
                      ? `rgba(${rgb},0.15)`
                      : included && !isDimByHover
                      ? `rgba(${rgb},0.07)`
                      : "rgba(11,11,11,0.92)",
                    borderColor: isActive
                      ? accentColor
                      : included && !isDimByHover
                      ? `rgba(${rgb},0.28)`
                      : "rgba(255,255,255,0.09)",
                    transition: "background-color 0.12s, border-color 0.12s",
                  }}
                  animate={{
                    scale: isActive ? 1.22 : isDimByHover ? 0.87 : isExcluded ? 0.93 : 1,
                    boxShadow: isActive ? `0 0 28px -3px rgba(${rgb},0.85)` : "none",
                    opacity,
                  }}
                  transition={{ type: "tween", duration: 0.12, ease: "easeOut" }}
                >
                  <node.Icon
                    size={17}
                    style={{
                      color: isActive
                        ? accentColor
                        : isDimByHover
                        ? "rgba(255,255,255,0.18)"
                        : isExcluded
                        ? "rgba(255,255,255,0.45)"
                        : `rgba(${rgb},0.85)`,
                      transition: "color 0.12s",
                    }}
                  />
                  {/* Lock badge — shown on excluded nodes when a package is selected */}
                  {isExcluded && includedServices !== undefined && (
                    <div
                      className="absolute -top-1.5 flex items-center justify-center rounded-full"
                      style={{
                        right: "-7px",
                        width: 18,
                        height: 18,
                        backgroundColor: "rgba(10,10,10,0.97)",
                        border: "1.5px solid rgba(255,255,255,0.35)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
                      }}
                    >
                      <Lock size={10} style={{ color: "rgba(255,255,255,0.85)" }} />
                    </div>
                  )}
                </motion.div>
                <span
                  className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide sm:text-[10px]"
                  style={{
                    color: isActive ? "#fff" : isDimByHover ? "rgba(255,255,255,0.15)" : isExcluded ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.55)",
                    transition: "color 0.12s",
                  }}
                >
                  {node.label}
                </span>
              </motion.button>
            </div>
          );
        })}
      </div>

      {/* ── SIDE PANEL ── */}
      {/* Fixed-height container — panels are absolute so switching never shifts the wheel */}
      <div
        className="relative w-full lg:flex-1 lg:pl-14 self-center"
        style={{ minHeight: 520 }}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        <AnimatePresence mode="sync">
          {active !== null && activeNode ? (
            <ServicePanel key={active} node={activeNode} accentColor={accentColor} rgb={rgb} onClose={() => setActive(null)} />
          ) : (
            <PanelHint key="hint" accentColor={accentColor} rgb={rgb} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ServicePanel({ node, accentColor, rgb, onClose }: {
  node: (typeof ECO_NODES)[number];
  accentColor: string;
  rgb: string;
  onClose: () => void;
}) {
  const Icon = node.Icon;
  return (
    <motion.div
      className="absolute inset-x-0 top-0 w-full overflow-hidden border"
      style={{
        background: "linear-gradient(150deg, rgba(18,18,18,0.98) 0%, rgba(8,8,8,0.98) 100%)",
        borderColor: `rgba(${rgb},0.28)`,
        borderRadius: "20px",
        boxShadow: `0 0 0 1px rgba(${rgb},0.10) inset, 0 0 70px -24px rgba(${rgb},0.5)`,
      }}
      initial={{ opacity: 0, x: 16, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 8, scale: 0.98 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${accentColor} 0%, transparent 70%)` }} />
      <div className="absolute -left-[5px] top-1/2 z-10 -translate-y-1/2" style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: accentColor, boxShadow: `0 0 14px 4px rgba(${rgb},0.7)` }} />

      <div className="flex items-start gap-3 p-5 pb-4">
        <div className="flex aspect-square w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `rgba(${rgb},0.12)`, border: `1px solid rgba(${rgb},0.22)` }}>
          <Icon size={21} style={{ color: accentColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: accentColor }}>{node.label}</p>
          <p className="mt-1 text-sm leading-snug text-white/72">{node.desc}</p>
        </div>
        <button type="button" onClick={onClose} className="shrink-0 ml-1 text-white/25 transition-colors hover:text-white/70">
          <X size={15} />
        </button>
      </div>

      <div className="mx-5 h-px" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
      <div className="px-5 pt-4 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: accentColor }}>What's Included</p>
        <ul className="space-y-2.5">
          {node.highlights.map((point, j) => (
            <li key={j} className="flex items-start gap-2.5">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
              <span className="text-xs leading-snug" style={{ color: "rgba(255,255,255,0.6)" }}>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-4 pb-5 mt-auto">
        <Link href={node.href}
          className="group flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-bold text-white transition-opacity duration-200 hover:opacity-85"
          style={{ backgroundColor: accentColor }}>
          {node.cta}
          <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </motion.div>
  );
}

function PanelHint({ accentColor, rgb }: { accentColor: string; rgb: string }) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center py-16 text-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="mb-4 flex aspect-square w-14 items-center justify-center rounded-full border"
        style={{ borderColor: "rgba(255,255,255,0.07)", backgroundColor: "rgba(255,255,255,0.02)" }}
        animate={{ boxShadow: [`0 0 18px -10px rgba(${rgb},0.3)`, `0 0 36px -6px rgba(${rgb},0.5)`, `0 0 18px -10px rgba(${rgb},0.3)`] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: accentColor, transition: "background-color 0.12s" }}
          animate={{ scale: [1, 1.35, 1], opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
      <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.28)" }}>Hover any service</p>
      <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.16)" }}>to explore our work</p>
    </motion.div>
  );
}
