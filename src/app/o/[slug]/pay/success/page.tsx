import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function PaymentSuccessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md text-center">
        <CardContent className="space-y-6 py-12">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle className="size-8 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Payment Successful
            </h1>
            <p className="text-sm text-muted-foreground">
              Thank you for your payment. You will receive a confirmation email
              from Stripe shortly.
            </p>
          </div>
          <Button render={<Link href={`/o/${slug}`} />} variant="outline">
            Back to Organization
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
