// import Link
import { Link } from '@inertiajs/react';

// import icons
import { Plus } from 'lucide-react';

// import hasAnyPermission
import hasAnyPermission from '@/Utils/Permission';

export default function PageHeader({ showButton, title, description, action, actionText, permission }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-xl font-bold text-gray-900">
                    {title}
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                    {description}
                </p>
            </div>
            
            {showButton && permission && (
                <div className="mt-4 sm:mt-0">
                    {
                        hasAnyPermission(permission) && (
                            <Link 
                                href={action}
                                className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm hover:shadow transition-all duration-200"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                {actionText}
                            </Link>
                        )
                    }
                </div>
            )}
        </div>
    );
}