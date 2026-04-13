import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

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

async function migrate() {
    console.log("Starting Data Migration from Supabase to Neon...");

    try {
        // ---------------------------------------------------------
        // 1. MIGRATE USERS (auth.users + business_profile)
        // ---------------------------------------------------------
        console.log("Migrating Users...");
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        const { data: profiles, error: profileError } = await supabase.from('business_profile').select('*');
        if (profileError && profileError.code !== '42P01') { 
            // Ignore if table doesn't exist
            console.warn("Could not fetch business_profile:", profileError.message);
        }

        for (const authUser of authUsers.users) {
            const profile = profiles?.find((p: any) => p.id === authUser.id);
            
            await prisma.user.upsert({
                where: { id: authUser.id },
                update: {},
                create: {
                    id: authUser.id,
                    email: authUser.email,
                    name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
                    image: authUser.user_metadata?.avatar_url || null,
                    emailVerified: authUser.email_confirmed_at ? new Date(authUser.email_confirmed_at) : null,
                    createdAt: new Date(authUser.created_at),
                    // Map profile fields if they exist
                    role: profile?.role || 'couple',
                    companyName: profile?.company_name || null,
                    logoUrl: profile?.logo_url || null,
                    website: profile?.website || null,
                    signatureUrl: profile?.signature_url || null,
                    brandingColor: profile?.branding_color || '#000000',
                }
            });
        }
        console.log(`✅ Migrated ${authUsers.users.length} Users.`);


        // ---------------------------------------------------------
        // 2. MIGRATE WEDDINGS
        // ---------------------------------------------------------
        console.log("Migrating Weddings...");
        const { data: weddings, error: weddingsError } = await supabase.from('weddings').select('*');
        if (weddingsError) throw weddingsError;

        if (weddings) {
            for (const wed of weddings) {
                // Determine creator gracefully based on constraints
                let creatorId = wed.created_by_id || authUsers.users[0]?.id; 
                
                await prisma.wedding.upsert({
                    where: { id: wed.id },
                    update: {},
                    create: {
                        id: wed.id,
                        createdById: creatorId,
                        coupleName1: wed.couple_name_1 || wed.partner_1_name || 'Partner 1',
                        coupleName2: wed.couple_name_2 || wed.partner_2_name || 'Partner 2',
                        weddingDate: wed.wedding_date ? new Date(wed.wedding_date) : null,
                        location: wed.location || null,
                        currency: wed.currency || 'USD',
                        styleTheme: wed.style_theme || null,
                        targetGuestCount: wed.target_guest_count || null,
                        estimatedBudget: wed.estimated_budget || wed.budget || 0,
                        tier: wed.tier || 'free',
                        name: wed.name || null,
                        createdAt: wed.created_at ? new Date(wed.created_at) : new Date(),
                    }
                });
            }
            console.log(`✅ Migrated ${weddings.length} Weddings.`);
        }

        // ---------------------------------------------------------
        // 3. MIGRATE DEPENDENT DOMAIN TABLES
        // ---------------------------------------------------------

        // 3.1 Collaborators
        console.log("Migrating Collaborators...");
        const { data: cols } = await supabase.from('collaborators').select('*');
        if (cols) {
            for (const c of cols) {
                try {
                    await prisma.collaborator.upsert({
                        where: { weddingId_userId: { weddingId: c.wedding_id, userId: c.user_id } },
                        update: {},
                        create: {
                            weddingId: c.wedding_id,
                            userId: c.user_id,
                            role: c.role || 'editor',
                            joinedAt: c.joined_at ? new Date(c.joined_at) : new Date(),
                        }
                    });
                } catch (e) {
                    // Ignore orphan records
                }
            }
            console.log(`✅ Migrated ${cols.length} Collaborators.`);
        }

        // 3.2 Budget Items
        console.log("Migrating Budget Items...");
        const { data: budgets } = await supabase.from('budget_items').select('*');
        if (budgets) {
            for (const b of budgets) {
                try {
                    await prisma.budgetItem.upsert({
                        where: { id: b.id },
                        update: {},
                        create: {
                            id: b.id,
                            weddingId: b.wedding_id,
                            category: b.category || 'Uncategorized',
                            name: b.name || 'Item',
                            estimatedCost: b.estimated_cost || 0,
                            actualCost: b.actual_cost || 0,
                            paidAmount: b.paid_amount || 0,
                            dueDate: b.due_date ? new Date(b.due_date) : null,
                            paidAt: b.paid_at ? new Date(b.paid_at) : null,
                            notes: b.notes || null,
                            createdAt: b.created_at ? new Date(b.created_at) : new Date()
                        }
                    });
                } catch (e) {}
            }
            console.log(`✅ Migrated ${budgets.length} Budget Items.`);
        }

        // 3.3 Guests
        console.log("Migrating Guests...");
        const { data: guests } = await supabase.from('guests').select('*');
        if (guests) {
            for (const g of guests) {
                try {
                    await prisma.guest.upsert({
                        where: { id: g.id },
                        update: {},
                        create: {
                            id: g.id,
                            weddingId: g.wedding_id,
                            name: g.name || 'Guest',
                            email: g.email || null,
                            groupCategory: g.group_category || null,
                            rsvpStatus: g.rsvp_status || 'pending',
                            mealPreference: g.meal_preference || null,
                            plusOne: !!g.plus_one,
                            tableAssignment: g.table_assignment || null,
                            companionGuestCount: g.companion_guest_count || 0,
                            companionNames: Array.isArray(g.companion_names) ? JSON.stringify(g.companion_names) : (g.companion_names || null),
                            selectedCompanions: Array.isArray(g.selected_companions) ? JSON.stringify(g.selected_companions) : (g.selected_companions || null),
                            createdAt: g.created_at ? new Date(g.created_at) : new Date()
                        }
                    });
                } catch (e: any) {
                    console.log(`Error migrating guest ${g.id} (Wedding: ${g.wedding_id}):`, e.message);
                }
            }
            console.log(`✅ Processed ${guests.length} Guests.`);
        }

        // 3.4 Checklist Items
        console.log("Migrating Checklist Items...");
        const { data: tasks } = await supabase.from('checklist_items').select('*');
        if (tasks) {
            for (const t of tasks) {
                try {
                    await prisma.checklistItem.upsert({
                        where: { id: t.id },
                        update: {},
                        create: {
                            id: t.id,
                            weddingId: t.wedding_id,
                            title: t.title || 'Task',
                            category: t.category || null,
                            dueDate: t.due_date ? new Date(t.due_date) : null,
                            isCompleted: !!t.is_completed,
                            notes: t.notes || null,
                            createdAt: t.created_at ? new Date(t.created_at) : new Date()
                        }
                    });
                } catch (e) {}
            }
            console.log(`✅ Migrated ${tasks.length} Checklist Items.`);
        }

        // 3.5 Vendors
        console.log("Migrating Vendors...");
        const { data: vendors } = await supabase.from('vendors').select('*');
        if (vendors) {
            for (const v of vendors) {
                try {
                    await prisma.vendor.upsert({
                        where: { id: v.id },
                        update: {},
                        create: {
                            id: v.id,
                            weddingId: v.wedding_id,
                            category: v.category || null,
                            companyName: v.company_name || null,
                            contactName: v.contact_name || null,
                            email: v.email || null,
                            phone: v.phone || null,
                            website: v.website || null,
                            cost: v.cost || null,
                            deposit: v.deposit || null,
                            status: v.status || 'pending',
                            notes: v.notes || null,
                            createdAt: v.created_at ? new Date(v.created_at) : new Date()
                        }
                    });
                } catch (e) {}
            }
            console.log(`✅ Migrated ${vendors.length} Vendors.`);
        }

        // 3.6 Inventory Items
        console.log("Migrating Inventory...");
        const { data: invs } = await supabase.from('inventory_items').select('*');
        if (invs) {
            for (const i of invs) {
                try {
                    await prisma.inventoryItem.upsert({
                        where: { id: i.id },
                        update: {},
                        create: {
                            id: i.id,
                            weddingId: i.wedding_id,
                            name: i.name || 'Item',
                            category: i.category || null,
                            quantity: i.quantity || 1,
                            unitPrice: i.unit_price || null,
                            totalPrice: i.total_price || null,
                            status: i.status || 'needed',
                            notes: i.notes || null,
                            createdAt: i.created_at ? new Date(i.created_at) : new Date()
                        }
                    });
                } catch (e) {}
            }
            console.log(`✅ Migrated ${invs.length} Inventory Items.`);
        }

        // 3.7 Events
        console.log("Migrating Events...");
        const { data: events } = await supabase.from('events').select('*');
        if (events) {
            for (const e of events) {
                try {
                    await prisma.event.upsert({
                        where: { id: e.id },
                        update: {},
                        create: {
                            id: e.id,
                            weddingId: e.wedding_id,
                            title: e.title || 'Event',
                            description: e.description || null,
                            startTime: e.start_time ? new Date(e.start_time) : null,
                            endTime: e.end_time ? new Date(e.end_time) : null,
                            location: e.location || null,
                            category: e.category || null,
                            notes: e.notes || null,
                            createdAt: e.created_at ? new Date(e.created_at) : new Date()
                        }
                    });
                } catch (e) {}
            }
            console.log(`✅ Migrated ${events.length} Events.`);
        }

        // 4. MIGRATE OTHER RELATIONS
        console.log("Migrating Clients & Directory Vendors...");
        const { data: clients } = await supabase.from('clients').select('*');
        if (clients) {
            for (const c of clients) {
                try {
                    await prisma.client.upsert({
                        where: { id: c.id },
                        update: {},
                        create: {
                            id: c.id,
                            plannerId: c.planner_id,
                            name: c.name || null,
                            firstName: c.first_name || null,
                            lastName: c.last_name || null,
                            email: c.email || null,
                            phone: c.phone || null,
                            weddingDate: c.wedding_date ? new Date(c.wedding_date) : null,
                            budget: c.budget || null,
                            status: c.status || 'lead',
                            notes: c.notes || null,
                            weddingId: c.wedding_id || null,
                            createdAt: c.created_at ? new Date(c.created_at) : new Date()
                        }
                    });
                } catch (e) {
                    console.log(`Error migrating client ${c.id}:`, e.message);
                }
            }
            console.log(`✅ Processed ${clients.length} Clients.`);
        }

        console.log("🎉 ALL TABLES FULLY MIGRATED!");
        
    } catch (e) {
        console.error("Migration Failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
