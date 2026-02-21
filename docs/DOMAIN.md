# Project Domain & Workflows

## Context

Zenith HR is a manpower request and HR management system.

### Domain Terminology

| Term                  | Description                                                              |
| --------------------- | ------------------------------------------------------------------------ |
| **Manpower Request**  | A staffing request submitted by a manager for a new hire                 |
| **Candidate**         | A potential hire with uploaded CV, linked to a request                   |
| **Contract**          | Employment agreement generated after candidate selection                 |
| **Approval Workflow** | Multi-tier approval chain: Manager → HR → Finance → CEO                  |
| **Request Status**    | State machine: DRAFT → PENDING\_\* → HIRING_IN_PROGRESS → COMPLETED      |
| **Manager Link**      | Derived from active slot hierarchy (parent slot assignment), not user FK |

### Target Users

- **Employee** - Any employee submitting staffing requests
- **Manager** - First-level approval, team lead
- **HR** - Human Resources staff, manages candidates and contracts
- **Finance** - Budget approval authority
- **CEO** - Final approval for all requests

## Hierarchy Source of Truth

- Reporting and manager relationships are derived from active `slot_assignment` + `slot_reporting_line`.
- API writes accept `reportsToSlotCode` for manager assignment and resolve the manager through slot ownership.
- Legacy direct user manager links are treated as compatibility data only during migration windows.

## Workflow States

The overarching approval state machine:

```
DRAFT
  ↓ (submit)
PENDING_MANAGER          ← skipped if requester is Manager or above
  ↓ (approve) / ↑ (request change)
PENDING_HR
  ↓ (approve) / ↑ (request change)
PENDING_FINANCE
  ↓ (approve) / ↑ (request change)
PENDING_CEO              ← skipped if requester is CEO
  ↓ (approve) / ↗ (reject → REJECTED)
HIRING_IN_PROGRESS
  ↓ (complete — HR/ADMIN only)
COMPLETED
```

### Key Rules

- **No double approval**: after CEO approves, the request goes directly to `HIRING_IN_PROGRESS` (no intermediate `APPROVED_OPEN` step).
- **Step skipping**: approval steps are skipped when the requester's role matches the approver role (e.g. Manager skips `PENDING_MANAGER`, CEO skips `PENDING_CEO`).
- **Complete hiring**: only HR or ADMIN can transition `HIRING_IN_PROGRESS → COMPLETED`.
- **`HIRING_IN_PROGRESS` is not an approval step**: it does not appear in the Approvals inbox and has no `currentApprover` set.
- **Rejection**: any approver can reject at their step, sending the request to `REJECTED`.
- **Request change**: any approver can request changes, sending the request back to `DRAFT`.
