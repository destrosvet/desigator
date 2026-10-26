import { readFileSync } from 'node:fs';
import { parseLegacySql } from '../src/lib/legacy-sql';
const tables = parseLegacySql(readFileSync('db/desigator-export.sql','utf8'));
const frequency = (values: (string | null)[]) => Object.fromEntries([...new Set(values)].map(v=>[String(v),values.filter(x=>x===v).length]));
const taskIds = new Set(tables.dg_course_task.map(r=>r.id_task));
console.log(JSON.stringify({ counts:Object.fromEntries(Object.entries(tables).map(([k,v])=>[k,v.length])), points:frequency(tables.dg_mark.map(r=>r.mark)), maxPoints:frequency(tables.dg_task.map(r=>r.task_points)), unmappedTasks:tables.dg_task.filter(r=>!taskIds.has(r.task_id)).map(r=>r.task_id), unmappedRatings:tables.dg_mark.filter(r=>!taskIds.has(r.id_task)).length, years:frequency(tables.dg_course.map(r=>r.course_year)) },null,2));