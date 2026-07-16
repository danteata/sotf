import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Scheduled jobs for SOTF. Per Convex guidelines we use crons.interval (not
// crons.daily/hourly helpers) and pass FunctionReferences via `internal`.

const crons = cronJobs();

// Every 15 minutes: auto-expire check-in sessions that are past their
// closes_at timestamp. Prevents sessions being left "open" indefinitely
// when an admin forgets to close them.
crons.interval("expire-check-in-sessions", { minutes: 15 }, internal.check_ins.expireSessions, {});

// Daily: automation engine scan for derived triggers (consecutive absences,
// no-attendance-for-N-days, birthdays). Fans out per org and walks members in
// bounded batches, self-rescheduling. See AUTOMATION_ENGINE_PLAN.md.
crons.interval("automation-daily-scan", { hours: 24 }, internal.automation.scan.run, {});

// Every 10 minutes: flush the automation task queue — promotes deferred tasks
// (quiet-hours / rate-cap backoffs) back to pending once due and pushes any
// pending SMS to the external delivery action.
crons.interval("automation-dispatch-flush", { minutes: 10 }, internal.automation.dispatch.drain, {});

export default crons;