import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Scheduled jobs for SOTF. Per Convex guidelines we use crons.interval (not
// crons.daily/hourly helpers) and pass FunctionReferences via `internal`.

const crons = cronJobs();

// Every 15 minutes: auto-expire check-in sessions that are past their
// closes_at timestamp. Prevents sessions being left "open" indefinitely
// when an admin forgets to close them.
crons.interval("expire-check-in-sessions", { minutes: 15 }, internal.check_ins.expireSessions, {});

export default crons;