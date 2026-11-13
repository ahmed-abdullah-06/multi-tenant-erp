// Script to fix permission format in the database
// Run this once to migrate from old format to new format
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Fixing permission formats...\n');

    // Get all permissions
    const permissions = await prisma.permission.findMany();
    
    console.log(`Found ${permissions.length} permissions in database`);
    
    // Find old format permissions (action:module instead of module:action)
    const oldFormatPerms = permissions.filter(p => {
        const parts = p.action.split(':');
        if (parts.length !== 2) return false;
        
        // Old format: read:users, write:users, etc.
        // New format: users:read, users:write, etc.
        const actions = ['read', 'write', 'delete', 'create', 'manage'];
        return actions.includes(parts[0]);
    });
    
    console.log(`Found ${oldFormatPerms.length} old format permissions to fix\n`);
    
    if (oldFormatPerms.length === 0) {
        console.log('✅ All permissions are in correct format!');
        return;
    }
    
    // Delete old format permissions
    console.log('Deleting old format permissions...');
    for (const perm of oldFormatPerms) {
        console.log(`  - Deleting: ${perm.action}`);
        
        // First delete role permissions that reference it
        await prisma.rolePermission.deleteMany({
            where: { permissionId: perm.id }
        });
        
        // Then delete the permission
        await prisma.permission.delete({
            where: { id: perm.id }
        });
    }
    
    console.log('\n✅ Old permissions removed!');
    console.log('\nNow run: npm run seed');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
