"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { eq, and, sql, count, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  forms,
  formAssignments,
  formSubmissions,
  players,
  guardians,
  playerGuardians,
  teams,
  teamPlayers,
} from "@/db/schema";
import { requireRole } from "@/lib/memberships";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormType = "waiver" | "medical" | "permission" | "registration" | "custom";
type AssignmentType = "organization" | "team" | "player";

interface ActionResult {
  success: boolean;
  error?: string;
}

interface CreateFormResult extends ActionResult {
  formId?: string;
}

interface AssignFormResult extends ActionResult {
  assignmentId?: string;
}

export interface FormWithStats {
  id: string;
  title: string;
  description: string | null;
  formType: FormType;
  content: string;
  requiresSignature: boolean;
  isActive: boolean;
  createdAt: Date;
  totalAssigned: number;
  totalCompleted: number;
}

export interface FormDetail {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  formType: FormType;
  content: string;
  requiresSignature: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface FormAssignmentRow {
  id: string;
  assignmentType: AssignmentType;
  assignmentTargetId: string | null;
  targetName: string;
  dueDate: string | null;
  createdAt: Date;
}

export interface SubmissionRow {
  id: string;
  playerName: string;
  guardianName: string;
  status: "pending" | "completed";
  signatureName: string | null;
  signedAt: Date | null;
  completedAt: Date | null;
}

// ---------------------------------------------------------------------------
// createForm
// ---------------------------------------------------------------------------

export async function createForm(
  orgId: string,
  formData: FormData,
): Promise<CreateFormResult> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };

  await requireRole(orgId, userId, "admin");

  const title = formData.get("title") as string | null;
  const description = (formData.get("description") as string | null) || null;
  const formType = formData.get("formType") as FormType | null;
  const content = formData.get("content") as string | null;
  const requiresSignature = formData.get("requiresSignature") === "on";

  if (!title || !formType || !content) {
    return { success: false, error: "Title, type, and content are required" };
  }

  const [form] = await db
    .insert(forms)
    .values({
      organizationId: orgId,
      title,
      description,
      formType,
      content,
      requiresSignature,
    })
    .returning();

  revalidatePath(`/dashboard/${orgId}/forms`);
  return { success: true, formId: form.id };
}

// ---------------------------------------------------------------------------
// assignForm
// ---------------------------------------------------------------------------

export async function assignForm(
  orgId: string,
  formId: string,
  formData: FormData,
): Promise<AssignFormResult> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };

  await requireRole(orgId, userId, "admin");

  const assignmentType = formData.get("assignmentType") as AssignmentType | null;
  const assignmentTargetId = (formData.get("assignmentTargetId") as string | null) || null;
  const dueDate = (formData.get("dueDate") as string | null) || null;

  if (!assignmentType) {
    return { success: false, error: "Assignment type is required" };
  }

  if (assignmentType !== "organization" && !assignmentTargetId) {
    return { success: false, error: "Target is required for team/player assignments" };
  }

  const [assignment] = await db
    .insert(formAssignments)
    .values({
      formId,
      organizationId: orgId,
      assignmentType,
      assignmentTargetId: assignmentType === "organization" ? null : assignmentTargetId,
      dueDate,
    })
    .returning();

  revalidatePath(`/dashboard/${orgId}/forms/${formId}`);
  return { success: true, assignmentId: assignment.id };
}

// ---------------------------------------------------------------------------
// submitForm
// ---------------------------------------------------------------------------

export async function submitForm(
  orgId: string,
  formId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };

  const assignmentId = formData.get("assignmentId") as string | null;
  const guardianId = formData.get("guardianId") as string | null;
  const playerId = formData.get("playerId") as string | null;
  const signatureName = (formData.get("signatureName") as string | null) || null;
  const acknowledged = formData.get("acknowledged") === "on";
  const ipAddress = (formData.get("ipAddress") as string | null) || null;
  const userAgentValue = (formData.get("userAgent") as string | null) || null;

  if (!assignmentId || !guardianId || !playerId) {
    return { success: false, error: "Missing required fields" };
  }

  if (!acknowledged) {
    return { success: false, error: "You must acknowledge the form" };
  }

  // Verify the guardian belongs to this org and is linked to the current user
  const [guardian] = await db
    .select()
    .from(guardians)
    .where(
      and(
        eq(guardians.id, guardianId),
        eq(guardians.organizationId, orgId),
        eq(guardians.clerkUserId, userId),
      ),
    );

  if (!guardian) {
    return { success: false, error: "Guardian not found or not authorized" };
  }

  const now = new Date();

  await db.insert(formSubmissions).values({
    formAssignmentId: assignmentId,
    guardianId,
    playerId,
    status: "completed",
    signatureName,
    signedAt: signatureName ? now : null,
    ipAddress,
    userAgent: userAgentValue,
    completedAt: now,
  });

  revalidatePath(`/dashboard/${orgId}/forms/${formId}`);
  revalidatePath(`/dashboard/${orgId}/forms/${formId}/submit`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// updateForm
// ---------------------------------------------------------------------------

export async function updateForm(
  orgId: string,
  formId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };

  await requireRole(orgId, userId, "admin");

  // Verify the form belongs to this org
  const [existing] = await db
    .select({ id: forms.id })
    .from(forms)
    .where(and(eq(forms.id, formId), eq(forms.organizationId, orgId)));

  if (!existing) {
    return { success: false, error: "Form not found" };
  }

  const title = formData.get("title") as string | null;
  const description = (formData.get("description") as string | null) || null;
  const formType = formData.get("formType") as FormType | null;
  const content = formData.get("content") as string | null;
  const requiresSignature = formData.get("requiresSignature") === "on";

  if (!title || !formType || !content) {
    return { success: false, error: "Title, type, and content are required" };
  }

  await db
    .update(forms)
    .set({
      title,
      description,
      formType,
      content,
      requiresSignature,
      updatedAt: new Date(),
    })
    .where(eq(forms.id, formId));

  revalidatePath(`/dashboard/${orgId}/forms`);
  revalidatePath(`/dashboard/${orgId}/forms/${formId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// deleteForm
// ---------------------------------------------------------------------------

export async function deleteForm(
  orgId: string,
  formId: string,
): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };

  await requireRole(orgId, userId, "admin");

  // Verify the form belongs to this org
  const [existing] = await db
    .select({ id: forms.id })
    .from(forms)
    .where(and(eq(forms.id, formId), eq(forms.organizationId, orgId)));

  if (!existing) {
    return { success: false, error: "Form not found" };
  }

  await db.delete(forms).where(eq(forms.id, formId));

  revalidatePath(`/dashboard/${orgId}/forms`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Data fetchers
// ---------------------------------------------------------------------------

export async function getFormsWithStats(orgId: string): Promise<FormWithStats[]> {
  const orgForms = await db
    .select()
    .from(forms)
    .where(eq(forms.organizationId, orgId))
    .orderBy(sql`${forms.createdAt} desc`);

  if (orgForms.length === 0) return [];

  const formIds = orgForms.map((f) => f.id);

  // Get assignment counts and completion stats per form
  const assignmentRows = await db
    .select({
      formId: formAssignments.formId,
      assignmentCount: count(),
    })
    .from(formAssignments)
    .where(inArray(formAssignments.formId, formIds))
    .groupBy(formAssignments.formId);

  const completionRows = await db
    .select({
      formId: formAssignments.formId,
      completedCount: count(),
    })
    .from(formSubmissions)
    .innerJoin(formAssignments, eq(formSubmissions.formAssignmentId, formAssignments.id))
    .where(
      and(
        inArray(formAssignments.formId, formIds),
        eq(formSubmissions.status, "completed"),
      ),
    )
    .groupBy(formAssignments.formId);

  const assignmentMap = new Map(assignmentRows.map((r) => [r.formId, Number(r.assignmentCount)]));
  const completionMap = new Map(completionRows.map((r) => [r.formId, Number(r.completedCount)]));

  return orgForms.map((f) => ({
    id: f.id,
    title: f.title,
    description: f.description,
    formType: f.formType,
    content: f.content,
    requiresSignature: f.requiresSignature,
    isActive: f.isActive,
    createdAt: f.createdAt,
    totalAssigned: assignmentMap.get(f.id) ?? 0,
    totalCompleted: completionMap.get(f.id) ?? 0,
  }));
}

export async function getFormDetail(orgId: string, formId: string): Promise<FormDetail | null> {
  const [form] = await db
    .select()
    .from(forms)
    .where(
      and(
        eq(forms.id, formId),
        eq(forms.organizationId, orgId),
      ),
    );

  return form ?? null;
}

export async function getFormAssignments(formId: string): Promise<FormAssignmentRow[]> {
  const assignments = await db
    .select()
    .from(formAssignments)
    .where(eq(formAssignments.formId, formId))
    .orderBy(sql`${formAssignments.createdAt} desc`);

  const rows: FormAssignmentRow[] = [];

  for (const a of assignments) {
    let targetName = "Entire Organization";

    if (a.assignmentType === "team" && a.assignmentTargetId) {
      const [team] = await db
        .select({ name: teams.name })
        .from(teams)
        .where(eq(teams.id, a.assignmentTargetId));
      targetName = team ? `Team: ${team.name}` : "Unknown Team";
    } else if (a.assignmentType === "player" && a.assignmentTargetId) {
      const [player] = await db
        .select({ firstName: players.firstName, lastName: players.lastName })
        .from(players)
        .where(eq(players.id, a.assignmentTargetId));
      targetName = player ? `Player: ${player.firstName} ${player.lastName}` : "Unknown Player";
    }

    rows.push({
      id: a.id,
      assignmentType: a.assignmentType,
      assignmentTargetId: a.assignmentTargetId,
      targetName,
      dueDate: a.dueDate,
      createdAt: a.createdAt,
    });
  }

  return rows;
}

export async function getFormSubmissions(formId: string): Promise<SubmissionRow[]> {
  const rows = await db
    .select({
      id: formSubmissions.id,
      status: formSubmissions.status,
      signatureName: formSubmissions.signatureName,
      signedAt: formSubmissions.signedAt,
      completedAt: formSubmissions.completedAt,
      playerFirstName: players.firstName,
      playerLastName: players.lastName,
      guardianFirstName: guardians.firstName,
      guardianLastName: guardians.lastName,
    })
    .from(formSubmissions)
    .innerJoin(formAssignments, eq(formSubmissions.formAssignmentId, formAssignments.id))
    .innerJoin(players, eq(formSubmissions.playerId, players.id))
    .innerJoin(guardians, eq(formSubmissions.guardianId, guardians.id))
    .where(eq(formAssignments.formId, formId))
    .orderBy(sql`${formSubmissions.createdAt} desc`);

  return rows.map((r) => ({
    id: r.id,
    playerName: `${r.playerFirstName} ${r.playerLastName}`,
    guardianName: `${r.guardianFirstName} ${r.guardianLastName}`,
    status: r.status,
    signatureName: r.signatureName,
    signedAt: r.signedAt,
    completedAt: r.completedAt,
  }));
}

export async function getOrgTeams(orgId: string) {
  return db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.organizationId, orgId))
    .orderBy(sql`${teams.name} asc`);
}

export async function getOrgPlayers(orgId: string) {
  return db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
    })
    .from(players)
    .where(eq(players.organizationId, orgId))
    .orderBy(sql`${players.lastName} asc, ${players.firstName} asc`);
}

/** Get assignments relevant to a guardian (org-wide, their players' teams, their players directly). */
export async function getGuardianAssignments(orgId: string, formId: string, clerkUserId: string) {
  // Find the guardian record for this user in this org
  const [guardian] = await db
    .select()
    .from(guardians)
    .where(
      and(
        eq(guardians.organizationId, orgId),
        eq(guardians.clerkUserId, clerkUserId),
      ),
    );

  if (!guardian) return { guardian: null, assignments: [], playerOptions: [] };

  // Get linked players
  const linkedPlayers = await db
    .select({
      playerId: playerGuardians.playerId,
      playerFirstName: players.firstName,
      playerLastName: players.lastName,
    })
    .from(playerGuardians)
    .innerJoin(players, eq(playerGuardians.playerId, players.id))
    .where(eq(playerGuardians.guardianId, guardian.id));

  const playerIds = linkedPlayers.map((p) => p.playerId);

  // Get team IDs for those players
  const playerTeamRows = playerIds.length > 0
    ? await db
        .select({ teamId: teamPlayers.teamId })
        .from(teamPlayers)
        .where(inArray(teamPlayers.playerId, playerIds))
    : [];
  const teamIds = playerTeamRows.map((r) => r.teamId);

  // Get all assignments for this form
  const allAssignments = await db
    .select()
    .from(formAssignments)
    .where(
      and(
        eq(formAssignments.formId, formId),
        eq(formAssignments.organizationId, orgId),
      ),
    );

  // Filter to relevant assignments
  const relevantAssignments = allAssignments.filter((a) => {
    if (a.assignmentType === "organization") return true;
    if (a.assignmentType === "team" && a.assignmentTargetId && teamIds.includes(a.assignmentTargetId)) return true;
    if (a.assignmentType === "player" && a.assignmentTargetId && playerIds.includes(a.assignmentTargetId)) return true;
    return false;
  });

  // Check which submissions already exist
  const existingSubmissions = relevantAssignments.length > 0
    ? await db
        .select({
          formAssignmentId: formSubmissions.formAssignmentId,
          playerId: formSubmissions.playerId,
        })
        .from(formSubmissions)
        .where(
          and(
            inArray(formSubmissions.formAssignmentId, relevantAssignments.map((a) => a.id)),
            eq(formSubmissions.guardianId, guardian.id),
          ),
        )
    : [];

  const submittedSet = new Set(
    existingSubmissions.map((s) => `${s.formAssignmentId}:${s.playerId}`),
  );

  // Build assignment options for each player
  const assignmentOptions = relevantAssignments
    .filter((a) => {
      // For org/team, need at least one player not yet submitted
      if (a.assignmentType === "organization" || a.assignmentType === "team") {
        return linkedPlayers.some(
          (p) => !submittedSet.has(`${a.id}:${p.playerId}`),
        );
      }
      // For player-specific, check that exact player
      return a.assignmentTargetId && !submittedSet.has(`${a.id}:${a.assignmentTargetId}`);
    });

  // Resolve target names for assignments
  const teamTargetIds = assignmentOptions
    .filter((a) => a.assignmentType === "team" && a.assignmentTargetId)
    .map((a) => a.assignmentTargetId!);

  const playerTargetIds = assignmentOptions
    .filter((a) => a.assignmentType === "player" && a.assignmentTargetId)
    .map((a) => a.assignmentTargetId!);

  const teamNameMap = new Map<string, string>();
  const playerNameMap = new Map<string, string>();

  if (teamTargetIds.length > 0) {
    const teamRows = await db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(inArray(teams.id, teamTargetIds));
    for (const t of teamRows) {
      teamNameMap.set(t.id, t.name);
    }
  }

  if (playerTargetIds.length > 0) {
    const playerRows = await db
      .select({ id: players.id, firstName: players.firstName, lastName: players.lastName })
      .from(players)
      .where(inArray(players.id, playerTargetIds));
    for (const p of playerRows) {
      playerNameMap.set(p.id, `${p.firstName} ${p.lastName}`);
    }
  }

  const assignmentsWithNames = assignmentOptions.map((a) => {
    let targetName = "Organization-wide";
    if (a.assignmentType === "team" && a.assignmentTargetId) {
      targetName = teamNameMap.get(a.assignmentTargetId) ?? "Unknown Team";
    } else if (a.assignmentType === "player" && a.assignmentTargetId) {
      targetName = playerNameMap.get(a.assignmentTargetId) ?? "Unknown Player";
    }
    return {
      id: a.id,
      assignmentType: a.assignmentType,
      assignmentTargetId: a.assignmentTargetId,
      targetName,
    };
  });

  return {
    guardian: { id: guardian.id, firstName: guardian.firstName, lastName: guardian.lastName },
    assignments: assignmentsWithNames,
    playerOptions: linkedPlayers.map((p) => ({
      id: p.playerId,
      name: `${p.playerFirstName} ${p.playerLastName}`,
    })),
    submittedSet: Array.from(submittedSet),
  };
}
