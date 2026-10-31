import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function check() {
    const guests = await prisma.guest.findMany();
    console.log(`Total Guests in DB: ${guests.length}`);
    
    if (guests.length > 0) {
        console.log(`\nExample Guest:`, guests[0].name);
        console.log(`Linked Wedding ID:`, guests[0].weddingId);
        
        const wedding = await prisma.wedding.findUnique({
            where: { id: guests[0].weddingId },
            include: { collaborators: { include: { user: true } } }
        });
        
        if (wedding) {
            console.log(`Guest belongs to Wedding: ${wedding.coupleName1} & ${wedding.coupleName2}`);
            console.log(`Wedding Collaborators:`);
            wedding.collaborators.forEach(c => {
                console.log(` - ${c.user.email} (${c.role})`);
            });
        } else {
            console.log(`WARNING: Guest linked to an unknown Wedding ID!`);
        }
        
        // Let's specifically check the user's wedding
        const userEmail = "induwara1203@gmail.com";
        const myUser = await prisma.user.findUnique({ where: { email: userEmail } });
        if (myUser) {
            const myCollabs = await prisma.collaborator.findMany({ where: { userId: myUser.id } });
            for (const col of myCollabs) {
                const myGuests = await prisma.guest.findMany({ where: { weddingId: col.weddingId } });
                console.log(`\nYour Wedding (${col.weddingId}) has ${myGuests.length} guests.`);
            }
        }
    }
}

check().finally(() => prisma.$disconnect());
