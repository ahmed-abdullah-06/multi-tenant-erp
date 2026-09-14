const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 1. Create Admin User
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);

    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@demo.com' },
        update: {},
        create: {
            name: 'System Admin',
            email: 'admin@demo.com',
            passwordHash,
            status: 'ACTIVE'
        }
    });
    console.log('✔ Admin user created (admin@demo.com / admin123)');

    // 2. Create Demo Organization
    const org = await prisma.organization.upsert({
        where: { slug: 'demo-corp' },
        update: {},
        create: {
            name: 'Demo Corporation',
            slug: 'demo-corp',
            status: 'ACTIVE'
        }
    });
    console.log('✔ Demo organization created');

    // 3. Create Owner Role & Permissions
    const permissions = [
        'users:read', 'users:write', 'organizations:read', 'organizations:write',
        'rbac:read', 'rbac:write', 'employees:read', 'employees:write',
        'inventory:read', 'inventory:write', 'purchasing:read', 'purchasing:write',
        'sales:read', 'sales:write', 'expenses:read', 'expenses:write',
        'reports:read', 'notifications:read', 'notifications:write',
        'audit:read', 'billing:read', 'billing:write'
    ];

    let role = await prisma.role.findFirst({
        where: { name: 'Owner', organizationId: org.id }
    });

    if (!role) {
        role = await prisma.role.create({
            data: {
                name: 'Owner',
                description: 'Full administrative access',
                organizationId: org.id,
                isSystem: true
            }
        });
    }

    for (const action of permissions) {
        const moduleName = action.split(':')[0];
        const perm = await prisma.permission.upsert({
            where: { action },
            update: {},
            create: { action, module: moduleName, description: `Permission for ${action}` }
        });

        const linked = await prisma.rolePermission.findUnique({
            where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } }
        });
        if (!linked) {
            await prisma.rolePermission.create({
                data: { roleId: role.id, permissionId: perm.id }
            });
        }
    }
    console.log('✔ Roles and Permissions configured');

    // 4. Create Membership
    const membership = await prisma.membership.findUnique({
        where: { userId_organizationId: { userId: adminUser.id, organizationId: org.id } }
    });

    if (!membership) {
        await prisma.membership.create({
            data: {
                userId: adminUser.id,
                organizationId: org.id,
                roleId: role.id,
                status: 'ACTIVE'
            }
        });
    }
    console.log('✔ Admin assigned to Demo Corporation');

    // 5. Create Sample Warehouse & Category
    let warehouse = await prisma.warehouse.findFirst({ where: { name: 'Main Distribution Center', organizationId: org.id } });
    if (!warehouse) {
        warehouse = await prisma.warehouse.create({
            data: { name: 'Main Distribution Center', code: 'MDC-01', organizationId: org.id, status: 'ACTIVE' }
        });
    }

    let category = await prisma.category.findFirst({ where: { name: 'Electronics', organizationId: org.id } });
    if (!category) {
        category = await prisma.category.create({
            data: { name: 'Electronics', description: 'Tech gadgets and devices', organizationId: org.id }
        });
    }

    // 6. Create Sample Products & Inventory Balances
    const sampleProducts = [
        { name: 'Quantum Laptop Pro', sku: 'QLP-2026', price: 1299.99, cost: 850.00, stock: 45, minStockLevel: 10 },
        { name: 'Neural Link Headset', sku: 'NLH-01', price: 299.99, cost: 120.00, stock: 120, minStockLevel: 20 },
        { name: 'Haptic Feedback Gloves', sku: 'HFG-99', price: 149.99, cost: 60.00, stock: 8, minStockLevel: 15 } // Will trigger low-stock alert
    ];

    for (const sp of sampleProducts) {
        let product = await prisma.product.findFirst({ where: { sku: sp.sku, organizationId: org.id } });
        if (!product) {
            product = await prisma.product.create({
                data: {
                    ...sp,
                    organizationId: org.id,
                    categoryId: category.id
                }
            });

            await prisma.inventoryBalance.create({
                data: {
                    organizationId: org.id,
                    productId: product.id,
                    warehouseId: warehouse.id,
                    quantity: sp.stock
                }
            });
        }
    }
    console.log('✔ Sample products and inventory populated');
    console.log('✅ Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });