import { beforeEach, describe, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),manage:vi.fn(),lookup:vi.fn(),transaction:vi.fn(),lock:vi.fn(),current:vi.fn(),update:vi.fn()}));
vi.mock("next-auth",()=>({getServerSession:m.session}));vi.mock("@/lib/auth",()=>({authOptions:{}}));vi.mock("@/lib/authorization",()=>({canManageTask:m.manage}));
vi.mock("@/lib/db",()=>({db:{submission:{findUnique:m.lookup},$transaction:m.transaction}}));
import { PATCH } from "@/app/api/submissions/[id]/publication/route";
const complete={status:"COMPLETED",totalPoints:0};
const work={stage:"FINAL",resultsPublishedAt:null,resultsPublishedById:null,task:{status:"PUBLISHED",maxPoints:100},evaluations:[complete]};
function request(body:unknown={published:true}){return PATCH(new Request("http://localhost/api/submissions/work/publication",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),{params:Promise.resolve({id:"work"})});}
describe("explicit result publication",()=>{
 beforeEach(()=>{vi.resetAllMocks();m.session.mockResolvedValue({user:{id:"teacher",role:"TEACHER"}});m.manage.mockResolvedValue(true);m.lookup.mockResolvedValue({taskId:"task"});m.current.mockResolvedValue(work);m.lock.mockResolvedValue([{resultsPublishedAt:null}]);m.update.mockResolvedValue({resultsPublishedAt:new Date(),resultsPublishedById:"teacher"});m.transaction.mockImplementation(async run=>run({$queryRaw:m.lock,submission:{findUnique:m.current,update:m.update}}));});
 it("requires authentication",async()=>{m.session.mockResolvedValue(null);expect((await request()).status).toBe(401);expect(m.lookup).not.toHaveBeenCalled();});
 it.each(["STUDENT","EVALUATOR","TEACHER"])("rejects a %s without ownership, including foreign teachers",async role=>{m.session.mockResolvedValue({user:{id:"other",role}});m.manage.mockResolvedValue(false);expect((await request()).status).toBe(403);expect(m.transaction).not.toHaveBeenCalled();});
 it.each([{published:"true"},{published:true,resultsPublishedById:"other"},{}])("rejects malformed or spoofed publication input: %j",async body=>{expect((await request(body)).status).toBe(400);expect(m.transaction).not.toHaveBeenCalled();});
 it.each([
  [{...work,stage:"WIP"},"notFinal"],
  [{...work,evaluations:[]},"noReviews"],
  [{...work,evaluations:[complete,{status:"IN_PROGRESS",totalPoints:50}]},"incomplete"],
  [{...work,evaluations:[{status:"COMPLETED",totalPoints:null}]},"incomplete"],
  [{...work,task:{status:"DRAFT",maxPoints:100}},"draftTask"],
 ])("refuses ineligible publication",async(current,error)=>{m.current.mockResolvedValue(current);const response=await request();expect(response.status).toBe(409);expect((await response.json()).error).toBe(error);expect(m.update).not.toHaveBeenCalled();});
 it("publishes an explicitly completed zero and records the acting teacher",async()=>{const response=await request();expect(response.status).toBe(200);expect(response.headers.get("Cache-Control")).toBe("no-store");expect(m.lock).toHaveBeenCalledOnce();expect(m.update).toHaveBeenCalledWith({where:{id:"work"},data:{resultsPublishedAt:expect.any(Date),resultsPublishedById:"teacher"},select:{resultsPublishedAt:true,resultsPublishedById:true}});});
 it("is idempotent and preserves the original publication timestamp",async()=>{const date=new Date("2026-10-21T12:00:00Z");m.current.mockResolvedValue({...work,resultsPublishedAt:date,resultsPublishedById:"first-teacher"});const response=await request();expect((await response.json()).publication.resultsPublishedAt).toBe(date.toISOString());expect(m.update).not.toHaveBeenCalled();});
 it("withdraws without deleting or modifying any scores",async()=>{m.current.mockResolvedValue({...work,resultsPublishedAt:new Date(),resultsPublishedById:"teacher"});expect((await request({published:false})).status).toBe(200);expect(m.update).toHaveBeenCalledWith({where:{id:"work"},data:{resultsPublishedAt:null,resultsPublishedById:null},select:{resultsPublishedAt:true,resultsPublishedById:true}});});
});
