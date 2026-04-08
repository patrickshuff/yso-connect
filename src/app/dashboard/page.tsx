import { currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const user = await currentUser();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Welcome to YSO Connect
      </h2>
      {user && (
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Signed in as {user.firstName ?? user.emailAddresses[0]?.emailAddress}
        </p>
      )}
    </div>
  );
}
