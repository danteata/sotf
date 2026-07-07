/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as app_config from "../app_config.js";
import type * as attendance from "../attendance.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as check_ins from "../check_ins.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as event_types from "../event_types.js";
import type * as events from "../events.js";
import type * as files from "../files.js";
import type * as financial from "../financial.js";
import type * as invitations from "../invitations.js";
import type * as labels from "../labels.js";
import type * as members from "../members.js";
import type * as organizations from "../organizations.js";
import type * as scope from "../scope.js";
import type * as unit_admins from "../unit_admins.js";
import type * as units from "../units.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  app_config: typeof app_config;
  attendance: typeof attendance;
  audit: typeof audit;
  auth: typeof auth;
  check_ins: typeof check_ins;
  crons: typeof crons;
  dashboard: typeof dashboard;
  event_types: typeof event_types;
  events: typeof events;
  files: typeof files;
  financial: typeof financial;
  invitations: typeof invitations;
  labels: typeof labels;
  members: typeof members;
  organizations: typeof organizations;
  scope: typeof scope;
  unit_admins: typeof unit_admins;
  units: typeof units;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
