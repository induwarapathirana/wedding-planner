import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function check() {
    const email = "induwara1203@gmail.com";
    
    // Exact identical query that PrismaAdapter uses
    const user = await prisma.user.findUnique({ where: { email } });
    console.log("NextAuth getUserByEmail result:", user ? user.id : "null");

    if (user) {
        // Look up Account
        const accounts = await prisma.account.findMany({ where: { userId: user.id } });
        console.log("User Accounts:", accounts.map(a => a.provider));
    }
}

check().finally(() => prisma.$disconnect());
