ALTER TABLE "organizations" ADD COLUMN "gradingScale" JSONB NOT NULL DEFAULT '{"type":"ECTS","thresholds":[90,80,70,60,50]}';
