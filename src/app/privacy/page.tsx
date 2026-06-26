import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/constants";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How Paxala Media Production collects, uses, and protects your personal information.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="pt-24 md:pt-32 pb-20 min-h-screen bg-black text-white">
      <div className="mx-auto px-6 md:px-8 max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-white/50 mb-10">Last updated: June 26, 2026</p>

        <div className="space-y-8 text-white/70 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Who we are</h2>
            <p>
              {siteConfig.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a creative
              production studio based in {siteConfig.address}. This policy explains
              what personal information we collect through {siteConfig.url} and how
              we use it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">
              Information we collect
            </h2>
            <ul className="list-disc ps-6 space-y-1">
              <li>
                <strong>Contact &amp; booking forms:</strong> the name, email,
                phone number, and message details you submit so we can respond and
                schedule work.
              </li>
              <li>
                <strong>Client accounts:</strong> if you use the client portal, the
                account details and project information associated with your work.
              </li>
              <li>
                <strong>Preferences:</strong> a cookie that remembers your language
                choice (Arabic, Hebrew, or English).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">
              How we use your information
            </h2>
            <p>
              We use your information to respond to inquiries, schedule and deliver
              services, manage client projects and invoicing, and improve our site.
              We do not sell your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Data retention</h2>
            <p>
              We keep your information for as long as needed to provide our services
              and to meet legal and accounting obligations, after which it is
              deleted or anonymized.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Your rights</h2>
            <p>
              You may request access to, correction of, or deletion of your personal
              information by contacting us at{" "}
              <a
                href={`mailto:${siteConfig.email}`}
                className="text-red-500 hover:underline"
              >
                {siteConfig.email}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Contact</h2>
            <p>
              Questions about this policy? Email{" "}
              <a
                href={`mailto:${siteConfig.email}`}
                className="text-red-500 hover:underline"
              >
                {siteConfig.email}
              </a>{" "}
              or call {siteConfig.phone}.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
