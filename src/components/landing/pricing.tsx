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

const tiers: PricingTierProps[] = [
  {
    name: "Starter",
    price: "$49",
    period: "/month",
    description: "For small leagues and single-sport organizations.",
    features: [
      "Up to 10 teams",
      "Full roster management",
      "SMS + email messaging",
      "Game and practice schedule",
      "Automated reminders",
      "Digital forms and signatures",
      "30-day free trial",
    ],
    cta: "Start free — no card required",
    ctaHref: "/sign-up",
  },
  {
    name: "Pro",
    price: "$99",
    period: "/month",
    description: "For growing organizations with multiple teams and sports.",
    features: [
      "Up to 30 teams",
      "Everything in Starter",
      "Payment collection",
      "Multi-sport divisions",
      "Multi-season management",
      "Priority email support",
    ],
    highlighted: true,
    cta: "Start free — no card required",
    ctaHref: "/sign-up",
  },
  {
    name: "League",
    price: "$249",
    period: "/month",
    description: "For large multi-sport leagues and associations.",
    features: [
      "Unlimited teams",
      "Everything in Pro",
      "Public org page",
      "Interest signup forms",
      "Onboarding assistance",
      "Dedicated support",
    ],
    cta: "Contact us",
    ctaHref: "mailto:support@ysoconnect.com?subject=League%20Plan",
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

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <PricingTier key={tier.name} {...tier} />
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-xl text-center text-sm text-muted-foreground">
          Cancel anytime. Perfect for seasonal leagues — pay only during your active months.
        </p>
      </div>
    </section>
  );
}
