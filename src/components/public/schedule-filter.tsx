"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface ScheduleFilterProps {
  teams: { id: string; name: string }[];
  slug: string;
}

export function ScheduleFilter({ teams, slug }: ScheduleFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTeamId = searchParams.get("team") ?? "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value) {
      router.push(`/o/${slug}/schedule?team=${value}`);
    } else {
      router.push(`/o/${slug}/schedule`);
    }
  }

  if (teams.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="team-filter"
        className="text-sm font-medium text-muted-foreground"
      >
        Filter by team:
      </label>
      <select
        id="team-filter"
        value={currentTeamId}
        onChange={handleChange}
        className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">All Teams</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </div>
  );
}
