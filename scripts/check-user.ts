import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function check() {
    const email = "induwara1203@gmail.com";
    console.log(`Checking DB for email: ${email}`);

    const users = await prisma.user.findMany({ where: { email } });
    console.log(`\nFound ${users.length} Users:`);
    console.log(users.map(u => ({ id: u.id, email: u.email })));

    console.log(`\nLooking up Weddings for these Users...`);
    for (const u of users) {
        // Creator
        const weds = await prisma.wedding.findMany({ where: { createdById: u.id } });
        console.log(`User ${u.id} Created ${weds.length} Weddings.`);
        
        // Collaborator
        const cols = await prisma.collaborator.findMany({ where: { userId: u.id }, include: { wedding: true } });
        console.log(`User ${u.id} is Collaborator in ${cols.length} Weddings.`);
    }

    // List all weddings just to see who owns them
    const allWeds = await prisma.wedding.findMany();
    console.log(`\nTotal Weddings in DB: ${allWeds.length}`);
    if (allWeds.length > 0) {
        console.log(`Example Wedding ID: ${allWeds[0].id}, Creator: ${allWeds[0].createdById}`);
    }
}

check().finally(() => prisma.$disconnect());
