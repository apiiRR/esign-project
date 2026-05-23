// import inertia router
import { router } from '@inertiajs/react';

// import icons
import { Trash2 } from 'lucide-react';

// import Sweet Alert
import Swal from 'sweetalert2';

export default function Delete({ URL, id }) {

    // method destroy
    const destroy = async (id) => {

        // show sweet alert
        Swal.fire({
            title: 'Apakah Anda Yakin?',
            text: "Data yang telah dihapus tidak dapat dikembalikan!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {

                // delete
                router.delete(`${URL}/${id}`)
            }
        })
    }

    return (
        <>
            <button
                onClick={() => destroy(id)}
                className="inline-flex items-center p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg"
                title="Hapus"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </>
    )
}