"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function PortalPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/portal/dashboard");
    } else if (status === "unauthenticated") {
      router.replace("/portal/login");
    }
  }, [status, router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white flex items-center gap-2">
        <Loader2 className="animate-spin" size={20} />
        Redirecting...
      </div>
    </div>
  );
}
