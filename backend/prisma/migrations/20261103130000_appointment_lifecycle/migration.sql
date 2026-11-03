CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;

CREATE TYPE "AppointmentStatus" AS ENUM (
    'SCHEDULED',
    'CONFIRMED',
    'CHECKED_IN',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW'
);

CREATE TABLE "Appointment" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "scheduledStart" TIMESTAMPTZ(3) NOT NULL,
    "scheduledEnd" TIMESTAMPTZ(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "visitCategory" VARCHAR(120) NOT NULL,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Appointment_time_order_check" CHECK ("scheduledEnd" > "scheduledStart")
);

CREATE INDEX "Appointment_patientId_scheduledStart_idx" ON "Appointment"("patientId", "scheduledStart");
CREATE INDEX "Appointment_doctorId_scheduledStart_idx" ON "Appointment"("doctorId", "scheduledStart");
CREATE INDEX "Appointment_status_scheduledStart_idx" ON "Appointment"("status", "scheduledStart");

ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Half-open ranges allow adjacent visits (end == next start) but prohibit overlap.
-- CANCELLED records release the slot. These constraints arbitrate concurrent bookings.
ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_doctor_schedule_excl"
    EXCLUDE USING gist (
        "doctorId" WITH =,
        tstzrange("scheduledStart", "scheduledEnd", '[)') WITH &&
    ) WHERE ("status" <> 'CANCELLED');

ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_patient_schedule_excl"
    EXCLUDE USING gist (
        "patientId" WITH =,
        tstzrange("scheduledStart", "scheduledEnd", '[)') WITH &&
    ) WHERE ("status" <> 'CANCELLED');
