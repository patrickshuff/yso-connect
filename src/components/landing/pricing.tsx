import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
          <Button
            render={<Link href={ctaHref} />}
            variant={highlighted ? "default" : "outline"}
            className="w-full"
            size="lg"
          >
            {cta}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const tiers: PricingTierProps[] = [
  {
    name: "Small",
    price: "$199",
    period: "/year",
    description: "For small leagues and single-team organizations.",
    features: [
      "Up to 50 players",
      "Unlimited guardians per player",
      "SMS + email messaging",
      "Automated reminders",
      "Digital forms and signatures",
      "Public org page",
    ],
    cta: "Start free trial",
    ctaHref: "/sign-up",
  },
  {
    name: "Starter",
    price: "$999",
    period: "/year",
    description: "For single-sport organizations ready to grow.",
    features: [
      "Up to 200 players",
      "Everything in Small",
      "Payment collection",
      "Custom branding",
      "Advanced analytics",
    ],
    highlighted: true,
    cta: "Start free trial",
    ctaHref: "/sign-up",
  },
  {
    name: "Growth",
    price: "$1,999",
    period: "/year",
    description: "For growing organizations with multiple sports or seasons.",
    features: [
      "Up to 500 players",
      "Everything in Starter",
      "Priority support",
      "API access",
      "Dedicated account manager",
    ],
    cta: "Start free trial",
    ctaHref: "/sign-up",
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
            Annual plans that scale with your organization. Every plan includes
            a 30-day free trial.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <PricingTier key={tier.name} {...tier} />
          ))}
        </div>
      </div>
    </section>
  );
}
