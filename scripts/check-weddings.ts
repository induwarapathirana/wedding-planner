import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function check() {
    const allWeds = await prisma.wedding.findMany({
        include: {
            collaborators: {
                include: { user: true }
            },
            createdBy: true
        }
    });
    
    console.log(`Total Weddings: ${allWeds.length}`);
    for (const w of allWeds) {
        console.log(`\nWedding: ${w.coupleName1} & ${w.coupleName2}`);
        console.log(`Creator: ${w.createdBy?.email} (${w.createdById})`);
        console.log(`Collaborators:`);
        for (const c of w.collaborators) {
            console.log(` - ${c.user?.email} (${c.role})`);
        }
    }
}

check().finally(() => prisma.$disconnect());
