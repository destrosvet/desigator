import { describe,it,expect } from 'vitest';
import { parseLegacySql } from '@/lib/legacy-sql';

const representativeDump = `
INSERT INTO \`dg_user\` (\`user_id\`, \`name\`) VALUES
  (1, 'Student');
INSERT INTO \`dg_course\` (\`course_id\`, \`course_name\`) VALUES
  (2, 'Ateliér');
INSERT INTO \`dg_task\` (\`task_id\`, \`description\`) VALUES
  (10, 'Popis se závorkami (uvnitř textu); a středníkem'),
  (11, 'Čárka, zdvojený ''apostrof'' a ukončovací závorka )');
INSERT INTO \`dg_course_task\` (\`course_id\`, \`task_id\`) VALUES
  (2, 10), (2, 11);
INSERT INTO \`dg_mark\` (\`id\`, \`id_task\`, \`description\`) VALUES
  (20, 10, 'Komentář; stále uvnitř hodnoty');
`;

describe('historical SQL data parser',()=>{
 it('does not lose rows to parentheses or semicolons in descriptions',()=>{const data=parseLegacySql(representativeDump);expect(data.dg_mark).toHaveLength(1);expect(data.dg_task).toHaveLength(2);expect(data.dg_course).toHaveLength(1);expect(data.dg_user).toHaveLength(1);expect(new Set(data.dg_task.map(t=>t.task_id)).size).toBe(2);expect(data.dg_task[0].description).toContain('(uvnitř textu);');expect(data.dg_task[1].description).toContain("zdvojený 'apostrof'");});
 it('rejects incomplete or unrecognized SQL values without executing SQL',()=>{expect(()=>parseLegacySql("INSERT INTO "+String.fromCharCode(96)+"dg_mark"+String.fromCharCode(96)+" (id) VALUES (NOW());")).toThrow();expect(()=>parseLegacySql('DROP TABLE users;')).toThrow();});
});
