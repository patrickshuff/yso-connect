import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PricingTierProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
  ctaHref: string;
}

function PricingTier({
  name,
  price,
  period,
  description,
  features,
  highlighted = false,
  cta,
  ctaHref,
}: PricingTierProps) {
  return (
    <Card
      className={
        highlighted
          ? "relative ring-2 ring-primary shadow-lg"
          : ""
      }
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground shadow-sm">
            Most popular
          </Badge>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-lg">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight text-foreground">
            {price}
          </span>
          <span className="text-sm text-muted-foreground">{period}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <ul className="flex flex-col gap-2.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Link
            href={ctaHref}
            className={cn(
              buttonVariants({
                variant: highlighted ? "default" : "outline",
                size: "lg",
              }),
              "w-full"
            )}
          >
            {cta}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

const coachTier: PricingTierProps = {
  name: "Per Team",
  price: "$5",
  period: "/month",
  description: "For individual coaches managing a single team. Free for 30 days.",
  features: [
    "Full roster management",
    "SMS + email messaging",
    "Game and practice schedule",
    "Automated reminders",
    "Digital forms and signatures",
    "No credit card to start",
  ],
  highlighted: true,
  cta: "Start free — no card required",
  ctaHref: "/sign-up",
};

const orgTiers: PricingTierProps[] = [
  {
    name: "Small Org",
    price: "$199",
    period: "/year",
    description: "For small leagues with a handful of teams.",
    features: [
      "Up to 50 players",
      "Unlimited teams",
      "Everything coaches get",
      "Public org page",
      "Interest signup forms",
    ],
    cta: "Contact us",
    ctaHref: "mailto:support@ysoconnect.com?subject=Small%20Org%20Plan",
  },
  {
    name: "Starter Org",
    price: "$999",
    period: "/year",
    description: "For single-sport organizations ready to grow.",
    features: [
      "Up to 200 players",
      "Everything in Small",
      "Payment collection",
      "Multi-season management",
      "Email support",
    ],
    cta: "Contact us",
    ctaHref: "mailto:support@ysoconnect.com?subject=Starter%20Org%20Plan",
  },
  {
    name: "Growth Org",
    price: "$1,999",
    period: "/year",
    description: "For multi-sport organizations with multiple seasons.",
    features: [
      "Up to 500 players",
      "Everything in Starter",
      "Priority email support",
      "Multi-sport divisions",
      "Onboarding assistance",
    ],
    cta: "Contact us",
    ctaHref: "mailto:support@ysoconnect.com?subject=Growth%20Org%20Plan",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-14 border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Pricing
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            No sales calls. No hidden fees. Start free, upgrade when you need to.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-md">
          <PricingTier {...coachTier} />
        </div>

        <div className="mx-auto mt-6 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Running an entire organization?
          </p>
        </div>

        <div className="mx-auto mt-6 grid max-w-5xl gap-6 lg:grid-cols-3">
          {orgTiers.map((tier) => (
            <PricingTier key={tier.name} {...tier} />
          ))}
        </div>
      </div>
    </section>
  );
}
