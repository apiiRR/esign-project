// import usePage dari Inertia
import { usePage } from '@inertiajs/react';

export default function hasAnyPermission(permissions) {

    // destructure props "auth" dari usePage
    const { auth } = usePage().props;
    
    // Pastikan auth.permissions ada dan tidak null/undefined
    const allPermissions = auth.permissions || {};
    
    // Jika permissions adalah string, konversi ke array
    if (typeof permissions === 'string') {
        permissions = [permissions];
    }
    
    // Cek setiap permission
    return permissions.some(permission => {
        // Check if permission exists in allPermissions
        return allPermissions[permission] === true;
    });
}

// Export helper function untuk check single permission
export function hasPermission(permission) {
    return hasAnyPermission([permission]);
}

// Export helper function untuk check role
export function hasRole(roleName) {

    // destructure props "auth" dari usePage
    const { auth } = usePage().props;
    
    // Pastikan auth.user ada dan tidak null/undefined
    if (!auth.user || !auth.user.roles) {
        return false;
    }
    
    // Cek apakah user memiliki role yang sesuai
    return auth.user.roles.some(role => role.name === roleName);
}