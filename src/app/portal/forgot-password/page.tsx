"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getWhatsAppUrl } from "@/lib/constants";

export default function ForgotPasswordPage() {
  const tWhatsApp = useTranslations("whatsapp");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const whatsAppHref = getWhatsAppUrl(tWhatsApp("messages.passwordReset"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
            Enter your email address and we&apos;ll send you a link to reset
            your password
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          {success ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-4"
            >
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="text-green-400" size={32} />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white">
                Check your email
              </h2>
              <p className="text-white/60 text-sm">
                If an account exists with that email, we&apos;ve sent you a
                password reset link. It stays valid for 1 hour.
              </p>
              <Link href="/portal/login">
                <Button className="w-full mt-6" size="lg">
                  Back to Login
                  <ArrowRight size={18} className="ms-2 rtl:rotate-180" />
                </Button>
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  <AlertCircle size={18} />
                  {error}
                </motion.div>
              )}

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute start-4 top-1/2 -translate-y-1/2 text-white/40"
                  />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="ps-12"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? "Sending reset link..." : "Send Reset Link"}
              </Button>

              <p className="text-center text-white/50 text-xs">
                No email on your account?{" "}
                <a
                  href={whatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-red-500 hover:text-red-400 transition-colors"
                >
                  <MessageCircle size={12} />
                  Message us on WhatsApp
                </a>
              </p>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
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
