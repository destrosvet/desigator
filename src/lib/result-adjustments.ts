import {gradeLabels,type GradingScale} from "@/lib/grading-scale";
import {finalGrade} from "@/lib/public-results-grade";
export function parseAdjustmentCents(value:string):number|null {
 const normalized=value.trim().replace(",",".");if(!/^[+-]?\d{1,5}(?:\.\d{1,2})?$/.test(normalized))return null;
 const negative=normalized.startsWith("-"),[whole,fraction=""]=normalized.replace(/^[+-]/,"").split(".");
 const cents=(Number(whole)*100+Number(fraction.padEnd(2,"0")))*(negative?-1:1);
 return cents!==0&&Math.abs(cents)<=1000000?cents:null;
}
export function adjustedTotal(base:number,adjustments:{amountCents:number}[]):number{return (Math.round(base*100)+adjustments.reduce((sum,a)=>sum+a.amountCents,0))/100;}
export function gradeDistance(points:number,maximum:number,scale:GradingScale){
 if(maximum<=0)return {better:null,worse:null};
 const labels=gradeLabels(scale),grade=finalGrade(points,maximum,scale)!,index=labels.indexOf(grade),cents=Math.round(points*100);
 const boundary=(i:number)=>Math.ceil((maximum*scale.thresholds[i]-1e-8));
 return {better:index>0?{grade:labels[index-1],points:Math.max(0,boundary(index-1)-cents)/100,threshold:boundary(index-1)/100}:null,worse:index<labels.length-1?{grade:labels[index+1],points:Math.max(0,cents-boundary(index))/100,threshold:boundary(index)/100}:null};
}
export function studentVisibleAdjustments(adjustments:{amountCents:number;reason:string;visibleToStudent:boolean;revokedAt:Date|null}[]){return adjustments.filter(a=>!a.revokedAt&&a.visibleToStudent).map(a=>({points:a.amountCents/100,reason:a.reason}));}
