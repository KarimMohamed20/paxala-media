import { Metadata } from "next";
import { BookingForm } from "@/components/forms/booking-form";

export const metadata: Metadata = {
  title: "Book a Consultation",
  description:
    "Schedule a consultation with Paxala Media Production. Let's discuss your creative project needs.",
};

export default function BookingPage() {
  return (
    <div className="pt-20 min-h-screen bg-black">
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-neutral-950 to-black">
        <div className="mx-auto px-6 md:px-8 lg:px-12 max-w-7xl">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block text-red-500 font-medium mb-4 tracking-wider uppercase text-sm">
              Schedule a Meeting
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-red-500">B</span>
              <span className="text-white">ook a Consultation</span>
            </h1>
            <p className="text-lg text-white/60 leading-relaxed">
              Ready to bring your vision to life? Schedule a free consultation
              with our team to discuss your project, explore possibilities, and
              get a personalized quote.
            </p>
          </div>
        </div>
      </section>

      {/* Booking Form */}
      <section className="py-16 md:py-24">
        <div className="mx-auto px-6 md:px-8 lg:px-12 max-w-7xl">
          <BookingForm />
        </div>
      </section>
    </div>
  );
}
