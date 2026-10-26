import { describe,it,expect,vi } from 'vitest';
vi.mock('@/lib/db',()=>({db:{}}));
import { summarizeRatings, percentage, type StatisticRating } from '@/lib/statistics-summary';
import { historicalCourseScope } from '@/lib/statistics';
const row=(changes:Partial<StatisticRating>={}):StatisticRating=>({id:'1',source:'historical',workId:'w',studentId:'s',evaluatorId:'e',evaluatorName:'Judge',subjectId:'c',subjectName:'Course',organizationId:'school-a',organizationName:'School',year:2013,points:5,maxPoints:10,...changes});
describe('rating statistics',()=>{
 it('normalizes different score scales and keeps zero scores',()=>{const stats=summarizeRatings([row(),row({id:'2',points:50,maxPoints:100}),row({id:'3',points:0,maxPoints:10})]);expect(stats.averagePercent).toBe(33.3);expect(stats.normalizedRatings).toBe(3);expect(stats.ratings).toBe(3);expect(stats.works).toBe(1);});
 it('does not silently include unknown or impossible scales in averages',()=>{const stats=summarizeRatings([row(),row({maxPoints:0}),row({maxPoints:null}),row({points:11}),row({points:-1})]);expect(stats.ratings).toBe(5);expect(stats.excludedFromAverage).toBe(4);expect(stats.averagePercent).toBe(50);});
 it('counts each evaluator rating separately without fabricating a final student grade',()=>{const stats=summarizeRatings([row(),row({id:'2',evaluatorId:'other',points:9})]);expect(stats.ratings).toBe(2);expect(stats.works).toBe(1);expect(stats.evaluators).toBe(2);expect(stats.averagePercent).toBe(70);});
 it('retains unknown years as a separate group and has no empty-data average',()=>{expect(summarizeRatings([row({year:null})]).years[0].name).toBe('Neuvedený rok');expect(summarizeRatings([]).averagePercent).toBeNull();});
 it('places histogram boundaries exactly once',()=>{const stats=summarizeRatings([0,20,40,60,80,100].map(points=>row({points,maxPoints:100})));expect(stats.distribution.map(b=>b.count)).toEqual([1,1,1,1,2]);expect(percentage(row({points:10}))).toBe(100);});
 it('restricts teachers to their own archived courses inside their school',()=>{expect(historicalCourseScope({id:'teacher',role:'TEACHER',roles:['TEACHER'],organizationId:'a'})).toEqual({teacherId:'teacher',import:{organizationId:'a'}});expect(historicalCourseScope({id:'schooladmin',role:'TEACHER',roles:['SCHOOL_ADMIN'],organizationId:'a'})).toEqual({import:{organizationId:'a'}});expect(historicalCourseScope({id:'e',role:'EVALUATOR'})).toEqual({id:{in:[]}});});
});
