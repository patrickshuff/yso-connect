import {
  MessageSquareWarning,
  MailX,
  FileQuestion,
} from "lucide-react";

interface ProblemItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function ProblemItem({ icon, title, description }: ProblemItemProps) {
  return (
    <div className="flex gap-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

const problems: ProblemItemProps[] = [
  {
    icon: <MessageSquareWarning className="size-5" />,
    title: "Group texts that lose people",
    description:
      "Parents mute the chat, new families never get added, and critical updates get buried under reply-all chaos.",
  },
  {
    icon: <MailX className="size-5" />,
    title: "Emails that go nowhere",
    description:
      "Outdated distribution lists, bounced addresses, and no way to know who actually read the schedule change.",
  },
  {
    icon: <FileQuestion className="size-5" />,
    title: "Paper forms that vanish",
    description:
      "Waivers stuffed in bags, medical forms lost between seasons, and hours wasted chasing down missing signatures.",
  },
];

export function Problem() {
  return (
    <section className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            The problem
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Communication shouldn&apos;t be this hard
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Running a youth sports org means juggling dozens of families across
            multiple teams. The tools you use today were never built for this.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-8 sm:grid-cols-3 sm:gap-6">
          {problems.map((problem) => (
            <ProblemItem key={problem.title} {...problem} />
          ))}
        </div>
      </div>
    </section>
  );
}
