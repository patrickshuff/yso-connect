import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.93_0.04_264),transparent_70%)]" />
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pb-28 sm:pt-32 lg:px-8 lg:pb-36 lg:pt-40">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            Built for youth sports organizations
          </div>

          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Replace the chaos with{" "}
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              clarity
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            No more group texts that nobody reads, email chains that lose
            parents, or paper forms that vanish. YSO Connect gives your
            organization one place to reach every guardian, every time.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/sign-up"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 px-6 text-sm"
              )}
            >
              Set up your team — free
              <ArrowRight data-icon="inline-end" className="size-4" />
            </Link>
            <a
              href="#features"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 px-6 text-sm"
              )}
            >
              See how it works
            </a>
          </div>

          <p className="mt-5 text-xs text-muted-foreground/70">
            No credit card required. Set up in under 10 minutes.
          </p>
        </div>
      </div>
    </section>
  );
}
