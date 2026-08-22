"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWhatsAppUrl } from "@/lib/constants";

// Interim page: self-service reset (token email + reset form) is not built
// yet, so be honest and route the locked-out client to a human instead of
// pretending an email was sent.
export default function ForgotPasswordPage() {
  const tWhatsApp = useTranslations("whatsapp");
  const whatsAppHref = getWhatsAppUrl(tWhatsApp("messages.passwordReset"));

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-4xl font-bold">
              <span className="text-red-500">P</span>
              <span className="text-white">MP</span>
            </span>
          </Link>
          <h1 className="text-2xl font-semibold text-white mt-6 mb-2">
            Reset Password
          </h1>
          <p className="text-white/60">
            Our team will get you back into your account in minutes
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 space-y-6 text-center">
          <p className="text-white/70 text-sm leading-relaxed">
            Message us on WhatsApp or use the contact page, and we&apos;ll
            verify your identity and reset your password right away.
          </p>

          <Button asChild className="w-full" size="lg">
            <a href={whatsAppHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={18} className="me-2" />
              Message us on WhatsApp
            </a>
          </Button>

          <Link
            href="/contact"
            className="block text-sm text-red-500 hover:text-red-400 transition-colors"
          >
            Or use the contact page
            <ArrowRight size={14} className="inline ms-1" />
          </Link>

          <div className="pt-6 border-t border-white/10">
            <Link
              href="/portal/login"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              &larr; Back to Login
            </Link>
          </div>
        </div>

        <p className="text-center text-white/40 text-sm mt-8">
          <Link href="/" className="hover:text-white transition-colors">
            &larr; Back to website
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
