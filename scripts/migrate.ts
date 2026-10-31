import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

/**
 * Copies production data from Supabase into the Prisma (Neon) database.
 *
 * Safe to re-run: every row is upserted, and existing rows are refreshed from
 * Supabase. Run it right before switching the live site, because it overwrites
 * Neon rows with the Supabase values.
 *
 *   npx tsx scripts/migrate.ts
 */

// Load environment variables from .env.local and .env
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service role to bypass RLS

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const prisma = new PrismaClient();

const date = (v: any) => (v ? new Date(v) : null);
const json = (v: any) => (Array.isArray(v) ? JSON.stringify(v) : v || null);

// Supabase used 'vendor' and 'pro' for planners; the app now only knows 'planner'
const normalizeRole = (role: any) => (['planner', 'vendor', 'pro'].includes(String(role).toLowerCase()) ? 'planner' : 'couple');

// Older vendor rows used pending/booked/paid; the UI uses researching/contacted/hired/declined
const normalizeVendorStatus = (s: any) => {
    if (['researching', 'contacted', 'hired', 'declined'].includes(s)) return s;
    if (s === 'booked' || s === 'paid') return 'hired';
    return 'researching';
};

/** Fetch a whole table, tolerating tables that don't exist in older projects. */
async function fetchAll(table: string): Promise<any[]> {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
        console.warn(`  Skipping ${table}: ${error.message}`);
        return [];
    }
    return data ?? [];
}

/** Upsert each row, logging (not aborting on) rows that fail, e.g. orphans. */
async function copy<T>(label: string, rows: T[], write: (row: T) => Promise<unknown>) {
    let ok = 0;
    for (const row of rows) {
        try {
            await write(row);
            ok++;
        } catch (e) {
            console.log(`  ${label}: skipped ${(row as any).id ?? ''} (${(e as Error).message.split('\n').pop()})`);
        }
    }
    console.log(`✅ ${label}: ${ok}/${rows.length}`);
}

async function migrate() {
    console.log("Starting data migration from Supabase to Neon...");

    try {
        // 1. Users: auth.users plus the profiles table (role and business details)
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        if (authError) throw authError;
        const profiles = await fetchAll('profiles');

        await copy('Users', authUsers.users, (authUser) => {
            const profile = profiles.find((p) => p.id === authUser.id);
            const data = {
                email: authUser.email,
                name: profile?.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
                image: profile?.avatar_url || authUser.user_metadata?.avatar_url || null,
                emailVerified: date(authUser.email_confirmed_at),
                role: normalizeRole(profile?.role ?? authUser.user_metadata?.role),
                companyName: profile?.company_name || profile?.business_name || null,
                logoUrl: profile?.logo_url || null,
                website: profile?.website || null,
                signatureUrl: profile?.signature_url || null,
                brandingColor: profile?.branding_color || '#000000',
            };
            return prisma.user.upsert({
                where: { id: authUser.id },
                update: data,
                create: { id: authUser.id, createdAt: new Date(authUser.created_at), ...data },
            });
        });

        // 2. Weddings
        const weddings = await fetchAll('weddings');
        await copy('Weddings', weddings, (wed) => {
            const data = {
                createdById: wed.created_by || wed.created_by_id || wed.owner_id || authUsers.users[0]?.id,
                coupleName1: wed.couple_name_1 || wed.partner_1_name || 'Partner 1',
                coupleName2: wed.couple_name_2 || wed.partner_2_name || 'Partner 2',
                weddingDate: date(wed.wedding_date),
                location: wed.location || null,
                currency: wed.currency || 'USD',
                styleTheme: wed.style_theme || null,
                targetGuestCount: wed.target_guest_count || null,
                estimatedBudget: wed.estimated_budget || wed.budget || 0,
                tier: wed.tier || 'free',
                premiumTrialEndsAt: date(wed.premium_trial_ends_at),
                whatsappBusinessNumber: wed.whatsapp_business_number || null,
                name: wed.name || null,
            };
            return prisma.wedding.upsert({
                where: { id: wed.id },
                update: data,
                create: { id: wed.id, createdAt: date(wed.created_at) ?? new Date(), ...data },
            });
        });

        // 3. Wedding-scoped tables
        await copy('Collaborators', await fetchAll('collaborators'), (c) =>
            prisma.collaborator.upsert({
                where: { weddingId_userId: { weddingId: c.wedding_id, userId: c.user_id } },
                update: { role: c.role || 'editor' },
                create: { weddingId: c.wedding_id, userId: c.user_id, role: c.role || 'editor', joinedAt: date(c.joined_at) ?? new Date() },
            })
        );

        await copy('Budget items', await fetchAll('budget_items'), (b) => {
            const data = {
                weddingId: b.wedding_id,
                category: b.category || 'Uncategorized',
                name: b.name || b.item_name || 'Item',
                estimatedCost: b.estimated_cost || 0,
                unitPrice: b.unit_price ?? null,
                units: b.units || 1,
                actualCost: b.actual_cost || 0,
                paidAmount: b.paid_amount || 0,
                dueDate: date(b.due_date),
                paidAt: date(b.paid_at),
                notes: b.notes || null,
            };
            return prisma.budgetItem.upsert({
                where: { id: b.id },
                update: data,
                create: { id: b.id, createdAt: date(b.created_at) ?? new Date(), ...data },
            });
        });

        await copy('Guests', await fetchAll('guests'), (g) => {
            const data = {
                weddingId: g.wedding_id,
                name: g.name || 'Guest',
                email: g.email || null,
                groupCategory: g.group_category || null,
                rsvpStatus: g.rsvp_status || 'pending',
                priority: ['A', 'B', 'C'].includes(g.priority) ? g.priority : 'B',
                mealPreference: g.meal_preference || null,
                plusOne: !!g.plus_one,
                tableAssignment: g.table_assignment || null,
                companionGuestCount: g.companion_guest_count || 0,
                companionNames: json(g.companion_names),
                selectedCompanions: json(g.selected_companions),
                whatsappNumber: g.whatsapp_number || null,
            };
            return prisma.guest.upsert({
                where: { id: g.id },
                update: data,
                create: { id: g.id, createdAt: date(g.created_at) ?? new Date(), ...data },
            });
        });

        await copy('Checklist items', await fetchAll('checklist_items'), (t) => {
            const data = {
                weddingId: t.wedding_id,
                title: t.title || 'Task',
                category: t.category || null,
                dueDate: date(t.due_date),
                isCompleted: !!t.is_completed,
                notes: t.notes || null,
            };
            return prisma.checklistItem.upsert({
                where: { id: t.id },
                update: data,
                create: { id: t.id, createdAt: date(t.created_at) ?? new Date(), ...data },
            });
        });

        await copy('Vendors', await fetchAll('vendors'), (v) => {
            const data = {
                weddingId: v.wedding_id,
                category: v.category || null,
                companyName: v.company_name || null,
                contactName: v.contact_name || null,
                email: v.email || null,
                phone: v.phone || null,
                website: v.website || null,
                cost: v.cost ?? null,
                deposit: v.deposit ?? null,
                priceEstimate: v.price_estimate ?? null,
                pricingType: v.pricing_type || null,
                pricingUnit: v.pricing_unit || null,
                status: normalizeVendorStatus(v.status),
                notes: v.notes || null,
            };
            return prisma.vendor.upsert({
                where: { id: v.id },
                update: data,
                create: { id: v.id, createdAt: date(v.created_at) ?? new Date(), ...data },
            });
        });

        await copy('Inventory items', await fetchAll('inventory_items'), (i) => {
            const data = {
                weddingId: i.wedding_id,
                name: i.name || 'Item',
                category: i.category || null,
                quantity: i.quantity || 1,
                unitPrice: i.unit_cost ?? i.unit_price ?? null,
                status: i.status || 'needed',
                link: i.link || null,
                notes: i.notes || null,
            };
            return prisma.inventoryItem.upsert({
                where: { id: i.id },
                update: data,
                create: { id: i.id, createdAt: date(i.created_at) ?? new Date(), ...data },
            });
        });

        await copy('Events', await fetchAll('events'), (e) => {
            const data = {
                weddingId: e.wedding_id,
                title: e.title || 'Event',
                description: e.description || null,
                startTime: date(e.start_time),
                endTime: date(e.end_time),
                location: e.location || null,
                category: e.category || e.type || null,
                notes: e.notes || null,
            };
            return prisma.event.upsert({
                where: { id: e.id },
                update: data,
                create: { id: e.id, createdAt: date(e.created_at) ?? new Date(), ...data },
            });
        });

        // Pending team invites, so links already sent keep working
        await copy('Invitations', await fetchAll('invitations'), (inv) => {
            const data = {
                weddingId: inv.wedding_id,
                token: inv.token,
                email: inv.email || null,
                role: inv.role === 'viewer' ? 'viewer' : 'editor',
                accepted: inv.status === 'accepted' || !!inv.accepted,
            };
            return prisma.invitation.upsert({
                where: { id: inv.id },
                update: data,
                create: { id: inv.id, createdAt: date(inv.created_at) ?? new Date(), ...data },
            });
        });

        // 4. Planner data
        await copy('Clients', await fetchAll('clients'), (c) => {
            const data = {
                plannerId: c.planner_id,
                name: c.name || null,
                firstName: c.first_name || null,
                lastName: c.last_name || null,
                email: c.email || null,
                phone: c.phone || null,
                weddingDate: date(c.wedding_date),
                budget: c.budget ?? null,
                status: c.status || 'lead',
                notes: c.notes || null,
                weddingId: c.wedding_id || null,
            };
            return prisma.client.upsert({
                where: { id: c.id },
                update: data,
                create: { id: c.id, createdAt: date(c.created_at) ?? new Date(), ...data },
            });
        });

        await copy('Directory vendors', await fetchAll('vendor_directory'), (d) => {
            const data = {
                userId: d.user_id,
                companyName: d.company_name || null,
                category: d.category || null,
                contactName: d.contact_name || null,
                email: d.email || null,
                phone: d.phone || null,
                website: d.website || null,
                notes: d.notes || null,
                rating: d.rating ?? null,
                priceEstimate: d.price_estimate ?? null,
                pricingType: d.pricing_type || null,
                pricingUnit: d.pricing_unit || null,
            };
            return prisma.directoryVendor.upsert({
                where: { id: d.id },
                update: data,
                create: { id: d.id, createdAt: date(d.created_at) ?? new Date(), ...data },
            });
        });

        console.log("🎉 Migration finished.");
    } catch (e) {
        console.error("Migration failed:", e);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
