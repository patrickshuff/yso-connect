import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "./route";
import { NextResponse, type NextRequest } from "next/server";

const {
  selectMock,
  selectWhereMock,
  updateMock,
  updateSetMock,
  deleteMock,
  returningMock,
  getAuthUserIdMock,
  requireOrgRoleMock,
  getMembershipMock,
  organizationsTable,
} = vi.hoisted(() => {
  const returningMock = vi.fn();
  
  const selectWhereMock = vi.fn();
  const selectFromMock = vi.fn(() => ({ where: selectWhereMock }));
  const selectMock = vi.fn(() => ({ from: selectFromMock }));

  const updateWhereMock = vi.fn(() => ({ returning: returningMock }));
  const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
  const updateMock = vi.fn(() => ({ set: updateSetMock }));

  const deleteWhereMock = vi.fn(() => ({ returning: returningMock }));
  const deleteMock = vi.fn(() => ({ where: deleteWhereMock }));

  const getAuthUserIdMock = vi.fn();
  const requireOrgRoleMock = vi.fn();
  const getMembershipMock = vi.fn();

  const organizationsTable = {
    id: "organizations.id",
    name: "organizations.name",
  };

  return {
    selectMock,
    selectFromMock,
    selectWhereMock,
    updateMock,
    updateSetMock,
    updateWhereMock,
    deleteMock,
    deleteWhereMock,
    returningMock,
    getAuthUserIdMock,
    requireOrgRoleMock,
    getMembershipMock,
    organizationsTable,
  };
});

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    update: updateMock,
    delete: deleteMock,
  },
}));

vi.mock("@/db/schema", () => ({
  organizations: organizationsTable,
}));

vi.mock("@/lib/auth", () => ({
  getAuthUserId: getAuthUserIdMock,
  requireOrgRole: requireOrgRoleMock,
}));

vi.mock("@/lib/memberships", () => ({
  getMembership: getMembershipMock,
}));

function makeRequest(method: string, body?: unknown): Request {
  return new Request("http://localhost/api/organizations/org_1", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const params = Promise.resolve({ orgId: "org_1" });

describe("GET /api/organizations/[orgId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns organization details if member", async () => {
    getAuthUserIdMock.mockResolvedValue({ userId: "user_1" });
    getMembershipMock.mockResolvedValue({ role: "admin" });
    selectWhereMock.mockResolvedValue([{ id: "org_1", name: "Acme Soccer" }]);

    const res = await GET(makeRequest("GET") as unknown as NextRequest, { params });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: "org_1", name: "Acme Soccer" });
  });

  it("returns 404 if not a member", async () => {
    getAuthUserIdMock.mockResolvedValue({ userId: "user_1" });
    getMembershipMock.mockResolvedValue(null);

    const res = await GET(makeRequest("GET") as unknown as NextRequest, { params });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/organizations/[orgId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates organization if admin", async () => {
    requireOrgRoleMock.mockResolvedValue({ membership: { role: "admin" } });
    returningMock.mockResolvedValue([{ id: "org_1", name: "New Name" }]);

    const res = await PATCH(makeRequest("PATCH", { name: "New Name" }) as unknown as NextRequest, { params });

    expect(res.status).toBe(200);
    expect(updateSetMock).toHaveBeenCalledWith(expect.objectContaining({ name: "New Name" }));
  });

  it("returns error if role check fails", async () => {
    requireOrgRoleMock.mockResolvedValue({
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const res = await PATCH(makeRequest("PATCH", { name: "New Name" }) as unknown as NextRequest, { params });

    expect(res.status).toBe(403);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/organizations/[orgId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes organization if owner", async () => {
    requireOrgRoleMock.mockResolvedValue({ membership: { role: "owner" } });
    returningMock.mockResolvedValue([{ id: "org_1" }]);

    const res = await DELETE(makeRequest("DELETE") as unknown as NextRequest, { params });

    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledWith(organizationsTable);
  });

  it("returns error if role check fails (e.g. only admin, not owner)", async () => {
    requireOrgRoleMock.mockResolvedValue({
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const res = await DELETE(makeRequest("DELETE") as unknown as NextRequest, { params });

    expect(res.status).toBe(403);
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
