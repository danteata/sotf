// =============================================================================
// Template rendering
//
// Safe {{variable}} interpolation over a fixed namespace derived from the fact
// context. NOT an expression language — only dotted variable lookups. Unknown
// variables render as an empty string and are collected in `missing` so the
// dry-run/simulate UI can warn before a rule is enabled.
// =============================================================================

import { FactContext } from "./catalog";

const VAR_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

/**
 * Build the flat variable namespace available to templates. Includes a few
 * convenient aliases (e.g. {{count}} == {{streak.count}}).
 */
export function buildTemplateVars(ctx: FactContext): Record<string, string> {
    const vars: Record<string, string> = {};

    const put = (key: string, val: unknown) => {
        if (val === undefined || val === null) return;
        vars[key] = String(val);
    };

    put("org.name", ctx.org.name);

    if (ctx.member) {
        put("member.name", ctx.member.name);
        put("member.first_name", ctx.member.first_name);
        put("member.status", ctx.member.status);
        put("member.gender", ctx.member.gender);
        put("member.email", ctx.member.email);
        put("member.phone", ctx.member.phone);
        put("member.age", ctx.member.age);
    }
    if (ctx.streak) {
        put("streak.count", ctx.streak.count);
        put("streak.last_present_date", ctx.streak.last_present_date);
        put("streak.days_since_last", ctx.streak.days_since_last);
        // Convenience aliases
        put("count", ctx.streak.count);
    }
    if (ctx.event) {
        put("event.label", ctx.event.label);
        put("event.event_type_value", ctx.event.event_type_value);
        put("event.date", ctx.event.date);
        put("event.minutes_late", ctx.event.minutes_late);
    }

    return vars;
}

export type RenderResult = {
    text: string;
    missing: string[];
};

/**
 * Render a template string against a fact context.
 * Unknown variables become "" and are reported in `missing`.
 */
export function renderTemplate(template: string, ctx: FactContext): RenderResult {
    const vars = buildTemplateVars(ctx);
    const missing: string[] = [];

    const text = template.replace(VAR_PATTERN, (_match, name: string) => {
        if (name in vars) return vars[name];
        if (!missing.includes(name)) missing.push(name);
        return "";
    });

    return { text, missing };
}
