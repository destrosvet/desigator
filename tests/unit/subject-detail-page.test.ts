import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), detail: vi.fn(), classes: vi.fn(), redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/subject-detail", () => ({ readSubjectDetail: m.detail }));
vi.mock("@/lib/db", () => ({ db: { class: { findMany: m.classes } } }));
vi.mock("next/navigation", () => ({ redirect: m.redirect, notFound: m.notFound }));
vi.mock("@/app/[locale]/subjects/[id]/subject-detail-client", () => ({ default: () => null }));
import Page from "@/app/[locale]/subjects/[id]/page";
const user = { id: "owner", role: "TEACHER", organizationId: "home" };
const subject = { id: "subject", canManage: true, classes: [{ class: { id: "class", name: "Class" } }], assignedEvaluators: [{ id: "external", name: "External" }] };
const params = Promise.resolve({ id: "subject", locale: "cs" });
describe("subject server page", () => {
  beforeEach(() => { vi.resetAllMocks(); m.session.mockResolvedValue({ user }); m.detail.mockResolvedValue(subject); m.classes.mockResolvedValue([{ id: "class", name: "Class" }]); m.redirect.mockImplementation(() => { throw new Error("redirect"); }); m.notFound.mockImplementation(() => { throw new Error("notFound"); }); });
  it("supplies initial details and reviewers with one auth call and minimal class options", async () => {
    const page = await Page({ params });
    expect(m.session).toHaveBeenCalledTimes(1); expect(m.detail).toHaveBeenCalledWith(user, "subject");
    expect(page.props.initialSubject.assignedEvaluators).toEqual(subject.assignedEvaluators);
    expect(m.classes).toHaveBeenCalledWith({ where: { organizationId: "home", teacherId: "owner" }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  });
  it("does not load editable class options for a read-only viewer", async () => {
    m.detail.mockResolvedValue({ ...subject, canManage: false, assignedEvaluators: [] });
    const page = await Page({ params }); expect(m.classes).not.toHaveBeenCalled(); expect(page.props.classes).toEqual(subject.classes.map(link => link.class));
  });
  it("redirects unauthenticated visitors without fetching data", async () => {
    m.session.mockResolvedValue(null); await expect(Page({ params })).rejects.toThrow("redirect"); expect(m.detail).not.toHaveBeenCalled(); expect(m.redirect).toHaveBeenCalledWith("/cs/auth/login");
  });
  it("returns not found for an inaccessible subject before loading options", async () => {
    m.detail.mockResolvedValue(null); await expect(Page({ params })).rejects.toThrow("notFound"); expect(m.classes).not.toHaveBeenCalled();
  });
});
