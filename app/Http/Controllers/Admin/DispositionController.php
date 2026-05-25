<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Disposition;
use App\Models\Letter;
use App\Services\DispositionService;
use Illuminate\Http\Request;

class DispositionController extends Controller
{
    public function index(DispositionService $dispositionService)
    {
        return inertia('Admin/Dispositions/Index', [
            'dispositions' => Disposition::with(['letter:id,reference,letter_number,subject,type,status', 'fromUser:id,name,username'])
                ->latest()
                ->paginate(10),
            'letters' => Letter::select('id', 'reference', 'letter_number', 'subject', 'type')->latest()->limit(50)->get(),
            'targetOptions' => $dispositionService->optionsFor(auth()->user(), true),
        ]);
    }

    public function store(Request $request, DispositionService $dispositionService)
    {
        $validated = $request->validate([
            'letter_id' => 'required|exists:letters,id',
            'target_type' => 'required|in:division,department,directorate,division_gm,department_manager',
            'target_id' => 'required|integer',
            'note' => 'nullable|string',
            'status' => 'nullable|in:open,done',
        ]);

        $letter = Letter::query()->findOrFail($validated['letter_id']);
        $user = $request->user();

        $dispositionService->assertAllowed($user, $validated['target_type'], (int) $validated['target_id'], true, $letter);

        $disposition = Disposition::create([
            'letter_id' => $letter->id,
            'target_type' => $validated['target_type'],
            'target_id' => (int) $validated['target_id'],
            'note' => $validated['note'] ?? null,
            'status' => $validated['status'] ?? 'open',
            'from_user_id' => $user->id,
            'from_directorate_id' => $user->directorate_id,
            'from_division_id' => $user->division_id,
            'from_department_id' => $user->department_id,
        ]);

        $dispositionService->notifyUsers($letter, $user, $disposition->target_type, (int) $disposition->target_id, $disposition->note);

        if ($letter->status === 'received') {
            $letter->update(['status' => 'disposed']);
        }

        return back()->with('success', 'Disposisi berhasil dibuat.');
    }

    public function update(Request $request, Disposition $disposition)
    {
        $validated = $request->validate([
            'status' => 'required|in:open,done',
            'note' => 'nullable|string',
        ]);

        $disposition->update($validated + [
            'completed_at' => $validated['status'] === 'done' ? now() : null,
        ]);

        return back()->with('success', 'Disposisi berhasil diperbarui.');
    }
}
