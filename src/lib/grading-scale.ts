import {z} from "zod";
export const gradingScaleSchema=z.object({type:z.enum(["ECTS","NUMERIC"]),thresholds:z.array(z.number().finite().min(0).max(100)).min(4).max(5)}).strict().superRefine((scale,ctx)=>{
 if(scale.thresholds.length!==(scale.type==="ECTS"?5:4))ctx.addIssue({code:"custom",message:"Invalid number of grade boundaries"});
 if(scale.thresholds.some((n,i)=>i>0&&n>=scale.thresholds[i-1]))ctx.addIssue({code:"custom",message:"Boundaries must strictly decrease"});
});
export type GradingScale=z.infer<typeof gradingScaleSchema>;
export const defaultGradingScale:GradingScale={type:"ECTS",thresholds:[90,80,70,60,50]};
export function numericGradingScale():GradingScale{return {type:"NUMERIC",thresholds:[90,75,60,50]};}
export function parseGradingScale(value:unknown):GradingScale{const parsed=gradingScaleSchema.safeParse(value);return parsed.success?parsed.data:defaultGradingScale;}
export function gradeLabels(scale:GradingScale):string[]{return scale.type==="ECTS"?["A","B","C","D","E","F"]:["1","2","3","4","5"];}
