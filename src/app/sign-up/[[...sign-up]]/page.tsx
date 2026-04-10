import { PhoneSignUp } from "@/components/auth/phone-sign-up";
import { FunnelPageView } from "@/components/analytics/funnel-page-view";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <FunnelPageView location="global_signup_page" />
      <PhoneSignUp />
    </div>
  );
}
