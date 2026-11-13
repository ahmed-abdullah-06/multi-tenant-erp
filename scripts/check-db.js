// Quick script to check database state
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Checking database state...\n');
    
    const admin = await prisma.user.findUnique({
        where: { email: 'admin@demo.com' }
    });
    
    console.log('Admin user:', admin ? `✓ Found (ID: ${admin.id})` : '✗ Not found');
    
    if (admin) {
        const memberships = await prisma.membership.findMany({
            where: { userId: admin.id },
            include: { organization: true, role: true }
        });
        
        console.log('Memberships:', memberships.length);
        memberships.forEach(m => {
            console.log(`  - ${m.organization.name} as ${m.role.name}`);
        });
    }
    
    const orgs = await prisma.organization.findMany();
    console.log('\nOrganizations:', orgs.length);
    orgs.forEach(o => console.log(`  - ${o.name} (${o.slug})`));
    
    const perms = await prisma.permission.findMany();
    console.log('\nPermissions:', perms.length);
    
    const products = await prisma.product.findMany();
    console.log('Products:', products.length);
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
