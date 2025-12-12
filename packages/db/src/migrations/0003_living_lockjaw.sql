CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('DRAFT', 'PENDING_MANAGER', 'PENDING_HR', 'PENDING_FINANCE', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."contract_duration" AS ENUM('FULL_TIME', 'TEMPORARY', 'CONSULTANT');--> statement-breakpoint
CREATE TYPE "public"."request_type" AS ENUM('NEW_POSITION', 'REPLACEMENT');--> statement-breakpoint
ALTER TYPE "public"."approval_action" ADD VALUE 'ARCHIVE';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'IT';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'ADMIN';--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"action" text NOT NULL,
	"metadata" jsonb,
	"performed_by" text NOT NULL,
	"performed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_trip" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" text NOT NULL,
	"delegated_user_id" text,
	"destination" text NOT NULL,
	"purpose" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"estimated_cost" numeric(10, 2),
	"currency" text DEFAULT 'USD',
	"visa_required" boolean DEFAULT false NOT NULL,
	"needs_flight_booking" boolean DEFAULT false NOT NULL,
	"needs_hotel_booking" boolean DEFAULT false NOT NULL,
	"per_diem_allowance" numeric(10, 2),
	"status" "trip_status" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_expense" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"category" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD',
	"date" timestamp NOT NULL,
	"description" text,
	"receipt_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"cv_url" text NOT NULL,
	"status" text DEFAULT 'APPLIED' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"cost_center_code" text NOT NULL,
	"head_of_department_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_cycle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_goal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"weight" integer DEFAULT 0,
	"rating" integer,
	"comment" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"employee_id" text NOT NULL,
	"reviewer_id" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"overall_rating" integer,
	"overall_comment" text,
	"feedback" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "separation_checklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"separation_id" uuid NOT NULL,
	"department" text NOT NULL,
	"item" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"completed_by" text,
	"completed_at" timestamp,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "separation_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"type" text NOT NULL,
	"reason" text NOT NULL,
	"last_working_day" date NOT NULL,
	"notice_period_waived" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'REQUESTED' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_reports_to_manager_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "status" "user_status" DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "sap_no" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "signature_url" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "manpower_request" ADD COLUMN "request_type" "request_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "manpower_request" ADD COLUMN "is_budgeted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "manpower_request" ADD COLUMN "replacement_for_user_id" text;--> statement-breakpoint
ALTER TABLE "manpower_request" ADD COLUMN "contract_duration" "contract_duration" NOT NULL;--> statement-breakpoint
ALTER TABLE "manpower_request" ADD COLUMN "justification_text" text NOT NULL;--> statement-breakpoint
ALTER TABLE "manpower_request" ADD COLUMN "salary_range_min" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "manpower_request" ADD COLUMN "salary_range_max" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "manpower_request" ADD COLUMN "current_approver_role" "user_role";--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_performed_by_user_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_trip" ADD CONSTRAINT "business_trip_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_trip" ADD CONSTRAINT "business_trip_delegated_user_id_user_id_fk" FOREIGN KEY ("delegated_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_expense" ADD CONSTRAINT "trip_expense_trip_id_business_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."business_trip"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_request_id_manpower_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."manpower_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goal" ADD CONSTRAINT "performance_goal_review_id_performance_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."performance_review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_review" ADD CONSTRAINT "performance_review_cycle_id_performance_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."performance_cycle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_review" ADD CONSTRAINT "performance_review_employee_id_user_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_review" ADD CONSTRAINT "performance_review_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "separation_checklist" ADD CONSTRAINT "separation_checklist_separation_id_separation_request_id_fk" FOREIGN KEY ("separation_id") REFERENCES "public"."separation_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "separation_checklist" ADD CONSTRAINT "separation_checklist_completed_by_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "separation_request" ADD CONSTRAINT "separation_request_employee_id_user_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_reports_to_manager_id_fkey" FOREIGN KEY ("reports_to_manager_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manpower_request" ADD CONSTRAINT "manpower_request_replacement_for_user_id_user_id_fk" FOREIGN KEY ("replacement_for_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_sap_no_unique" UNIQUE("sap_no");