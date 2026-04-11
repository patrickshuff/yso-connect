import Link from "next/link";
import { BellRing, LineChart } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Admin
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Platform management and analytics.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/kpi">
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardHeader>
              <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <LineChart className="size-5 text-primary" />
              </div>
              <CardTitle className="text-base">KPI Dashboard</CardTitle>
              <CardDescription>
                Weekly funnel metrics, conversion rates, and lead attribution.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/operations">
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardHeader>
              <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-amber-100">
                <BellRing className="size-5 text-amber-700" />
              </div>
              <CardTitle className="text-base">Operations Dashboard</CardTitle>
              <CardDescription>
                Monitor reminders, messaging delivery health, and subscription payment failures.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
