import {describe,it,expect} from "vitest";
import {gradingScaleSchema,numericGradingScale,parseGradingScale,defaultGradingScale} from "@/lib/grading-scale";
import {finalGrade} from "@/lib/public-results-grade";
describe("school grading scales",()=>{
 it("defaults to ECTS and rejects corrupt stored configuration",()=>expect(parseGradingScale({type:"NUMERIC",thresholds:[50,90]})).toEqual(defaultGradingScale));
 it.each([[90,"1"],[89.99,"2"],[75,"2"],[60,"3"],[50,"4"],[49.99,"5"],[0,"5"]])("converts %s to numeric grade %s",(points,grade)=>expect(finalGrade(points as number,100,numericGradingScale())).toBe(grade));
 it("uses a school's custom boundaries with arbitrary task maxima",()=>{const scale={type:"NUMERIC" as const,thresholds:[85,70,55,40]};expect(finalGrade(42.5,50,scale)).toBe("1");expect(finalGrade(20,50,scale)).toBe("4");});
 it.each([{type:"ECTS",thresholds:[90,80,70,60]},{type:"NUMERIC",thresholds:[90,80,70,60,50]},{type:"NUMERIC",thresholds:[90,90,60,50]},{type:"NUMERIC",thresholds:[80,90,60,50]},{type:"NUMERIC",thresholds:[101,75,60,50]},{type:"NUMERIC",thresholds:[90,75,60,-1]},{type:"UNKNOWN",thresholds:[90,75,60,50]}])("rejects invalid configuration %j",scale=>expect(gradingScaleSchema.safeParse(scale).success).toBe(false));
});
