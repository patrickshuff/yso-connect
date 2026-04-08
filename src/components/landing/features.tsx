import {
  Users,
  UserPlus,
  Bell,
  FileSignature,
  Globe,
  CreditCard,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="border-0 bg-transparent ring-0 shadow-none">
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription className="leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

const features: FeatureCardProps[] = [
  {
    icon: <Users className="size-5" />,
    title: "Roster-based messaging",
    description:
      "Message every guardian on a team with one click. SMS and email delivered together, tied to your live roster. No threads, no noise.",
  },
  {
    icon: <UserPlus className="size-5" />,
    title: "Multi-guardian contacts",
    description:
      "Mom, dad, grandpa, carpool parent -- every contact per player in one place. Divorced families handled gracefully, no duplicates.",
  },
  {
    icon: <Bell className="size-5" />,
    title: "Automated reminders",
    description:
      "Game and practice reminders go out automatically based on your schedule. Parents get the right info at the right time, every time.",
  },
  {
    icon: <FileSignature className="size-5" />,
    title: "Digital forms and signatures",
    description:
      "Waivers, medical forms, and registrations collected digitally. Track who has signed and send reminders to those who haven't.",
  },
  {
    icon: <Globe className="size-5" />,
    title: "Public org pages",
    description:
      "A clean, professional landing page for your organization with schedules, announcements, and registration links. No website builder needed.",
  },
  {
    icon: <CreditCard className="size-5" />,
    title: "Simple payments",
    description:
      "Collect registration fees, uniform payments, and fundraiser contributions. Track who's paid and send gentle nudges to those who haven't.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-14">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Features
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Everything your organization needs
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Purpose-built for youth sports. Not a generic messaging app with a
            baseball skin on it.
          </p>
        </div>

        <div className="mt-12 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
