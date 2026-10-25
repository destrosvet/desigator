import {describe,it,expect} from "vitest";
import {finalGrade,publishedAverage} from "@/lib/public-results-grade";
describe("point-based ECTS grade calculation",()=>{
 it.each([[0,"F"],[49,"F"],[49.99,"F"],[50,"E"],[59.99,"E"],[60,"D"],[69.99,"D"],[70,"C"],[79.99,"C"],[80,"B"],[89,"B"],[89.99,"B"],[90,"A"],[100,"A"]])("grades %s as %s",(points,grade)=>expect(finalGrade(points as number,100)).toBe(grade));
 it("supports non-100 maxima and no available points",()=>{expect(finalGrade(45,50)).toBe("A");expect(finalGrade(44.5,50)).toBe("B");expect(finalGrade(0,0)).toBeNull();});
 it("averages evaluators rather than adding their points",()=>expect(publishedAverage([{status:"COMPLETED",totalPoints:60},{status:"COMPLETED",totalPoints:80}],100)).toBe(70));
 it("keeps completed zero and hides incomplete or invalid reviews",()=>{expect(publishedAverage([{status:"COMPLETED",totalPoints:0}],100)).toBe(0);for(const reviews of [[],[{status:"PENDING",totalPoints:50}],[{status:"COMPLETED",totalPoints:null}],[{status:"COMPLETED",totalPoints:101}]])expect(publishedAverage(reviews,100)).toBeNull();});
});
