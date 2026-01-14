"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { StaffSidebar } from "./sidebar";
import { usePathname } from "next/navigation";

export function StaffMobileNav() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    // Close menu when route changes
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    const toggleOpen = () => setIsOpen((prev) => !prev);

    const onDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // If dragged enough to the left, close it
        if (info.offset.x < -100) {
            setIsOpen(false);
        }
    };

    return (
        <>
            {/* Mobile Header */}
            <div className="fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between md:hidden">
                <h1 className="text-lg font-bold text-white tracking-tight">
                    Paxala<span className="text-red-600">Media</span>
                </h1>

                <button
                    onClick={toggleOpen}
                    className="p-2 -mr-2 text-white hover:text-white/80 transition-colors"
                    aria-label="Toggle Menu"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden"
                        />

                        {/* Sidebar Drawer */}
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={{ left: 0.5, right: 0 }}
                            onDragEnd={onDragEnd}
                            className="fixed z-50 top-0 left-0 bottom-0 w-80 max-w-[80vw] bg-neutral-950 md:hidden overflow-hidden"
                            style={{ x: 0 }}
                        >
                            <StaffSidebar
                                className="w-full h-full border-r-0 pt-24"
                                onClose={() => setIsOpen(false)}
                            />

                            {/* Drag Handle Indicator */}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-12 bg-white/20 rounded-full opacity-50" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
