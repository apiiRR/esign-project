// import icons
import { Edit2 } from "lucide-react";

export default function renderPayload(data) {

    // Cek jika data payload kosong
    if (!data || Object.keys(data).length === 0) return null;

    // Filter out system fields
    const systemFields = ['submitted_at', 'submitted_by', 'template_name'];
    const payloadData = Object.entries(data).filter(([key]) => !systemFields.includes(key));

    // Cek jika data payload masih kosong
    if (payloadData.length === 0) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center border-b border-gray-200 pb-4">
                <Edit2 className="w-5 h-5 mr-2 text-blue-600" />
                Data Formulir Pengajuan
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {payloadData.map(([key, value]) => (
                    <div key={key} className="p-4 bg-gray-100 rounded-xl">
                        <label className="text-sm font-medium text-gray-500 capitalize block mb-2">
                            {key.replace(/_/g, ' ')}
                        </label>
                        <p className="text-gray-900 whitespace-pre-wrap font-semibold">{value || '-'}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};