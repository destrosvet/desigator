import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseLegacySql } from '@/lib/legacy-sql';
describe('historical SQL data parser',()=>{
 it('reads the real dump without losing tasks to parentheses or semicolons in descriptions',()=>{const data=parseLegacySql(readFileSync('db/desigator-export.sql','utf8'));expect(data.dg_mark).toHaveLength(10328);expect(data.dg_task).toHaveLength(140);expect(data.dg_course).toHaveLength(49);expect(data.dg_user).toHaveLength(476);expect(new Set(data.dg_task.map(t=>t.task_id)).size).toBe(140);});
 it('rejects incomplete or unrecognized SQL values without executing SQL',()=>{expect(()=>parseLegacySql("INSERT INTO "+String.fromCharCode(96)+"dg_mark"+String.fromCharCode(96)+" (id) VALUES (NOW());")).toThrow();expect(()=>parseLegacySql('DROP TABLE users;')).toThrow();});
});
