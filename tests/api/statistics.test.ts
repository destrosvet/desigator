import { beforeEach,describe,it,expect,vi } from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),statistics:vi.fn(),course:vi.fn(),teacher:vi.fn(),update:vi.fn()}));
vi.mock('next-auth',()=>({getServerSession:m.session}));vi.mock('@/lib/auth',()=>({authOptions:{}}));
vi.mock('@/lib/db',()=>({db:{historicalCourse:{findFirst:m.course,update:m.update},user:{findFirst:m.teacher}}}));
vi.mock('@/lib/statistics',async importOriginal=>({...await importOriginal<typeof import('@/lib/statistics')>(),getStatistics:m.statistics}));
import { GET } from '@/app/api/statistics/route';
import { PATCH } from '@/app/api/statistics/archive-courses/[id]/route';
const teacher={id:'t',role:'TEACHER',roles:['TEACHER'],organizationId:'a'};
const req=(query='')=>new Request('http://localhost/api/statistics'+query);
describe('statistics API boundaries',()=>{
 beforeEach(()=>{vi.resetAllMocks();m.session.mockResolvedValue({user:teacher});m.statistics.mockResolvedValue({summary:{ratings:0}});});
 it.each(['STUDENT','EVALUATOR'])('does not expose aggregate data to %s',async role=>{m.session.mockResolvedValue({user:{id:'x',role,roles:[role],organizationId:'a'}});expect((await GET(req())).status).toBe(403);expect(m.statistics).not.toHaveBeenCalled();});
 it('rejects a teacher requesting another school before any data is read',async()=>{expect((await GET(req('?organizationId=b'))).status).toBe(403);expect(m.statistics).not.toHaveBeenCalled();});
 it('validates filters and returns private teacher scoped results',async()=>{expect((await GET(req('?source=bad'))).status).toBe(400);const response=await GET(req('?source=historical'));expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toBe('no-store');expect(m.statistics).toHaveBeenCalledWith(teacher,expect.objectContaining({source:'historical'}));});
 it('does not let teachers assign archived course ownership',async()=>{expect((await PATCH(new Request('http://localhost',{method:'PATCH',body:JSON.stringify({teacherId:'x'})}),{params:Promise.resolve({id:'course'})})).status).toBe(403);expect(m.update).not.toHaveBeenCalled();});
 it('requires assigned teachers to belong to the archive school',async()=>{m.session.mockResolvedValue({user:{id:'admin',role:'ADMIN',roles:['ADMIN']}});m.course.mockResolvedValue({id:'course',import:{organizationId:'a'}});m.teacher.mockResolvedValue(null);expect((await PATCH(new Request('http://localhost',{method:'PATCH',body:JSON.stringify({teacherId:'foreign'})}),{params:Promise.resolve({id:'course'})})).status).toBe(400);expect(m.teacher).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({organizationId:'a',id:'foreign'})}));expect(m.update).not.toHaveBeenCalled();});
});
