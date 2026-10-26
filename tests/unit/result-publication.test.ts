import { describe, expect, it, vi } from "vitest";
import { resultPublicationBlock } from "@/lib/result-publication-policy";
import { lockedPublicationDate, requireUnpublishedResults } from "@/lib/result-publication";
import { draftFromWork, type ReviewWork } from "@/lib/review-workspace";
vi.mock("@/lib/db",()=>({db:{}}));
import { evaluationScope } from "@/lib/evaluations";
describe("result publication policy",()=>{
 it("restricts student evaluation lists and direct links to published own final work in their school",()=>{const scope=evaluationScope({id:"student",role:"STUDENT",organizationId:"school"});expect(scope.OR).toContainEqual({status:"COMPLETED",submission:{studentId:"student",stage:"FINAL",resultsPublishedAt:{not:null},task:{status:{in:["PUBLISHED","CLOSED"]},subject:{classes:{some:{class:{organizationId:"school",students:{some:{studentId:"student"}}}}}}}}});});
 it("accepts completed zero scores and multiple separate reviews",()=>{expect(resultPublicationBlock("FINAL",[{status:"COMPLETED",totalPoints:0},{status:"COMPLETED",totalPoints:80}],100)).toBeNull();});
 it.each([null,-1,101,1.5])("rejects invalid or missing totals: %s",points=>{expect(resultPublicationBlock("FINAL",[{status:"COMPLETED",totalPoints:points}],100)).toBe("incomplete");});
 it("blocks writes to published submissions after taking the row lock",async()=>{const tx={$queryRaw:async()=>[{resultsPublishedAt:new Date()}]};await expect(requireUnpublishedResults(tx as never,"work")).rejects.toThrow(/zveřejněné/);expect(await lockedPublicationDate(tx as never,"work")).toBeInstanceOf(Date);});
 it("keeps unpublished submissions editable",async()=>{const tx={$queryRaw:async()=>[{resultsPublishedAt:null}]};await expect(requireUnpublishedResults(tx as never,"work")).resolves.toBeUndefined();});
 it("carries publication state into the grading draft on every student switch",()=>{const base={id:"review",status:"COMPLETED",totalPoints:50,feedback:null,evaluator:{name:"Teacher"},scores:[],submission:{student:{name:"Student",email:"test@example.cz"},attachments:[],content:null,task:{id:"task",title:"Task",description:null,instructions:null,maxPoints:100,criteria:[]}}} satisfies ReviewWork;expect(draftFromWork(base).readOnly).toBe(false);expect(draftFromWork({...base,submission:{...base.submission,resultsPublishedAt:new Date().toISOString()}}).readOnly).toBe(true);});
});
