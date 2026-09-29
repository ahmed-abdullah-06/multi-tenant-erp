document.addEventListener('DOMContentLoaded', async () => {
    let token = localStorage.getItem('accessToken') || localStorage.getItem('auth_token');
    if (!token) {
        try {
            const rawSession = localStorage.getItem('erp_session');
            if (rawSession) {
                const session = JSON.parse(rawSession);
                if (session.token) token = session.token;
            }
        } catch (e) {}
    }
    if (!token) return;

    try {
        let userPermissions = [];
        let isSuperAdmin = false;

        // First check locally cached user_access
        try {
            const accessRaw = localStorage.getItem('user_access');
            if (accessRaw) {
                const access = JSON.parse(accessRaw);
                if (access.roleName === 'Owner' || access.roleName === 'Admin') {
                    isSuperAdmin = true;
                }
                if (Array.isArray(access.permissions)) {
                    userPermissions = access.permissions;
                }
            }
        } catch (e) {}

        // Fetch fresh profile from API
        if (!isSuperAdmin) {
            try {
                const response = await fetch('/api/v1/auth/me', {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                const result = await response.json();
                
                if (response.ok && result.data) {
                    if (Array.isArray(result.data.permissions)) {
                        userPermissions = result.data.permissions;
                    } else if (result.data.memberships && result.data.memberships.length > 0) {
                        const role = result.data.memberships[0]?.role;
                        if (role?.name === 'Owner' || role?.name === 'Admin') {
                            isSuperAdmin = true;
                        }
                        if (role?.permissions) {
                            userPermissions = role.permissions.map(p => p.action || p.permission?.action || p);
                        }
                    }
                }
            } catch (err) {
                console.warn('Could not refresh RBAC permissions from server:', err);
            }
        }

        if (isSuperAdmin || userPermissions.includes('*')) {
            return; // Superadmin has full access to all UI elements
        }

        // Find every HTML element that is guarded by a permission
        const securedElements = document.querySelectorAll('[data-permission]');
        securedElements.forEach(el => {
            const requiredPermission = el.getAttribute('data-permission');
            let hasPerm = userPermissions.includes(requiredPermission);

            if (!hasPerm && requiredPermission.includes(':')) {
                const parts = requiredPermission.split(':');
                const inverted = `${parts[1]}:${parts[0]}`;
                hasPerm = userPermissions.includes(inverted);
            }

            // If user lacks permission, remove the element
            if (!hasPerm) {
                el.remove();
            }
        });
    } catch (error) {
        console.error('Failed to apply RBAC UI rules:', error);
    }
});