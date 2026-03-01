import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireOrgAccess, requireOrgAdmin, requireUser, resolveOrgId, getUserSafe } from "./auth";

// Utility functions for hierarchical operations
export const buildPath = (parentPath: string, unitName: string): string => {
    const cleanName = unitName.toLowerCase().replace(/[^a-z0-9\-_]/g, '-');
    return parentPath ? `${parentPath}/${cleanName}` : `/${cleanName}`;
};

export const getUnitDepth = (parentDepth: number): number => {
    return parentDepth + 1;
};

export const getDescendants = query({
    args: { unit_id: v.id("units") },
    handler: async (ctx, args) => {
        const unit = await ctx.db.get(args.unit_id);
        if (!unit) return [];
        await requireOrgAccess(ctx, unit.organization_id);

        const descendants = await ctx.db
            .query("units")
            .withIndex("by_path", (q) => q.gte("path", unit.path + "/").lt("path", unit.path + "0"))
            .collect();

        return descendants;
    },
});

export const getAncestors = query({
    args: { unit_id: v.id("units") },
    handler: async (ctx, args) => {
        const unit = await ctx.db.get(args.unit_id);
        if (!unit || !unit.parent_unit_id) return [];
        await requireOrgAccess(ctx, unit.organization_id);

        const ancestors = [];
        let currentParentId: Id<"units"> | undefined = unit.parent_unit_id;

        while (currentParentId) {
            const parent: any = await ctx.db.get(currentParentId);
            if (!parent) break;
            ancestors.unshift(parent);
            currentParentId = parent.parent_unit_id;
        }

        return ancestors;
    },
});

export const getChildren = query({
    args: { unit_id: v.id("units") },
    handler: async (ctx, args) => {
        const parent = await ctx.db.get(args.unit_id);
        if (parent?.organization_id) {
            await requireOrgAccess(ctx, parent.organization_id);
        }
        return await ctx.db
            .query("units")
            .withIndex("by_parent", (q) => q.eq("parent_unit_id", args.unit_id))
            .collect();
    },
});

export const list = query({
    args: {},
    handler: async (ctx) => {
        const user = await getUserSafe(ctx);
        if (!user) return []; // Return empty array if user doesn't exist
        if (user.role === "super_admin") {
            return await ctx.db.query("units").collect();
        }
        const orgId = await resolveOrgId(ctx);
        if (!orgId) return [];
        return await ctx.db
            .query("units")
            .withIndex("by_org", (q) => q.eq("organization_id", orgId))
            .collect();
    },
});

export const listByOrg = query({
    args: { organization_id: v.id("organizations") },
    handler: async (ctx, args) => {
        await requireOrgAccess(ctx, args.organization_id);
        return await ctx.db
            .query("units")
            .withIndex("by_org", q => q.eq("organization_id", args.organization_id))
            .collect();
    },
});

export const listByType = query({
    args: {
        organization_id: v.id("organizations"),
        type: v.string()
    },
    handler: async (ctx, args) => {
        await requireOrgAccess(ctx, args.organization_id);
        return await ctx.db
            .query("units")
            .withIndex("by_org_type", q => q.eq("organization_id", args.organization_id).eq("type", args.type))
            .collect();
    },
});



export const getRootUnits = query({
    args: { organization_id: v.id("organizations") },
    handler: async (ctx, args) => {
        await requireOrgAccess(ctx, args.organization_id);
        const allUnits = await ctx.db
            .query("units")
            .withIndex("by_org", q => q.eq("organization_id", args.organization_id))
            .collect();
        return allUnits.filter(u => u.depth === 0 || u.depth === undefined);
    },
});

export const create = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        organization_id: v.id("organizations"),
        parent_unit_id: v.optional(v.id("units")),
        type: v.string(), // 'administrative', 'functional', 'geographic'
        category: v.optional(v.string()),
        leader_id: v.optional(v.id("members")),
        active: v.boolean(),
        address: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        country: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        const orgId = await resolveOrgId(ctx, args.organization_id);
        if (!orgId) throw new Error("Organization not set");
        // Get parent unit for path and depth calculation
        let parentPath = "";
        let depth = 0;

        if (args.parent_unit_id) {
            const parent = await ctx.db.get(args.parent_unit_id);
            if (parent && parent.path && parent.depth !== undefined) {
                if (parent.organization_id !== orgId) {
                    throw new Error("Parent unit org mismatch");
                }
                parentPath = parent.path;
                depth = getUnitDepth(parent.depth);
            }
        }

        const path = buildPath(parentPath, args.name);

        return await ctx.db.insert("units", {
            ...args,
            organization_id: orgId,
            depth,
            path,
        });
    },
});

export const update = mutation({
    args: {
        id: v.id("units"),
        updates: v.object({
            name: v.optional(v.string()),
            description: v.optional(v.string()),
            parent_unit_id: v.optional(v.id("units")),
            type: v.optional(v.string()),
            category: v.optional(v.string()),
            leader_id: v.optional(v.id("members")),
            active: v.optional(v.boolean()),
            address: v.optional(v.string()),
            city: v.optional(v.string()),
            state: v.optional(v.string()),
            country: v.optional(v.string()),
            latitude: v.optional(v.number()),
            longitude: v.optional(v.number()),
            plus_code: v.optional(v.string()),
        }),
    },
    handler: async (ctx, args) => {
        const { id, updates } = args;
        await requireOrgAdmin(ctx);
        const unit = await ctx.db.get(id);
        if (!unit) throw new Error("Unit not found");
        await requireOrgAccess(ctx, unit.organization_id);
        if (updates.parent_unit_id) {
            const parent = await ctx.db.get(updates.parent_unit_id);
            if (!parent || parent.organization_id !== unit.organization_id) {
                throw new Error("Parent unit org mismatch");
            }
        }
        await updateUnitWithPathRecalculation(ctx, id, updates);
        return true;
    },
});

export const remove = mutation({
    args: { id: v.id("units") },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        const unit = await ctx.db.get(args.id);
        if (!unit) throw new Error("Unit not found");
        await requireOrgAccess(ctx, unit.organization_id);
        // Check if unit has children
        const children = await ctx.db
            .query("units")
            .withIndex("by_parent", (q) => q.eq("parent_unit_id", args.id))
            .collect();

        if (children.length > 0) {
            throw new Error("Cannot delete unit with child units. Move or delete children first.");
        }

        await ctx.db.delete(args.id);
        return true;
    },
});

// Helper function to update descendant paths when a unit's path changes
const updateDescendantPaths = async (
    ctx: { db: any },
    unitId: Id<"units">,
    oldPath: string,
    newPath: string
) => {
    const descendants = await ctx.db
        .query("units")
        .withIndex("by_path", (q: any) => q.gte("path", oldPath + "/").lt("path", oldPath + "0"))
        .collect();

    for (const descendant of descendants) {
        const newDescendantPath = descendant.path.replace(oldPath, newPath);
        await ctx.db.patch(descendant._id, { path: newDescendantPath });
    }
};

// Helper function to update unit with path recalculation (shared between update and moveUnit)
const updateUnitWithPathRecalculation = async (
    ctx: any,
    id: Id<"units">,
    updates: any
) => {
    // If parent or name changed, we need to update path and depth
    if (updates.parent_unit_id !== undefined || updates.name) {
        const unit = await ctx.db.get(id);
        if (!unit) throw new Error("Unit not found");

        let newParentPath = "";
        let newDepth = unit.depth ?? 0;
        let newPath = unit.path;

        if (updates.parent_unit_id !== undefined) {
            if (updates.parent_unit_id) {
                const parent = await ctx.db.get(updates.parent_unit_id);
                if (parent && parent.path && parent.depth !== undefined) {
                    newParentPath = parent.path;
                    newDepth = getUnitDepth(parent.depth);
                }
            }
            // Recalculate path with new parent and current/new name
            const unitName = updates.name || unit.name;
            newPath = buildPath(newParentPath, unitName);

            // Update all descendants' paths
            if (unit.path) {
                await updateDescendantPaths(ctx, id, unit.path, newPath);
            }
        } else if (updates.name) {
            // Only name changed, rebuild path with same parent
            if (unit.path) {
                const pathParts = unit.path.split('/');
                pathParts[pathParts.length - 1] = updates.name.toLowerCase().replace(/[^a-z0-9\-_]/g, '-');
                newPath = pathParts.join('/');

                // Update all descendants' paths
                await updateDescendantPaths(ctx, id, unit.path, newPath);
            }
        }

        // Update the unit with new path and depth
        await ctx.db.patch(id, {
            ...updates,
            path: newPath,
            depth: newDepth,
        });
    } else {
        // Simple update without path changes
        await ctx.db.patch(id, updates);
    }
};

export const moveUnit = mutation({
    args: {
        unitId: v.id("units"),
        newParentId: v.optional(v.id("units")),
    },
    handler: async (ctx, args) => {
        const { unitId, newParentId } = args;
        await requireOrgAdmin(ctx);
        const unit = await ctx.db.get(unitId);
        if (!unit) throw new Error("Unit not found");
        await requireOrgAccess(ctx, unit.organization_id);

        // Prevent circular references
        if (newParentId) {
            const parent = await ctx.db.get(newParentId);
            if (!parent || parent.organization_id !== unit.organization_id) {
                throw new Error("Parent unit org mismatch");
            }
            const wouldCreateCycle = await checkForCycle(ctx, unitId, newParentId);
            if (wouldCreateCycle) {
                throw new Error("Moving this unit would create a circular reference");
            }
        }

        // Use the helper function to properly handle path and depth recalculation
        await updateUnitWithPathRecalculation(ctx, unitId, { parent_unit_id: newParentId });

        return true;
    },
});

// Helper to check for circular references
const checkForCycle = async (
    ctx: any,
    unitId: Id<"units">,
    potentialParentId: Id<"units">
): Promise<boolean> => {
    let currentId = potentialParentId;
    while (currentId) {
        if (currentId === unitId) return true;
        const unit = await ctx.db.get(currentId);
        if (!unit) break;
        currentId = unit.parent_unit_id;
    }
    return false;
};

// Migration function to populate depth and path for existing units
export const migrateExistingUnits = mutation({
    args: { organization_id: v.id("organizations") },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        await requireOrgAccess(ctx, args.organization_id);
        // Get all units for this organization
        const units = await ctx.db
            .query("units")
            .withIndex("by_org", q => q.eq("organization_id", args.organization_id))
            .collect();

        // Group units by their parent relationships
        const unitMap = new Map(units.map(u => [u._id.toString(), u]));
        const processed = new Set<string>();

        // Process root units first (those without parent or with old division relationship)
        const rootUnits = units.filter(u => !u.parent_unit_id || u.parent_organization_type === "organization");

        for (const rootUnit of rootUnits) {
            if (processed.has(rootUnit._id.toString())) continue;

            // Set depth and path for root unit
            const path = buildPath("", rootUnit.name);
            await ctx.db.patch(rootUnit._id, {
                depth: 0,
                path,
                type: rootUnit.type || "administrative" // Default to administrative if not set
            });
            processed.add(rootUnit._id.toString());

            // Process children recursively
            await processChildren(ctx, rootUnit._id, path, 0, unitMap, processed);
        }

        return { migrated: processed.size };
    },
});

// Migration to set types for existing units based on their names/content
export const setUnitTypes = mutation({
    args: { organization_id: v.id("organizations") },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        await requireOrgAccess(ctx, args.organization_id);
        const units = await ctx.db
            .query("units")
            .withIndex("by_org", q => q.eq("organization_id", args.organization_id))
            .collect();

        const ministryKeywords = ['choir', 'worship', 'youth', 'children', 'adult', 'praise', 'music', 'ministry', 'team', 'group'];
        const adminKeywords = ['branch', 'district', 'region', 'division', 'office', 'board', 'council', 'committee'];

        let updated = 0;

        for (const unit of units) {
            let unitType = unit.type; // Keep existing type if set

            if (!unitType) {
                const name = unit.name.toLowerCase();
                const hasMinistryKeyword = ministryKeywords.some(keyword => name.includes(keyword));
                const hasAdminKeyword = adminKeywords.some(keyword => name.includes(keyword));

                if (hasMinistryKeyword && !hasAdminKeyword) {
                    unitType = 'ministry';
                } else if (hasAdminKeyword) {
                    unitType = 'administrative';
                } else {
                    // Default to administrative for organizational units
                    unitType = 'administrative';
                }

                await ctx.db.patch(unit._id, { type: unitType });
                updated++;
            }
        }

        return { updated };
    },
});

// Helper function to recursively process child units
const processChildren = async (
    ctx: any,
    parentId: any,
    parentPath: string,
    parentDepth: number,
    unitMap: Map<string, any>,
    processed: Set<string>
) => {
    // Find units that have this parent via old parent_organization_type logic
    const children = Array.from(unitMap.values()).filter(u =>
        !processed.has(u._id.toString()) &&
        ((u.parent_organization_type === "division" && u.division_id === parentId) ||
            u.parent_unit_id === parentId)
    );

    for (const child of children) {
        const childPath = buildPath(parentPath, child.name);
        const childDepth = parentDepth + 1;

        await ctx.db.patch(child._id, {
            depth: childDepth,
            path: childPath,
            parent_unit_id: parentId, // Ensure proper parent reference
            type: child.type || "administrative" // Default type
        });
        processed.add(child._id.toString());

        // Process this child's children
        await processChildren(ctx, child._id, childPath, childDepth, unitMap, processed);
    }
};
