# Stars Flow Account And Permission Design

## Status

Approved direction on 2026-07-09: use three account levels only. Do not add a Viewer/Reviewer level in the first version.

R1 and R2 implemented the three-role account and interim setting-center guards. The separate admin-console design approved on 2026-07-10 supersedes this document's assumptions that Admin can view all projects, edit Prompt/Skill/Memory, and use the embedded setting center as the long-term admin surface. See `2026-07-10-stars-flow-separated-admin-console-design.md` for current group scope and admin-console rules.

## Purpose

Define how Stars Flow should evolve Toonflow's current single-admin login into a lightweight internal team account system. This design is based on the current Toonflow setting center, not a new standalone admin application.

## Current Toonflow Account State

The current app has a simple login gate:

- User table: `o_user(id, name, password)`.
- Initial account: `admin / admin123`.
- Passwords are currently stored as plain text.
- Login returns a JWT valid for 180 days.
- JWT payload contains only `id` and `name`.
- All API routes except login require a valid token.
- There is no role field.
- There is no permission level.
- Projects are created with fixed `userId: 1`.
- Project list queries return all projects.
- Setting center can edit the first user account only.

This is acceptable for a single local operator, but not for a ten-person internal server deployment.

## Target Roles

Use exactly three roles:

| Role | Internal Value | Purpose |
| --- | --- | --- |
| Super Admin | `super_admin` | System owner and infrastructure/controller account |
| Admin | `admin` | Production manager and daily operations account |
| Creator | `creator` | Project creator and production user |

No `viewer`, `reviewer`, `team_owner`, `trial_user`, or custom role builder is included in the first version.

## Role Rules

### Super Admin

Super Admin can:

- Manage all users and roles.
- Reset passwords and disable accounts.
- Access all projects.
- Access all setting center sections.
- Configure model vendors, API keys, model maps, request settings, agent models, prompts, skills, memory, database, file management, and developer switches.
- Delete or clear data when that function exists.
- View and manage all future audit/cost/config records.

Super Admin should be the only role allowed to change provider credentials, database tools, developer switches, and destructive global data controls.

### Admin

Admin is the production operations role.

Admin can:

- Create and manage production projects.
- View and operate all projects in the current internal-team deployment.
- Run ScriptAgent and ProductionAgent flows.
- Manage scripts, storyboards, assets, videos, tasks, and production review work.
- Edit Prompt and Skill content when those affect production workflow.
- Create and manage Creator accounts if user management is enabled.
- Reset Creator passwords.

Admin cannot:

- Change Provider API keys.
- Change system request/base URL settings.
- Change database maintenance settings.
- Toggle developer tools.
- Delete all app data.
- Promote another user to Super Admin.

### Creator

Creator is the normal production user.

Creator can:

- Create projects.
- View and edit own projects.
- Import novels or scripts into own projects.
- Run script, storyboard, asset, and video generation inside own projects.
- Use models already authorized/configured by Super Admin or Admin.
- Edit own profile/password.
- Change personal UI and language preferences.

Creator cannot:

- Access other users' projects.
- Manage model vendors or API keys.
- Edit global Prompt/Skill templates.
- Manage users.
- Access database, file management, request config, developer config, or destructive data controls.

## Setting Center Permission Map

The current Toonflow "backend" is the setting center. Keep its structure, but gate sections by role.

| Setting Section | Super Admin | Admin | Creator | Notes |
| --- | --- | --- | --- | --- |
| UI config | Yes | Yes | Yes | Personal preference |
| Language | Yes | Yes | Yes | Personal preference |
| Vendor config | Yes | No | No | Contains credentials and executable vendor logic |
| Model map | Yes | View/use later | No | Admin may need read-only later |
| Agent config | Yes | No | No | Model routing control |
| Prompt management | Yes | Yes | No | Admin can tune production workflow |
| Skill management | Yes | Yes | No | Admin can tune production workflow |
| Memory config | Yes | Yes | No | Production-level AI memory control |
| Account/profile | Yes | Yes | Yes | Replace current global login config with own profile |
| User management | Yes | Limited | No | Admin can manage Creator only |
| Database config | Yes | No | No | Destructive/global |
| File management | Yes | No | No | Server/local filesystem boundary |
| Other config | Yes | No | No | Treat as global until split |
| Request config | Yes | No | No | Server/API endpoint control |
| Dev config | Yes | No | No | Developer switch |
| About | Yes | Yes | Yes | Informational |
| Logout | Yes | Yes | Yes | Session action |

## Frontend Route Permission Map

| Route/Area | Super Admin | Admin | Creator |
| --- | --- | --- | --- |
| `/project` | All projects | All projects in first internal version | Own projects |
| `/task` | All tasks | All tasks in first internal version | Own project tasks |
| `/novel` | All accessible projects | All accessible projects | Own projects |
| `/scriptAgent` | All accessible projects | All accessible projects | Own projects |
| `/script` | All accessible projects | All accessible projects | Own projects |
| `/cornerScape` | All accessible projects | All accessible projects | Own projects |
| `/production` | All accessible projects | All accessible projects | Own projects |
| `/assets` | All accessible projects | All accessible projects | Own projects |
| Setting center | Full | Production/admin subset | Personal subset |

## Backend Permission Model

Use fixed code-level permissions first. Do not build a dynamic RBAC editor in the first version.

Required backend changes when implemented:

- Add `role`, `status`, `passwordHash`, `createdAt`, `updatedAt`, `lastLoginAt`, and `mustChangePassword` fields to `o_user`.
- Migrate current `admin` account to `super_admin`.
- Stop returning password fields from user APIs.
- Hash passwords before storage.
- Include `id`, `name`, and `role` in JWT payload.
- Add `requireAuth` and `requireRole` helpers.
- Add `canAccessProject(user, project)` helper.
- Write project `userId` from current JWT user instead of fixed `1`.
- Filter project and task queries by current user role.
- Gate setting APIs by role.

## Project Access Rule

First internal-team version:

| Role | Project Access |
| --- | --- |
| Super Admin | All projects |
| Admin | All projects |
| Creator | Own projects only |

This avoids introducing team/group scope in the first pass. If team hierarchy becomes necessary later, add `teamId` and admin scope after the three-role model is stable.

## API Category Rules

| API Category | Super Admin | Admin | Creator |
| --- | --- | --- | --- |
| `/api/login/*` | Public login | Public login | Public login |
| `/api/project/*` | Full | Full | Own project scope |
| `/api/task/*` | Full | Full | Own project scope |
| `/api/novel/*` | Full | Full | Own project scope |
| `/api/script*` | Full | Full | Own project scope |
| `/api/production/*` | Full | Full | Own project scope |
| `/api/assets*` | Full | Full | Own project scope |
| `/api/artStyle/*` | Full | Full | Read/use; no global edits unless scoped |
| `/api/setting/vendorConfig/*` | Full | No | No |
| `/api/setting/modelMap/*` | Full | Read/use later | No |
| `/api/setting/agentDeploy/*` | Full | No | No |
| `/api/setting/promptManage/*` | Full | Full | No |
| `/api/setting/skillManagement/*` | Full | Full | No |
| `/api/setting/dbConfig/*` | Full | No | No |
| `/api/setting/dev/*` | Full | No | No |
| `/api/setting/fileManagement/*` | Full | No | No |
| `/api/other/deleteAllData` | Full | No | No |

## Admin UI Changes Needed Later

Keep the setting center as the admin surface, but split the current login section:

- `Profile`: current user changes own password.
- `User Management`: Super Admin manages all users; Admin manages Creator users only.

User Management first version fields:

- Username
- Role: `super_admin`, `admin`, `creator`
- Status: enabled/disabled
- Temporary password generation
- Must change password on first login
- Last login time

Do not expose password values after creation/reset.

## Acceptance Criteria

- Existing default account becomes a Super Admin account.
- Only three roles exist.
- Creator cannot see or operate another user's projects.
- Creator cannot open model vendor, database, request, file, or developer settings.
- Admin can operate production projects and manage Creator accounts.
- Admin cannot alter provider keys or promote users to Super Admin.
- Super Admin can access all current and future admin controls.
- No API relies on frontend hiding alone; backend enforces role and project scope.
- Passwords are not returned to the frontend after the migration.
