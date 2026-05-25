<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Disposition;
use App\Models\Directorate;
use App\Models\Division;
use App\Models\Letter;
use App\Models\LetterAttachment;
use App\Models\LetterReadReceipt;
use App\Models\LetterTarget;
use App\Models\LetterTemplate;
use App\Models\LetterType;
use App\Models\NotificationLog;
use App\Models\Setting;
use App\Models\User;
use App\Services\DispositionService;
use App\Services\LetterNumberGenerator;
use App\Services\LetterFieldRequirementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LetterController extends Controller
{
    public function index(Request $request, string $type = 'internal')
    {
        $isArchive = $type === 'arsip' || $type === 'archive';
        $mappedType = $this->mapType($type);

        $letters = Letter::query()
            ->with(['creator:id,name,username', 'template:id,name,category', 'letterType:id,name'])
            ->when($isArchive, fn ($query) => $query
                ->where('creation_method', 'scan')
                ->where('status', 'archived')
            )
            ->when(! $isArchive, fn ($query) => $query->where('type', $mappedType))
            ->when($request->q, fn ($query, $search) => $query->where(fn ($q) => $q
                ->where('title', 'like', "%{$search}%")
                ->orWhere('subject', 'like', "%{$search}%")
                ->orWhere('letter_number', 'like', "%{$search}%")
                ->orWhere('reference', 'like', "%{$search}%")
            ))
            ->when($request->filled('letter_type_ids'), fn ($query) => $query->whereIn('letter_type_id', (array) $request->letter_type_ids))
            ->when($request->filled('methods'), fn ($query) => $query->whereIn('creation_method', (array) $request->methods))
            ->when($request->filled('statuses'), fn ($query) => $query->whereIn('status', (array) $request->statuses))
            ->when($request->filled('creator_ids'), fn ($query) => $query->whereIn('created_by', (array) $request->creator_ids))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return inertia('Admin/Letters/Index', [
            'letters' => $letters,
            'type' => $isArchive ? 'archive' : $mappedType,
            'typeLabel' => $isArchive ? 'Arsip Surat' : $this->typeLabel($mappedType),
            'filterOptions' => [
                'letterTypes' => LetterType::query()->where('status', 'active')->orderBy('name')->get(['id', 'name']),
                'creators' => User::query()->whereNotNull('id')->orderBy('name')->get(['id', 'name']),
                'methods' => [
                    ['id' => 'scan', 'name' => 'Scan Surat'],
                    ['id' => 'template', 'name' => 'Buat dari Template'],
                ],
                'statuses' => collect(['draft', 'sent', 'received', 'disposed', 'archived', 'rejected'])
                    ->map(fn ($status) => ['id' => $status, 'name' => ucfirst($status)])
                    ->values(),
            ],
        ]);
    }

    public function create(string $mode)
    {
        $isArchive = $mode === 'arsip' || $mode === 'archive';
        $type = $this->mapType($mode);

        return inertia('Admin/Letters/Form', [
            'type' => $type,
            'isArchive' => $isArchive,
            'templateEnabled' => (bool) Setting::query()->value('enable_letter_template_method'),
            'templates' => LetterTemplate::where('status', 'active')
                ->whereIn('category', [$type === 'outgoing' ? 'outgoing' : 'internal', 'both'])
                ->orderBy('name')
                ->get(),
            'letterTypes' => LetterType::query()
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'numbering_enabled', 'numbering_contexts', 'numbering_format']),
            'targetOptions' => $this->targetOptions(),
        ]);
    }

    public function store(Request $request)
    {
        $templateEnabled = (bool) Setting::query()->value('enable_letter_template_method');
        $type = $request->input('type');
        $isArchive = $request->boolean('is_archive');
        $isInternal = $type === 'internal';
        $isOutgoing = $type === 'outgoing';
        $supportsTemplate = ($isInternal || $isOutgoing) && $templateEnabled;
        $context = $isArchive ? 'archive' : $type;
        $requirements = app(LetterFieldRequirementService::class);

        if (! $supportsTemplate) {
            $request->merge(['creation_method' => 'scan']);
        }

        $targetRules = 'required|in:directorate,division,department,division_gm,department_manager';

        try {
            $validated = $request->validate([
                'type' => 'required|in:incoming_external,outgoing,internal',
                'is_archive' => 'nullable|boolean',
                'submit_action' => $isInternal || $isOutgoing ? 'required|in:draft,send' : 'nullable',
                'creation_method' => $supportsTemplate ? 'required|in:scan,template' : 'required|in:scan',
                'letter_type_id' => 'required|exists:letter_types,id',
                'letter_template_id' => $supportsTemplate ? 'nullable|required_if:creation_method,template|exists:letter_templates,id' : 'nullable',
                'letter_number' => ($type === 'incoming_external' && ! $isArchive ? 'required' : ($requirements->required($context, 'letter_number') ? 'required' : 'nullable')) . '|string|max:255|unique:letters,letter_number',
                'subject' => 'required|string|max:255',
                'title' => 'nullable|string|max:255',
                'body_rendered' => $supportsTemplate ? 'nullable|string' : 'nullable',
                'page_count' => $supportsTemplate ? 'nullable|integer|min:1|max:999' : 'nullable',
                'scan_file' => 'bail|nullable|required_if:creation_method,scan|file|mimes:pdf|max:10240',
                'targets' => $isInternal ? 'required|array|min:1' : 'nullable|array',
                'targets.*.target_type' => $isInternal ? $targetRules : 'nullable',
                'targets.*.target_id' => $isInternal ? 'required|integer' : 'nullable',
                'cc_targets' => $isInternal ? 'nullable|array' : 'nullable|array',
                'cc_targets.*.target_type' => $isInternal ? $targetRules : 'nullable',
                'cc_targets.*.target_id' => $isInternal ? 'required|integer' : 'nullable',
                'payload' => 'nullable|array',
                'payload.origin_name' => $type === 'incoming_external' && ! $isArchive ? 'required|string|max:255' : 'nullable|string|max:255',
                'payload.internal_origin_type' => $isInternal || $isOutgoing ? 'required|in:directorate,division,department' : 'nullable',
                'payload.internal_origin_id' => $isInternal || $isOutgoing ? 'required|integer' : 'nullable',
                'payload.external_recipient' => $isOutgoing ? 'required|string|max:255' : 'nullable|string|max:255',
                'payload.notes' => in_array($type, ['incoming_external'], true) ? 'nullable|string' : 'nullable',
            ], $this->uploadValidationMessages());
        } catch (ValidationException $exception) {
            $this->logUploadValidationFailure($request, $exception);
            throw $exception;
        }

        $letter = DB::transaction(function () use ($request, $validated, $isInternal, $isOutgoing, $supportsTemplate) {
            $user = $request->user();
            $letterType = LetterType::query()->findOrFail($validated['letter_type_id']);
            $letterNumber = $validated['letter_number'] ?? null;

            if (! $letterNumber && $validated['type'] !== 'incoming_external') {
                $letterNumber = app(LetterNumberGenerator::class)->generate(
                    $letterType,
                    $user,
                    ($validated['is_archive'] ?? false) ? 'archive' : $validated['type'],
                    $validated['payload'] ?? []
                );
            }

            $letter = Letter::create([
                'type' => $validated['type'],
                'creation_method' => $validated['creation_method'],
                'letter_type_id' => $validated['letter_type_id'],
                'letter_template_id' => $supportsTemplate ? ($validated['letter_template_id'] ?? null) : null,
                'created_by' => $user->id,
                'origin_directorate_id' => $user->directorate_id,
                'origin_division_id' => $user->division_id,
                'origin_department_id' => $user->department_id,
                'title' => $validated['subject'],
                'subject' => $validated['subject'],
                'letter_number' => $letterNumber,
                'reference' => Str::uuid()->toString(),
                'page_count' => $supportsTemplate && $validated['creation_method'] === 'template' ? max(1, (int) ($validated['page_count'] ?? 1)) : 1,
                'status' => match (true) {
                    $isInternal || $isOutgoing => ($validated['submit_action'] === 'draft' ? 'draft' : 'sent'),
                    default => ($validated['is_archive'] ?? false) ? 'archived' : 'received',
                },
                'body_rendered' => $supportsTemplate ? ($validated['body_rendered'] ?? null) : null,
                'payload' => $validated['payload'] ?? [],
                'meta' => ['source' => 'admin'],
            ]);

            if ($isInternal) {
                foreach ($validated['targets'] as $target) {
                    $letter->targets()->create($target + ['kind' => 'recipient']);
                }

                foreach ($validated['cc_targets'] ?? [] as $target) {
                    $letter->targets()->create($target + ['kind' => 'cc']);
                }
            }

            if ($request->hasFile('scan_file')) {
                $file = $request->file('scan_file');
                $path = $file->store("letters/{$letter->reference}", 'public');
                LetterAttachment::create([
                    'letter_id' => $letter->id,
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                ]);
            }

            if ($isInternal && $letter->status === 'sent') {
                $notificationUserIds = $this->resolveTargetUsers(collect($validated['targets'])->merge($validated['cc_targets'] ?? []))
                    ->reject(fn ($id) => (int) $id === (int) $user->id)
                    ->unique()
                    ->values();

                foreach ($notificationUserIds as $userId) {
                    NotificationLog::create([
                        'user_id' => $userId,
                        'letter_id' => $letter->id,
                        'channel' => 'web',
                        'title' => 'Surat internal baru',
                        'body' => $letter->subject,
                        'sent_at' => now(),
                    ]);
                }
            }

            return $letter;
        });

        return redirect()->route('admin.surat.show', $letter)->with('success', 'Surat berhasil dibuat.');
    }

    public function previewLetterNumber(Request $request, LetterNumberGenerator $generator): JsonResponse
    {
        $validated = $request->validate([
            'letter_type_id' => 'required|exists:letter_types,id',
            'context' => 'required|in:incoming_external,internal,outgoing,archive',
            'payload' => 'nullable|array',
        ]);

        if ($validated['context'] === 'incoming_external') {
            return response()->json(['letter_number' => null]);
        }

        return response()->json([
            'letter_number' => $generator->preview(
                LetterType::query()->findOrFail($validated['letter_type_id']),
                $request->user(),
                $validated['context'],
                $validated['payload'] ?? []
            ),
        ]);
    }

    public function show(Letter $letter, DispositionService $dispositionService)
    {
        $letter->load([
            'creator:id,name,username',
            'template:id,name,category',
            'letterType:id,name',
            'targets',
            'attachments',
            'dispositions.fromUser:id,name,username',
            'dispositions.fromDirectorate',
            'dispositions.fromDivision',
            'dispositions.fromDepartment',
            'readReceipts' => fn ($query) => $query->where('user_id', '!=', $letter->created_by),
            'readReceipts.user:id,name,username,position',
        ]);

        return inertia('Admin/Letters/Show', [
            'letter' => $letter,
            'targetOptions' => $this->targetOptions(),
            'dispositionTargetOptions' => $dispositionService->optionsFor(auth()->user(), true, $letter),
            'notifications' => NotificationLog::with('user:id,name,username')
                ->where('letter_id', $letter->id)
                ->latest()
                ->get(),
        ]);
    }

    public function update(Request $request, Letter $letter)
    {
        $validated = $request->validate([
            'status' => 'required|in:draft,sent,received,disposed,archived,rejected',
            'letter_number' => 'nullable|string|max:255|unique:letters,letter_number,' . $letter->id,
        ]);

        $letter->update($validated);

        return back()->with('success', 'Status surat berhasil diperbarui.');
    }

    public function destroyDraft(Request $request, Letter $letter)
    {
        abort_unless((int) $letter->created_by === (int) $request->user()->id, 403);
        abort_unless($letter->status === 'draft', 403);

        DB::transaction(function () use ($letter) {
            $letter->load('attachments');
            foreach ($letter->attachments as $attachment) {
                Storage::disk('public')->delete($attachment->file_path);
            }
            $letter->delete();
        });

        return redirect()->route('admin.surat.internal')->with('success', 'Draft surat berhasil dihapus.');
    }

    private function mapType(string $type): string
    {
        return match ($type) {
            'masuk-eksternal', 'incoming', 'incoming_external' => 'incoming_external',
            'keluar', 'outgoing' => 'outgoing',
            'arsip', 'archive' => 'incoming_external',
            default => 'internal',
        };
    }

    private function typeLabel(string $type): string
    {
        return match ($type) {
            'incoming_external' => 'Surat Masuk Eksternal',
            'outgoing' => 'Surat Keluar',
            default => 'Surat Internal',
        };
    }

    private function resolveTargetUsers(Collection $targets): Collection
    {
        return $targets->flatMap(function (array $target) {
            $targetId = $target['target_id'];

            return match ($target['target_type']) {
                'user' => collect([$targetId]),
                'division' => User::query()->where('division_id', $targetId)->pluck('id'),
                'department' => User::query()->where('department_id', $targetId)->pluck('id'),
                'directorate' => Directorate::query()->whereKey($targetId)->pluck('director_user_id'),
                'division_gm' => Division::query()->whereKey($targetId)->pluck('gm_user_id'),
                'department_manager' => Department::query()->whereKey($targetId)->pluck('manager_user_id'),
                default => collect(),
            };
        })->filter();
    }

    private function targetOptions(): array
    {
        return [
            'users' => User::query()
                ->where('status', 'active')
                ->select('id', 'name', 'position', 'department_id', 'division_id', 'directorate_id')
                ->orderBy('name')
                ->get(),
            'directorates' => Directorate::query()
                ->with('director:id,name')
                ->where('status', 'active')
                ->select('id', 'name', 'director_user_id')
                ->orderBy('name')
                ->get(),
            'divisions' => Division::query()
                ->with('generalManager:id,name')
                ->where('status', 'active')
                ->select('id', 'name', 'directorate_id', 'gm_user_id')
                ->orderBy('name')
                ->get(),
            'departments' => Department::query()
                ->with('manager:id,name')
                ->where('status', 'active')
                ->select('id', 'name', 'division_id', 'manager_user_id')
                ->orderBy('name')
                ->get(),
        ];
    }

    private function uploadValidationMessages(): array
    {
        return [
            'scan_file.uploaded' => 'File gagal diunggah. Pastikan file PDF dan ukuran tidak melebihi batas upload server.',
            'scan_file.required_if' => 'File Scan PDF wajib diunggah.',
            'scan_file.file' => 'File Scan PDF tidak valid.',
            'scan_file.mimes' => 'File Scan harus berupa PDF.',
            'scan_file.max' => 'Ukuran File Scan PDF maksimal 10MB.',
        ];
    }

    private function logUploadValidationFailure(Request $request, ValidationException $exception): void
    {
        if (! array_key_exists('scan_file', $exception->errors())) {
            return;
        }

        $file = $request->file('scan_file');

        Log::warning('Scan PDF upload validation failed in admin letter form', [
            'user_id' => $request->user()?->id,
            'route' => $request->route()?->getName(),
            'path' => $request->path(),
            'content_length' => $request->server('CONTENT_LENGTH'),
            'php_upload_max_filesize' => ini_get('upload_max_filesize'),
            'php_post_max_size' => ini_get('post_max_size'),
            'file_name' => $file?->getClientOriginalName(),
            'file_size' => $file?->getSize(),
            'file_error' => $file && method_exists($file, 'getError') ? $file->getError() : null,
            'errors' => $exception->errors()['scan_file'],
        ]);
    }
}
