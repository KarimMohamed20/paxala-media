"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, isSameDay, isAfter, startOfToday } from "date-fns";
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { services } from "@/lib/constants";

const timeSlots = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
];

type BookingStep = "service" | "datetime" | "details" | "confirm";

export function BookingForm() {
  const [step, setStep] = useState<BookingStep>("service");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = startOfToday();
  const daysInMonth = Array.from({ length: 35 }, (_, i) => {
    const firstDay = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const startDay = firstDay.getDay();
    return addDays(firstDay, i - startDay);
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const selectedServiceData = services.find((s) => s.id === selectedService);

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          serviceType: selectedServiceData?.name || selectedService,
          date: selectedDate?.toISOString(),
          timeSlot: selectedTime,
          notes: formData.notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create booking");
      }

      setIsComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    const steps: BookingStep[] = ["service", "datetime", "details", "confirm"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: BookingStep[] = ["service", "datetime", "details", "confirm"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const canProceed = () => {
    switch (step) {
      case "service":
        return selectedService !== null;
      case "datetime":
        return selectedDate !== null && selectedTime !== null;
      case "details":
        return formData.name && formData.email;
      default:
        return true;
    }
  };

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-20 h-20 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-6">
          <Check size={40} className="text-green-500" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-4">Booking Confirmed!</h3>
        <p className="text-white/60 mb-8 max-w-md mx-auto">
          We&apos;ve received your booking request. You&apos;ll receive a
          confirmation email shortly with all the details.
        </p>
        <div className="bg-white/5 rounded-xl p-6 max-w-md mx-auto text-left">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-white/60">Service</span>
              <span className="text-white font-medium">
                {services.find((s) => s.id === selectedService)?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Date</span>
              <span className="text-white font-medium">
                {selectedDate && format(selectedDate, "MMMM d, yyyy")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Time</span>
              <span className="text-white font-medium">{selectedTime}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-12">
        {["service", "datetime", "details", "confirm"].map((s, i) => {
          const steps: BookingStep[] = [
            "service",
            "datetime",
            "details",
            "confirm",
          ];
          const isActive = step === s;
          const isPast = steps.indexOf(step) > i;
          const labels = ["Service", "Date & Time", "Details", "Confirm"];

          return (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all",
                    isActive
                      ? "bg-red-600 text-white"
                      : isPast
                      ? "bg-green-600 text-white"
                      : "bg-white/10 text-white/40"
                  )}
                >
                  {isPast ? <Check size={18} /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-xs mt-2 hidden sm:block",
                    isActive ? "text-white" : "text-white/40"
                  )}
                >
                  {labels[i]}
                </span>
              </div>
              {i < 3 && (
                <div
                  className={cn(
                    "w-12 sm:w-20 h-0.5 mx-2",
                    isPast ? "bg-green-600" : "bg-white/10"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {step === "service" && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Select a Service
              </h2>
              <p className="text-white/60 mb-8">
                Choose the type of consultation you&apos;d like to book.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.slice(0, 6).map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={cn(
                      "p-6 rounded-xl text-left transition-all",
                      selectedService === service.id
                        ? "bg-red-600 border-red-600"
                        : "bg-white/5 border border-white/10 hover:border-white/20"
                    )}
                  >
                    <h3 className="font-semibold text-white mb-2">
                      {service.name}
                    </h3>
                    <p
                      className={cn(
                        "text-sm",
                        selectedService === service.id
                          ? "text-white/80"
                          : "text-white/60"
                      )}
                    >
                      {service.description.slice(0, 80)}...
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "datetime" && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Choose Date & Time
              </h2>
              <p className="text-white/60 mb-8">
                Select a convenient date and time for your consultation.
              </p>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Calendar */}
                <div className="bg-white/5 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-white">
                      {format(currentMonth, "MMMM yyyy")}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setCurrentMonth(
                            new Date(
                              currentMonth.getFullYear(),
                              currentMonth.getMonth() - 1
                            )
                          )
                        }
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <ChevronLeft size={18} className="text-white" />
                      </button>
                      <button
                        onClick={() =>
                          setCurrentMonth(
                            new Date(
                              currentMonth.getFullYear(),
                              currentMonth.getMonth() + 1
                            )
                          )
                        }
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <ChevronRight size={18} className="text-white" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                      <div
                        key={day}
                        className="text-center text-xs text-white/40 py-2"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {daysInMonth.map((day, i) => {
                      const isCurrentMonth =
                        day.getMonth() === currentMonth.getMonth();
                      const isSelectable = isAfter(day, today) || isSameDay(day, today);
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const isWeekend = day.getDay() === 5 || day.getDay() === 6;

                      return (
                        <button
                          key={i}
                          onClick={() =>
                            isSelectable && isCurrentMonth && !isWeekend && setSelectedDate(day)
                          }
                          disabled={!isSelectable || !isCurrentMonth || isWeekend}
                          className={cn(
                            "aspect-square rounded-lg text-sm transition-all",
                            !isCurrentMonth && "opacity-20",
                            isWeekend && "text-white/20",
                            isSelectable && isCurrentMonth && !isWeekend
                              ? "hover:bg-white/10"
                              : "opacity-30 cursor-not-allowed",
                            isSelected
                              ? "bg-red-600 text-white"
                              : "text-white/70"
                          )}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots */}
                <div>
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock size={18} />
                    Available Times
                  </h3>
                  {selectedDate ? (
                    <div className="grid grid-cols-2 gap-3">
                      {timeSlots.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={cn(
                            "py-3 rounded-lg font-medium transition-all",
                            selectedTime === time
                              ? "bg-red-600 text-white"
                              : "bg-white/5 text-white/70 hover:bg-white/10"
                          )}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/40 text-sm">
                      Please select a date first
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === "details" && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Your Details
              </h2>
              <p className="text-white/60 mb-8">
                Please provide your contact information.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                    />
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Your full name"
                      className="pl-12"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                    />
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="your@email.com"
                      className="pl-12"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                    />
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+972 XXX XXX XXXX"
                      className="pl-12"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Additional Notes
                  </label>
                  <div className="relative">
                    <MessageSquare
                      size={18}
                      className="absolute left-4 top-4 text-white/40"
                    />
                    <Textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Tell us about your project or any specific requirements..."
                      className="pl-12 min-h-[120px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Confirm Booking
              </h2>
              <p className="text-white/60 mb-8">
                Please review your booking details before confirming.
              </p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-600/10 border border-red-600/20 rounded-xl p-4 mb-6"
                >
                  <p className="text-red-500 text-sm">{error}</p>
                </motion.div>
              )}

              <div className="bg-white/5 rounded-xl p-6 mb-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 pb-4 border-b border-white/10">
                    <Calendar size={20} className="text-red-500 mt-0.5" />
                    <div>
                      <p className="text-white/60 text-sm">Service</p>
                      <p className="text-white font-medium">
                        {services.find((s) => s.id === selectedService)?.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 pb-4 border-b border-white/10">
                    <Clock size={20} className="text-red-500 mt-0.5" />
                    <div>
                      <p className="text-white/60 text-sm">Date & Time</p>
                      <p className="text-white font-medium">
                        {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}{" "}
                        at {selectedTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 pb-4 border-b border-white/10">
                    <User size={20} className="text-red-500 mt-0.5" />
                    <div>
                      <p className="text-white/60 text-sm">Contact</p>
                      <p className="text-white font-medium">{formData.name}</p>
                      <p className="text-white/60 text-sm">{formData.email}</p>
                      {formData.phone && (
                        <p className="text-white/60 text-sm">{formData.phone}</p>
                      )}
                    </div>
                  </div>

                  {formData.notes && (
                    <div className="flex items-start gap-4">
                      <MessageSquare size={20} className="text-red-500 mt-0.5" />
                      <div>
                        <p className="text-white/60 text-sm">Notes</p>
                        <p className="text-white/80 text-sm">{formData.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-8 border-t border-white/10">
        <Button
          variant="ghost"
          onClick={prevStep}
          disabled={step === "service"}
          className={step === "service" ? "invisible" : ""}
        >
          <ChevronLeft size={18} className="mr-2" />
          Back
        </Button>

        {step === "confirm" ? (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Booking...
              </>
            ) : (
              <>
                Confirm Booking
                <Check size={18} className="ml-2" />
              </>
            )}
          </Button>
        ) : (
          <Button onClick={nextStep} disabled={!canProceed()}>
            Continue
            <ArrowRight size={18} className="ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
