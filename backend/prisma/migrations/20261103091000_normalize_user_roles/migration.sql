-- Earlier versions used STAFF. Map it to RECEPTIONIST and rebuild the enum so
-- PostgreSQL and the Prisma schema agree on the supported role values.
CREATE TYPE "_UserRole_new" AS ENUM ('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User"
    ALTER COLUMN "role" TYPE "_UserRole_new"
    USING (
        CASE "role"::text
            WHEN 'STAFF' THEN 'RECEPTIONIST'
            ELSE "role"::text
        END
    )::_UserRole_new;

DROP TYPE "UserRole";
ALTER TYPE "_UserRole_new" RENAME TO "UserRole";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'PATIENT';
