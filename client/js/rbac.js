document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return; // If no token, your existing login redirect will handle it

    try {
        // Fetch the user's profile, including their active role and permissions
        const response = await fetch('/api/v1/auth/me', {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.data.permissions) {
            const userPermissions = result.data.permissions; // e.g., ['inventory:read', 'inventory:write']
            const isSuperAdmin = userPermissions.includes('*'); // Assuming '*' means full access

            // Find every HTML element that is guarded by a permission
            const securedElements = document.querySelectorAll('[data-permission]');
            
            securedElements.forEach(el => {
                const requiredPermission = el.getAttribute('data-permission');
                
                // If the user lacks the required permission, remove the element entirely
                if (!isSuperAdmin && !userPermissions.includes(requiredPermission)) {
                    el.remove(); // Safer than display:none, it actually deletes the HTML node
                }
            });
        }
    } catch (error) {
        console.error('Failed to apply RBAC UI rules:', error);
    }
});