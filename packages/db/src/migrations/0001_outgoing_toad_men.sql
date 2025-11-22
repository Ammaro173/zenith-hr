CREATE TYPE "public"."approval_action" AS ENUM('APPROVE', 'REJECT', 'REQUEST_CHANGE', 'HOLD');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('REQUESTER', 'MANAGER', 'HR', 'FINANCE', 'CEO');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('DRAFT', 'SENT_FOR_SIGNATURE', 'SIGNED', 'VOIDED');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('DRAFT', 'PENDING_MANAGER', 'PENDING_HR', 'PENDING_FINANCE', 'PENDING_CEO', 'APPROVED_OPEN', 'HIRING_IN_PROGRESS', 'REJECTED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "approval_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"action" "approval_action" NOT NULL,
	"comment" text,
	"step_name" text NOT NULL,
	"performed_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE "contract" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"candidate_name" text NOT NULL,
	"candidate_email" text NOT NULL,
	"contract_terms" jsonb NOT NULL,
	"pdf_s3_url" text,
	"signing_provider_id" text,
	"status" "contract_status" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manpower_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" text NOT NULL,
	"request_code" text NOT NULL,
	"status" "request_status" DEFAULT 'DRAFT' NOT NULL,
	"position_details" jsonb NOT NULL,
	"budget_details" jsonb NOT NULL,
	"revision_version" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "manpower_request_request_code_unique" UNIQUE("request_code")
);
--> statement-breakpoint
CREATE TABLE "request_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"snapshot_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "todo" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "todo" CASCADE;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" "user_role" DEFAULT 'REQUESTER' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "reports_to_manager_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "approval_log" ADD CONSTRAINT "approval_log_request_id_manpower_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."manpower_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_log" ADD CONSTRAINT "approval_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract" ADD CONSTRAINT "contract_request_id_manpower_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."manpower_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manpower_request" ADD CONSTRAINT "manpower_request_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_version" ADD CONSTRAINT "request_version_request_id_manpower_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."manpower_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_reports_to_manager_id_user_id_fk" FOREIGN KEY ("reports_to_manager_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;