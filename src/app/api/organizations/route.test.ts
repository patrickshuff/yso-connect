import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST, GET } from "./route";
import { NextResponse, type NextRequest } from "next/server";

const {
  insertValuesMock,
  insertMock,
  returningMock,
  getAuthUserIdMock,
  createMembershipMock,
  getUserOrganizationsMock,
  organizationsTable,
} = vi.hoisted(() => {
  const returningMock = vi.fn();
  const insertValuesMock = vi.fn(() => ({ returning: returningMock }));
  const insertMock = vi.fn(() => ({ values: insertValuesMock }));
  
  const selectWhereMock = vi.fn();
  const selectFromMock = vi.fn(() => ({ where: selectWhereMock }));
  const selectMock = vi.fn(() => ({ from: selectFromMock }));

  const getAuthUserIdMock = vi.fn();
  const createMembershipMock = vi.fn();
  const getUserOrganizationsMock = vi.fn();

  const organizationsTable = {
    id: "organizations.id",
    name: "organizations.name",
    slug: "organizations.slug",
  };

  return {
    insertValuesMock,
    insertMock,
    returningMock,
    selectMock,
    selectFromMock,
    selectWhereMock,
    getAuthUserIdMock,
    createMembershipMock,
    getUserOrganizationsMock,
    organizationsTable,
  };
});

vi.mock("@/db", () => ({
  db: {
    insert: insertMock,
    // select not used in this route actually, but kept for consistency if needed
  },
}));

vi.mock("@/db/schema", () => ({
  organizations: organizationsTable,
}));

vi.mock("@/lib/auth", () => ({
  getAuthUserId: getAuthUserIdMock,
}));

vi.mock("@/lib/memberships", () => ({
  createMembership: createMembershipMock,
  getUserOrganizations: getUserOrganizationsMock,
}));

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/organizations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/organizations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an organization and its owner membership", async () => {
    getAuthUserIdMock.mockResolvedValue({ userId: "user_1" });
    returningMock.mockResolvedValue([{ id: "org_1", name: "Acme Soccer", slug: "acme-soccer" }]);
    createMembershipMock.mockResolvedValue({ id: "mem_1" });

    const req = makePostRequest({ name: "Acme Soccer", slug: "acme-soccer" });
    const res = await POST(req as unknown as NextRequest);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ id: "org_1", name: "Acme Soccer", slug: "acme-soccer" });
    
    expect(insertMock).toHaveBeenCalledWith(organizationsTable);
    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
      name: "Acme Soccer",
      slug: "acme-soccer",
    }));
    expect(createMembershipMock).toHaveBeenCalledWith("org_1", "user_1", "owner");
  });

  it("returns 401 if unauthorized", async () => {
    getAuthUserIdMock.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = makePostRequest({ name: "Acme Soccer", slug: "acme-soccer" });
    const res = await POST(req as unknown as NextRequest);

    expect(res.status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns 400 if name or slug is missing", async () => {
    getAuthUserIdMock.mockResolvedValue({ userId: "user_1" });

    const req = makePostRequest({ name: "Acme Soccer" }); // missing slug
    const res = await POST(req as unknown as NextRequest);

    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/organizations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns list of organizations for authenticated user", async () => {
    getAuthUserIdMock.mockResolvedValue({ userId: "user_1" });
    getUserOrganizationsMock.mockResolvedValue([
      { id: "org_1", name: "Acme Soccer", role: "owner" },
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toEqual({ id: "org_1", name: "Acme Soccer", role: "owner" });
    expect(getUserOrganizationsMock).toHaveBeenCalledWith("user_1");
  });

  it("returns 401 if unauthorized", async () => {
    getAuthUserIdMock.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(getUserOrganizationsMock).not.toHaveBeenCalled();
  });
});
