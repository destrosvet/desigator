import {describe,it,expect} from "vitest";
import {parseAdjustmentCents,adjustedTotal,gradeDistance,studentVisibleAdjustments} from "@/lib/result-adjustments";
import {defaultGradingScale,numericGradingScale} from "@/lib/grading-scale";
import {finalGrade} from "@/lib/public-results-grade";
describe("decimal point adjustments",()=>{
 it.each([["0,2",20],["+0.20",20],["-0,20",-20],["10000",1000000]])("parses %s exactly",(input,cents)=>expect(parseAdjustmentCents(input as string)).toBe(cents));
 it.each(["0","0.00","0.001","1e2","NaN","10001","1,2,3",""])("rejects %s",value=>expect(parseAdjustmentCents(value)).toBeNull());
 it("adds 0.20 exactly at the A boundary",()=>{const total=adjustedTotal(89.8,[{amountCents:20}]);expect(total).toBe(90);expect(finalGrade(total,100)).toBe("A");expect(gradeDistance(89.8,100,defaultGradingScale).better).toEqual({grade:"A",points:0.2,threshold:90});expect(gradeDistance(90,100,defaultGradingScale).worse).toEqual({grade:"B",points:0,threshold:90});});
 it("handles arbitrary maxima and numeric grade thresholds",()=>{expect(gradeDistance(44.8,50,defaultGradingScale).better?.points).toBe(0.2);expect(gradeDistance(74.8,100,numericGradingScale()).better).toEqual({grade:"2",points:0.2,threshold:75});expect(gradeDistance(0,0,defaultGradingScale)).toEqual({better:null,worse:null});});
 it("never includes hidden or revoked reasons in the authenticated student projection",()=>{expect(studentVisibleAdjustments([{amountCents:20,reason:"hidden",visibleToStudent:false,revokedAt:null},{amountCents:30,reason:"revoked",visibleToStudent:true,revokedAt:new Date()},{amountCents:40,reason:"visible",visibleToStudent:true,revokedAt:null}])).toEqual([{points:0.4,reason:"visible"}]);});
});
