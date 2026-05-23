// import icons
import { FileText, Hash, Calendar } from "lucide-react";

export default function LetterInformation(letter) {

    // format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Informasi Surat
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="text-sm font-medium text-gray-500">Jenis Surat</label>
                    <p className="text-gray-900 font-semibold">{letter.template?.name || '-'}</p>
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-500">Nomor Surat</label>
                    <div className="flex items-center">
                        <Hash className="w-4 h-4 text-gray-400 mr-2" />
                        <p className="text-gray-900 font-semibold">
                            {letter.letter_number || 'Belum ada nomor'}
                        </p>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-500">Referensi</label>
                    <p className="text-gray-900 font-mono">{letter.reference}</p>
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p className="text-gray-900 font-semibold">{letter.status}</p>
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-500">Diajukan Pada</label>
                    <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <p className="text-gray-900 font-semibold">{formatDate(letter.created_at)}</p>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-500">Terakhir Diupdate</label>
                    <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <p className="text-gray-900 font-semibold">{formatDate(letter.updated_at)}</p>
                    </div>
                </div>
            </div>
        </div>

    );
}