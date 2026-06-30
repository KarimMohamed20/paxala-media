"use client";

import Image from "next/image";
import { SX } from "./service-shared";

// Existing client logos (same source as the homepage Clients section).
const logos = [
  { name: "Abu Elhof", src: "/images/clients/Abu elhof LOGO.png" },
  { name: "DNA", src: "/images/clients/DNA_logo.png" },
  { name: "El-Mass", src: "/images/clients/El-Mass logo.png" },
  { name: "Hija", src: "/images/clients/gold logo hija.png" },
  { name: "La Flamingo", src: "/images/clients/LA FLAMINGO INSIDE LOGO COLOR-01.png" },
  { name: "Academy Lev", src: "/images/clients/logo_academylev.png" },
  { name: "Hian", src: "/images/clients/Logo-Hian-01.png" },
  { name: "Walid", src: "/images/clients/LOGONEW WALID-01.png" },
  { name: "Mohammad Mashevot", src: "/images/clients/mohammad logo mashevot kaukab.png" },
  { name: "Munches", src: "/images/clients/MUNCHES.png" },
  { name: "Rai", src: "/images/clients/Rai logo.png" },
  { name: "Walid Group", src: "/images/clients/WALID-GROUP-LOGO.png" },
];

/** Premium infinite, slow, grayscale logo strip. Colour reveals on hover (CSS-only → 60fps). */
export function TrustedStrip() {
  const row = [...logos, ...logos];

  return (
    <section className="relative py-12 md:py-16" style={{ backgroundColor: SX.bg }}>
      <p className="mb-8 text-center text-xs font-medium uppercase tracking-[0.3em] text-white/35">
        Trusted by ambitious brands
      </p>

      <div
        className="group relative overflow-hidden"
        style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}
      >
        <div className="trusted-track flex w-max items-center gap-12 group-hover:[animation-play-state:paused]">
          {row.map((logo, i) => (
            <div
              key={`${logo.name}-${i}`}
              className="relative h-12 w-32 flex-shrink-0 opacity-60 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0 md:h-14 md:w-40"
            >
              <Image src={logo.src} alt={logo.name} fill className="object-contain" sizes="160px" />
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .trusted-track {
          animation: trusted-scroll 45s linear infinite;
        }
        @keyframes trusted-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .trusted-track {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
