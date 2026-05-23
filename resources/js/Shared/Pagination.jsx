//import Link
import { Link } from '@inertiajs/react';

export default function Pagination({ links }) {

    return (
        <nav className="flex justify-end">
            <ul className="inline-flex items-center -space-x-px">
                {links.map((link, index) => (
                    <li 
                        key={index} 
                        className={`
                            ${link.url == null ? 'cursor-not-allowed opacity-50' : ''} 
                            ${link.active ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}
                            ${index === 0 ? 'rounded-l-lg' : ''}
                            ${index === links.length - 1 ? 'rounded-r-lg' : ''}
                            relative inline-flex items-center border px-3 py-2 text-sm font-medium focus:z-20
                        `}
                    >
                        <Link 
                            href={link.url === null ? '#' : link.url} 
                            className={`
                                ${link.url == null ? 'pointer-events-none' : ''}
                                ${link.active ? 'text-blue-600' : 'text-gray-700 hover:text-gray-900'}
                                inline-flex items-center
                            `}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        ></Link>
                    </li>
                ))}
            </ul>
        </nav>  
    );
}