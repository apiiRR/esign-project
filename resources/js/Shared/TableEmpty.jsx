// import icons
import { Inbox } from 'lucide-react';

export default function TableEmpty({ title, description, colSpan }) {
    return (
        <tr>
            <td colSpan={colSpan} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-gray-500">
                    <Inbox className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-md font-medium text-gray-900 mb-2">
                        {title}
                    </p>
                    <p className="text-sm text-gray-600 mb-6">
                        {description}
                    </p>
                </div>
            </td>
        </tr>
    );
}
