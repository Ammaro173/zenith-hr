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
| **Request Status**    | State machine: DRAFT → PENDING\_\* → APPROVED_OPEN → HIRING_IN_PROGRESS  |
| **Manager Link**      | Derived from active slot hierarchy (parent slot assignment), not user FK |

### Target Users

- **Requester** - Any employee submitting staffing requests
- **Manager** - First-level approval, team lead
- **HR** - Human Resources staff, manages candidates and contracts
- **Finance** - Budget approval authority
- **CEO** - Final approval for all requests

## Workflow States

The overarching approval state machine:

```
DRAFT
  ↓ (submit)
PENDING_MANAGER
  ↓ (approve) / ↑ (request change)
PENDING_HR
  ↓ (approve) / ↑ (request change)
PENDING_FINANCE
  ↓ (approve) / ↑ (request change)
PENDING_CEO
  ↓ (approve) / ↗ (reject → REJECTED)
APPROVED_OPEN
  ↓ (select candidate)
HIRING_IN_PROGRESS
  ↓ (complete)
ARCHIVED
```
