"use client";

import { useMemo, useState } from "react";
import { HelpCircle, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";

type GuideItem = {
  title: string;
  route: string;
  description: string;
  keyActions: string[];
  nextStep: string;
};

const guideItems: GuideItem[] = [
  {
    title: "Home",
    route: "/",
    description:
      "Start here to feel out the promise of Vow & Venue. Explore the platform story, read couple testimonials, and decide your next move.",
    keyActions: [
      "Choose \"Start Planning\" to head straight into login and set up your workspace.",
      "Skim the feature highlights to see how checklists, RSVPs, and budgets stay in sync.",
      "Use testimonials as quick social proof when sharing the platform with a partner or planner.",
    ],
    nextStep: "Login",
  },
  {
    title: "Login",
    route: "/login",
    description:
      "Sign in to save weddings, keep collaborator access aligned, and secure your planning data with Supabase authentication.",
    keyActions: [
      "Sign up with email or Google to create your profile.",
      "Carry invite tokens automatically so collaborator links work the moment you land in dashboard.",
      "Return visitors can log in to jump back to their active wedding without recreating details.",
    ],
    nextStep: "Onboarding",
  },
  {
    title: "Onboarding",
    route: "/onboarding",
    description:
      "Create a wedding workspace by sharing partner names and your date. That context powers your countdowns and reminders.",
    keyActions: [
      "Add both partner names to personalize communication across the app.",
      "Save your wedding date so the dashboard timer and timeline align.",
      "Confirm details to generate the core workspace stored against your profile.",
    ],
    nextStep: "Dashboard",
  },
  {
    title: "Dashboard",
    route: "/dashboard",
    description:
      "See your wedding at a glance—budget, guests, countdown, and tasks live here so you can prioritize at every login.",
    keyActions: [
      "Track spending versus budget to spot adjustments early.",
      "Use the checklist to assign and complete planning tasks with collaborators.",
      "Keep an eye on the countdown tile to pace milestones and communications.",
    ],
    nextStep: "Invite Links",
  },
  {
    title: "Invite Links",
    route: "/invite",
    description:
      "Share or accept collaborator invitations to give planners, partners, or family the right access to your workspace.",
    keyActions: [
      "Copy or send invite links so others can co-plan with you.",
      "Accept pending invitations tied to your email or Google login.",
      "Confirm who has access and return to the dashboard with everyone aligned.",
    ],
    nextStep: "Dashboard",
  },
];

function matchesRoute(currentPath: string, route: string) {
  if (route === "/") return currentPath === "/";
  return currentPath.startsWith(route);
}

export function HowToGuide() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [focusedRoute, setFocusedRoute] = useState<string | null>(null);

  const activeItem = useMemo(
    () => guideItems.find((item) => matchesRoute(focusedRoute ?? pathname, item.route)),
    [focusedRoute, pathname],
  );

  const focusLabel = activeItem?.title ?? "page";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:scale-105 hover:bg-primary/90"
        aria-label="Open how-to guide"
      >
        <HelpCircle className="h-4 w-4" />
        How to
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-10 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl rounded-3xl bg-white/95 p-8 shadow-2xl ring-1 ring-border">
            <button
              type="button"
              onClick={() => {
                setFocusedRoute(null);
                setOpen(false);
              }}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-muted"
              aria-label="Close how-to guide"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3 sm:items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Quick Tour</p>
                <h2 className="text-2xl font-semibold text-foreground">Your guide, always within reach</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tap any page card to learn what it does, what to click next, and how to stay on track. Active pages glow so you know you are reading the right steps.
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20">
                  <Sparkles className="h-3 w-3" />
                  Currently focused on: {focusLabel}
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {guideItems.map((item) => {
                const isActive = matchesRoute(focusedRoute ?? pathname, item.route);
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setFocusedRoute(item.route)}
                    className={`group flex flex-col items-start rounded-2xl border bg-card/70 p-5 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 ${
                      isActive ? "border-primary/50 shadow-primary/20 ring-1 ring-primary/20" : "border-border"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                      <span
                        className={`text-xs font-semibold uppercase tracking-wide ${
                          isActive ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {isActive ? "Active" : "Tap to focus"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                    <div className="mt-3 w-full rounded-xl bg-muted/70 p-3 text-left text-xs text-muted-foreground">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground">Key actions</p>
                      <ul className="mt-1 space-y-1 text-sm text-foreground/90">
                        {item.keyActions.map((action) => (
                          <li key={action} className="flex items-start gap-2">
                            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/15">
                      Next stop: {item.nextStep}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
