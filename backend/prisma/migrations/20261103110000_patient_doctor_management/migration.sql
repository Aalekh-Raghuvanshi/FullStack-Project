-- Promote the authentication profile table into the patient domain record.
ALTER TABLE "PatientProfile" RENAME TO "Patient";
ALTER TABLE "Patient" RENAME CONSTRAINT "PatientProfile_pkey" TO "Patient_pkey";
ALTER TABLE "Patient" RENAME CONSTRAINT "PatientProfile_userId_fkey" TO "Patient_userId_fkey";
ALTER INDEX "PatientProfile_userId_key" RENAME TO "Patient_userId_key";

ALTER TABLE "Patient" ADD COLUMN "patientNumber" VARCHAR(40);
ALTER TABLE "Patient" ADD COLUMN "firstName" VARCHAR(120);
ALTER TABLE "Patient" ADD COLUMN "lastName" VARCHAR(120);
ALTER TABLE "Patient" ADD COLUMN "dateOfBirth" DATE;
ALTER TABLE "Patient" ADD COLUMN "gender" VARCHAR(80);
ALTER TABLE "Patient" ADD COLUMN "phone" VARCHAR(40);
ALTER TABLE "Patient" ADD COLUMN "email" VARCHAR(254);
ALTER TABLE "Patient" ADD COLUMN "address" VARCHAR(500);
ALTER TABLE "Patient" ADD COLUMN "emergencyContactName" VARCHAR(160);
ALTER TABLE "Patient" ADD COLUMN "emergencyContactPhone" VARCHAR(40);
ALTER TABLE "Patient" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Patient" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Patient" AS patient
SET
    "patientNumber" = 'PAT-' || upper(replace(gen_random_uuid()::text, '-', '')),
    "firstName" = COALESCE(NULLIF(BTRIM(split_part(account.name, ' ', 1)), ''), 'Patient'),
    "lastName" = NULLIF(BTRIM(substring(account.name from length(split_part(account.name, ' ', 1)) + 1)), ''),
    "email" = account.email
FROM "User" AS account
WHERE patient."userId" = account.id;

ALTER TABLE "Patient" ALTER COLUMN "patientNumber" SET NOT NULL;
ALTER TABLE "Patient" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "Patient" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "Patient" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Patient" DROP CONSTRAINT "Patient_userId_fkey";
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Patient_patientNumber_key" ON "Patient"("patientNumber");
CREATE INDEX "Patient_lastName_firstName_idx" ON "Patient"("lastName", "firstName");
CREATE INDEX "Patient_email_idx" ON "Patient"("email");

UPDATE "AuditLog" SET "targetType" = 'Patient' WHERE "targetType" = 'PatientProfile';

CREATE TYPE "DoctorAvailability" AS ENUM ('AVAILABLE', 'BUSY', 'OFF_DUTY', 'ON_LEAVE');

CREATE TABLE "Doctor" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "doctorNumber" VARCHAR(40) NOT NULL,
    "firstName" VARCHAR(120) NOT NULL,
    "lastName" VARCHAR(120) NOT NULL,
    "specialization" VARCHAR(160) NOT NULL,
    "department" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(40),
    "email" VARCHAR(254),
    "availability" "DoctorAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Doctor_userId_key" ON "Doctor"("userId");
CREATE UNIQUE INDEX "Doctor_doctorNumber_key" ON "Doctor"("doctorNumber");
CREATE INDEX "Doctor_department_idx" ON "Doctor"("department");
CREATE INDEX "Doctor_specialization_idx" ON "Doctor"("specialization");
CREATE INDEX "Doctor_availability_isActive_idx" ON "Doctor"("availability", "isActive");

ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
