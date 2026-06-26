import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/constants";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "The terms that govern your use of the Paxala Media Production website and services.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="pt-24 md:pt-32 pb-20 min-h-screen bg-black text-white">
      <div className="mx-auto px-6 md:px-8 max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">Terms of Service</h1>
        <p className="text-white/50 mb-10">Last updated: June 26, 2026</p>

        <div className="space-y-8 text-white/70 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">
              Acceptance of terms
            </h2>
            <p>
              By accessing {siteConfig.url} or engaging {siteConfig.name} for
              services, you agree to these terms. If you do not agree, please do not
              use the site or our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Our services</h2>
            <p>
              We provide creative production services including video, photography,
              design, web and app development, and related marketing. The specific
              scope, deliverables, timeline, and fees for any engagement are set out
              in a separate proposal or agreement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">
              Bookings &amp; inquiries
            </h2>
            <p>
              Submitting a booking or inquiry is a request, not a confirmed
              engagement. We will contact you to confirm availability and details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">
              Intellectual property
            </h2>
            <p>
              Ownership and licensing of delivered work are defined in the
              applicable project agreement. Content on this website, including text,
              graphics, and logos, is owned by {siteConfig.name} unless otherwise
              stated and may not be reused without permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">
              Limitation of liability
            </h2>
            <p>
              The website is provided &ldquo;as is&rdquo;. To the extent permitted by
              law, {siteConfig.name} is not liable for any indirect or consequential
              damages arising from your use of the site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Contact</h2>
            <p>
              Questions about these terms? Email{" "}
              <a
                href={`mailto:${siteConfig.email}`}
                className="text-red-500 hover:underline"
              >
                {siteConfig.email}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
