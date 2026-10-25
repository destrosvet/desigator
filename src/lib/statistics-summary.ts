export type StatisticRating = {
 id: string; source: "current" | "historical"; workId: string; studentId: string; evaluatorId: string; evaluatorName: string;
 subjectId: string; subjectName: string; organizationId: string; organizationName: string; year: number | null; points: number; maxPoints: number | null;
};
export function percentage(row: StatisticRating): number | null {
 return row.maxPoints !== null && row.maxPoints > 0 && row.points >= 0 && row.points <= row.maxPoints ? row.points / row.maxPoints * 100 : null;
}
const mean = (values: number[]) => values.length ? Math.round(values.reduce((sum,v)=>sum+v,0)/values.length*10)/10 : null;
export function summarizeRatings(rows: StatisticRating[]) {
 const values = rows.map(percentage).filter((v): v is number=>v!==null);
 const group = (key: (r: StatisticRating)=>string, label: (r: StatisticRating)=>string) => {
  const map = new Map<string,{id:string;name:string;ratings:number;works:Set<string>;values:number[]}>();
  for(const row of rows) {const id=key(row);const item=map.get(id)||{id,name:label(row),ratings:0,works:new Set<string>(),values:[]};item.ratings++;item.works.add(row.workId);const value=percentage(row);if(value!==null)item.values.push(value);map.set(id,item);}
  return [...map.values()].map(item=>({id:item.id,name:item.name,ratings:item.ratings,works:item.works.size,averagePercent:mean(item.values)}));
 };
 const distribution = Array.from({length:5},(_,i)=>({label:i===4?"80–100 %":i*20+"–<"+(i+1)*20+" %",count:values.filter(v=>v>=i*20&&(i===4?v<=100:v<(i+1)*20)).length}));
 return { ratings:rows.length, works:new Set(rows.map(r=>r.workId)).size, students:new Set(rows.map(r=>r.studentId)).size, evaluators:new Set(rows.map(r=>r.evaluatorId)).size,
  averagePercent:mean(values), normalizedRatings:values.length, excludedFromAverage:rows.length-values.length,
  historicalRatings:rows.filter(r=>r.source==='historical').length,currentRatings:rows.filter(r=>r.source==='current').length,distribution,
  subjects:group(r=>r.subjectId,r=>r.subjectName).sort((a,b)=>b.ratings-a.ratings),years:group(r=>String(r.year??'unknown'),r=>r.year===null?'Neuvedený rok':String(r.year)).sort((a,b)=>a.id.localeCompare(b.id)),
  evaluatorsSummary:group(r=>r.evaluatorId,r=>r.evaluatorName).sort((a,b)=>b.ratings-a.ratings),organizations:group(r=>r.organizationId,r=>r.organizationName).sort((a,b)=>b.ratings-a.ratings) };
}
