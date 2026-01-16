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
import type * as dashboard from "../dashboard.js";
import type * as divisions from "../divisions.js";
import type * as event_types from "../event_types.js";
import type * as events from "../events.js";
import type * as files from "../files.js";
import type * as financial from "../financial.js";
import type * as invitations from "../invitations.js";
import type * as labels from "../labels.js";
import type * as members from "../members.js";
import type * as ministries from "../ministries.js";
import type * as organizations from "../organizations.js";
import type * as regions from "../regions.js";
import type * as subunits from "../subunits.js";
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
  dashboard: typeof dashboard;
  divisions: typeof divisions;
  event_types: typeof event_types;
  events: typeof events;
  files: typeof files;
  financial: typeof financial;
  invitations: typeof invitations;
  labels: typeof labels;
  members: typeof members;
  ministries: typeof ministries;
  organizations: typeof organizations;
  regions: typeof regions;
  subunits: typeof subunits;
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
