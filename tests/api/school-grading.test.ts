import {describe,it,expect,vi,beforeEach} from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),find:vi.fn(),update:vi.fn()}));
vi.mock("next-auth",()=>({getServerSession:m.session}));vi.mock("@/lib/auth",()=>({authOptions:{}}));vi.mock("@/lib/db",()=>({db:{organization:{findUnique:m.find,update:m.update}}}));
import {PATCH} from "@/app/api/organization/grading/route";
const scale={type:"NUMERIC",thresholds:[90,75,60,50]};
const request=(query="",body:unknown=scale)=>PATCH(new Request("http://localhost/api/organization/grading"+query,{method:"PATCH",body:JSON.stringify(body)}));
describe("school grading administration",()=>{
 beforeEach(()=>{vi.resetAllMocks();m.find.mockResolvedValue({id:"school"});m.session.mockResolvedValue({user:{id:"admin",role:"TEACHER",roles:["SCHOOL_ADMIN","TEACHER"],organizationId:"school"}});});
 it("requires authentication",async()=>{m.session.mockResolvedValue(null);expect((await request()).status).toBe(401);});
 it.each(["TEACHER","STUDENT","EVALUATOR"])("rejects %s without school admin rights",async role=>{m.session.mockResolvedValue({user:{id:"user",role,roles:[role],organizationId:"school"}});expect((await request()).status).toBe(403);expect(m.update).not.toHaveBeenCalled();});
 it("cannot modify another school's settings",async()=>{expect((await request("?organizationId=foreign")).status).toBe(403);expect(m.update).not.toHaveBeenCalled();});
 it("allows own school admin and platform admin targeting a school",async()=>{expect((await request()).status).toBe(200);expect(m.update).toHaveBeenLastCalledWith({where:{id:"school"},data:{gradingScale:scale}});m.session.mockResolvedValue({user:{id:"platform",role:"ADMIN",roles:["ADMIN"],organizationId:null}});expect((await request("?organizationId=target")).status).toBe(200);expect(m.update).toHaveBeenLastCalledWith({where:{id:"target"},data:{gradingScale:scale}});});
 it("rejects unordered thresholds and spoofed school IDs",async()=>{expect((await request("",{...scale,thresholds:[90,95,60,50]})).status).toBe(400);expect((await request("",{...scale,organizationId:"foreign"})).status).toBe(400);expect(m.update).not.toHaveBeenCalled();});
});
