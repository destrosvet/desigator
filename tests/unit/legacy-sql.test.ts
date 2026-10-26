import { describe, expect, it } from "vitest";
import { parseLegacySql } from "@/lib/legacy-sql";

const fixture = `
INSERT INTO \`dg_user\` (\`user_id\`, \`user_name\`) VALUES
  (1, 'Synthetic Student'),
  (2, 'Synthetic Evaluator');
INSERT INTO \`dg_course\` (\`course_id\`, \`course_name\`, \`course_description\`, \`course_year\`, \`course_semester\`) VALUES
  (10, 'DES', 'Design course', 2025, 1);
INSERT INTO \`dg_task\` (\`task_id\`, \`task_name\`, \`task_points\`) VALUES
  (20, 'Poster (iteration 2); composition', 100),
  (21, 'Identity with an escaped \\'quote\\'', 50);
INSERT INTO \`dg_course_task\` (\`id_course\`, \`id_task\`) VALUES
  (10, 20),
  (10, 21);
INSERT INTO \`dg_mark\` (\`id_task\`, \`id_user\`, \`id_judge\`, \`mark\`, \`description\`, \`date\`) VALUES
  (20, 1, 2, 87, 'Clear hierarchy; strong result (final).', '2025-01-15'),
  (21, 1, 2, 45, 'Consistent system', '2025-01-16');
`;

describe("historical SQL data parser", () => {
  it("preserves tasks containing parentheses, semicolons, and escaped quotes", () => {
    const data = parseLegacySql(fixture);
    expect(data.dg_user).toHaveLength(2);
    expect(data.dg_course).toHaveLength(1);
    expect(data.dg_task).toHaveLength(2);
    expect(data.dg_course_task).toHaveLength(2);
    expect(data.dg_mark).toHaveLength(2);
    expect(data.dg_task.map((task) => task.task_name)).toEqual([
      "Poster (iteration 2); composition",
      "Identity with an escaped 'quote'",
    ]);
  });

  it("rejects incomplete or unrecognized SQL values without executing SQL", () => {
    expect(() => parseLegacySql("INSERT INTO `dg_mark` (id) VALUES (NOW());")).toThrow();
    expect(() => parseLegacySql("DROP TABLE users;")).toThrow();
  });
});
