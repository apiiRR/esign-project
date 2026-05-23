<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditTrail;
use App\Models\Disposition;
use App\Models\Letter;
use Illuminate\Http\Request;

class DispositionController extends Controller
{
    public function index()
    {
        return inertia('Admin/Dispositions/Index', [
            'dispositions' => Disposition::with(['letter:id,reference,subject,type,status', 'fromUser:id,name,username'])
                ->latest()
                ->paginate(10),
            'letters' => Letter::select('id', 'reference', 'subject')->latest()->limit(50)->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'letter_id' => 'required|exists:letters,id',
            'target_type' => 'required|in:user,division,department,directorate,division_gm,department_manager',
            'target_id' => 'nullable|integer',
            'note' => 'nullable|string',
            'status' => 'required|in:open,done',
        ]);

        $disposition = Disposition::create([
            ...$validated,
            'from_user_id' => auth()->id(),
        ]);

        AuditTrail::create([
            'user_id' => auth()->id(),
            'action' => 'dispositions.created',
            'auditable_type' => Disposition::class,
            'auditable_id' => $disposition->id,
            'meta' => $validated,
        ]);

        return back()->with('success', 'Disposisi berhasil dibuat.');
    }

    public function update(Request $request, Disposition $disposition)
    {
        $validated = $request->validate([
            'status' => 'required|in:open,done',
            'note' => 'nullable|string',
        ]);

        $disposition->update($validated);

        return back()->with('success', 'Disposisi berhasil diperbarui.');
    }
}
