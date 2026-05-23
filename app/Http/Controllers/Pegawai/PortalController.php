<?php

namespace App\Http\Controllers\Pegawai;

use App\Http\Controllers\Controller;
use App\Models\AuditTrail;
use App\Models\Department;
use App\Models\Directorate;
use App\Models\Disposition;
use App\Models\Division;
use App\Models\Letter;
use App\Models\LetterAttachment;
use App\Models\LetterReadReceipt;
use App\Models\LetterTemplate;
use App\Models\LetterType;
use App\Models\NotificationLog;
use App\Models\Setting;
use App\Models\User;
use App\Services\LetterNumberGenerator;
use App\Services\LetterFieldRequirementService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PortalController extends Controller
{
    public function workspace(Request $request, string $section, ?string $mode = null)
    {
        $user = $request->user();
        $props = $this->baseProps($user) + [
            'section' => $section,
            'mode' => $mode,
        ];

        if ($section === 'dashboard') {
            return inertia('Pegawai/Portal/Workspace', $props + [
                'stats' => $this->dashboardStats($user),
                'letters' => $this->applyLetterFilters($this->accessibleLetters($user, null, true), $request)
                    ->latest()
                    ->limit(6)
                    ->get(),
            ]);
        }

        if ($section === 'inbox' && $mode === 'tebusan') {
            return inertia('Pegawai/Portal/Workspace', $props + [
                'letters' => $this->applyLetterFilters($this->accessibleLetters($user, 'cc'), $request)
                    ->latest()
                    ->paginate(10)
                    ->withQueryString(),
            ]);
        }

        if ($section === 'inbox' && $mode === 'disposisi') {
            return inertia('Pegawai/Portal/Workspace', $props + [
                'dispositions' => $this->applyDispositionFilters($this->accessibleDispositions($user), $request)
                    ->with(['letter.creator', 'fromUser'])
                    ->latest()
                    ->paginate(10)
                    ->withQueryString(),
            ]);
        }

        if ($section === 'inbox') {
            return inertia('Pegawai/Portal/Workspace', $props + [
                'letters' => $this->applyLetterFilters($this->accessibleLetters($user, 'recipient'), $request)
                    ->latest()
                    ->paginate(10)
                    ->withQueryString(),
            ]);
        }

        if ($section === 'archive') {
            return inertia('Pegawai/Portal/Workspace', $props + [
                'letters' => $this->applyLetterFilters(Letter::query()
                    ->with(['creator', 'letterType', 'attachments', 'readReceipts' => fn ($query) => $query->where('user_id', $user->id)])
                    ->where(function (Builder $query) use ($user) {
                        $query->where('created_by', $user->id)
                            ->orWhereHas('readReceipts', fn (Builder $receipt) => $receipt->where('user_id', $user->id))
                            ->orWhereHas('targets', function (Builder $target) use ($user) {
                                $this->targetMatches($target, $user);
                            });
                    }), $request)
                    ->latest()
                    ->paginate(10)
                    ->withQueryString(),
            ]);
        }

        return inertia('Pegawai/Portal/Workspace', $props);
    }

    public function detail(Request $request, Letter $letter)
    {
        $user = $request->user();

        abort_unless($this->canAccessLetter($user, $letter), 403);

        LetterReadReceipt::query()->updateOrCreate(
            ['letter_id' => $letter->id, 'user_id' => $user->id],
            ['read_at' => now()]
        );

        AuditTrail::query()->create([
            'user_id' => $user->id,
            'action' => 'pegawai.letter.read',
            'auditable_type' => Letter::class,
            'auditable_id' => $letter->id,
            'meta' => ['reference' => $letter->reference],
        ]);

        return inertia('Pegawai/Portal/Workspace', $this->baseProps($user) + [
            'section' => 'detail',
            'mode' => (string) $letter->id,
            'letter' => $letter->load([
                'creator',
                'letterType',
                'template',
                'targets',
                'attachments',
                'dispositions.fromUser',
                'readReceipts.user',
            ]),
            'audits' => AuditTrail::query()
                ->with('user')
                ->where('auditable_type', Letter::class)
                ->where('auditable_id', $letter->id)
                ->latest()
                ->limit(20)
                ->get(),
            'notifications' => NotificationLog::query()
                ->with('user')
                ->where('letter_id', $letter->id)
                ->latest()
                ->limit(20)
                ->get(),
        ]);
    }

    public function storeInternal(Request $request)
    {
        $letter = $this->storeLetter($request, 'internal');

        return redirect()
            ->route('pegawai.surat.detail', $letter)
            ->with('success', $letter->status === 'draft' ? 'Draft surat internal berhasil disimpan.' : 'Surat internal berhasil dikirim.');
    }

    public function storeOutgoing(Request $request)
    {
        $letter = $this->storeLetter($request, 'outgoing');

        return redirect()
            ->route('pegawai.surat.detail', $letter)
            ->with('success', $letter->status === 'draft' ? 'Draft surat keluar berhasil disimpan.' : 'Surat keluar berhasil dikirim.');
    }

    public function storeIncomingExternal(Request $request)
    {
        $letter = $this->storeLetter($request, 'incoming_external');

        return redirect()
            ->route('pegawai.surat.detail', $letter)
            ->with('success', 'Surat masuk eksternal berhasil disimpan.');
    }

    public function storeArchive(Request $request)
    {
        $letter = $this->storeLetter($request, 'archive');

        return redirect()
            ->route('pegawai.surat.detail', $letter)
            ->with('success', 'Arsip surat berhasil disimpan.');
    }

    public function previewLetterNumber(Request $request, LetterNumberGenerator $generator): JsonResponse
    {
        $validated = $request->validate([
            'letter_type_id' => 'required|exists:letter_types,id',
            'context' => 'required|in:incoming_external,internal,outgoing,archive',
            'payload' => 'nullable|array',
        ]);

        $letterType = LetterType::query()->findOrFail($validated['letter_type_id']);

        return response()->json([
            'letter_number' => $generator->preview(
                $letterType,
                $request->user(),
                $validated['context'],
                $validated['payload'] ?? []
            ),
        ]);
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

        return redirect()
            ->route('pegawai.archive')
            ->with('success', 'Draft surat berhasil dihapus.');
    }

    private function baseProps(User $user): array
    {
        return [
            'pegawaiBadges' => [
                'internal' => $this->unreadLetters($user, 'recipient')->count(),
                'tebusan' => $this->unreadLetters($user, 'cc')->count(),
                'disposisi' => $this->accessibleDispositions($user)->where('status', 'open')->count(),
            ],
            'templates' => LetterTemplate::query()
                ->where('status', 'active')
                ->whereIn('category', ['internal', 'outgoing', 'both'])
                ->select('id', 'name', 'description', 'category', 'content_template', 'extra_fields')
                ->orderBy('name')
                ->get(),
            'letterTypes' => LetterType::query()
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'numbering_enabled', 'numbering_contexts', 'numbering_format']),
            'targetOptions' => $this->targetOptions(),
            'filterOptions' => [
                'letterTypes' => LetterType::query()->where('status', 'active')->orderBy('name')->get(['id', 'name']),
                'methods' => collect([
                    ['id' => 'scan', 'name' => 'Scan Surat'],
                    ['id' => 'template', 'name' => 'Buat dari Template'],
                ]),
                'readStatuses' => collect([
                    ['id' => 'read', 'name' => 'Dibaca'],
                    ['id' => 'unread', 'name' => 'Belum dibaca'],
                ]),
                'letterStatuses' => collect(['draft', 'sent', 'received', 'disposed', 'archived', 'rejected'])->map(fn ($status) => ['id' => $status, 'name' => ucfirst($status)])->values(),
                'dispositionStatuses' => collect([
                    ['id' => 'open', 'name' => 'Open'],
                    ['id' => 'done', 'name' => 'Selesai'],
                ]),
                'users' => User::query()->orderBy('name')->get(['id', 'name']),
            ],
        ];
    }

    private function dashboardStats(User $user): array
    {
        return [
            'internal_unread' => $this->unreadLetters($user, 'recipient')->count(),
            'cc_unread' => $this->unreadLetters($user, 'cc')->count(),
            'open_dispositions' => $this->accessibleDispositions($user)->where('status', 'open')->count(),
            'archive_total' => Letter::query()
                ->where(function (Builder $query) use ($user) {
                    $query->where('created_by', $user->id)
                        ->orWhereHas('readReceipts', fn (Builder $receipt) => $receipt->where('user_id', $user->id))
                        ->orWhereHas('targets', function (Builder $target) use ($user) {
                            $this->targetMatches($target, $user);
                        });
                })
                ->count(),
        ];
    }

    private function storeLetter(Request $request, string $mode): Letter
    {
        $user = $request->user();
        $isInternal = $mode === 'internal';
        $isOutgoing = $mode === 'outgoing';
        $isArchive = $mode === 'archive';
        $templateEnabled = (bool) Setting::query()->value('enable_letter_template_method');
        $supportsTemplate = ($isInternal || $isOutgoing) && $templateEnabled;
        $requiresSubmitAction = $isInternal || $isOutgoing;
        $targetRules = 'required|in:user,directorate,division,department,division_gm,department_manager';
        $requirements = app(LetterFieldRequirementService::class);

        if (! $supportsTemplate) {
            $request->merge(['creation_method' => 'scan']);
        }

        $validated = $request->validate([
            'submit_action' => $requiresSubmitAction ? 'required|in:draft,send' : 'nullable',
            'creation_method' => $supportsTemplate ? 'required|in:scan,template' : 'required|in:scan',
            'letter_type_id' => ($requirements->required($mode, 'letter_type_id') ? 'required' : 'nullable') . '|exists:letter_types,id',
            'letter_template_id' => $supportsTemplate ? 'nullable|required_if:creation_method,template|exists:letter_templates,id' : 'nullable',
            'letter_number' => ($requirements->required($mode, 'letter_number') ? 'required' : 'nullable') . '|string|max:255|unique:letters,letter_number',
            'subject' => ($requirements->required($mode, 'subject') ? 'required' : 'nullable') . '|string|max:255',
            'title' => 'nullable|string|max:255',
            'body_rendered' => $supportsTemplate ? (($requirements->required($mode, 'body_rendered') ? 'required' : 'nullable') . '|string') : 'nullable',
            'page_count' => $supportsTemplate ? 'nullable|integer|min:1|max:999' : 'nullable',
            'scan_file' => ($requirements->required($mode, 'scan_file') ? 'required_if:creation_method,scan' : 'nullable') . '|file|mimes:pdf|max:10240',
            'targets' => $isInternal ? (($requirements->required($mode, 'targets') ? 'required' : 'nullable') . '|array' . ($requirements->required($mode, 'targets') ? '|min:1' : '')) : 'nullable|array',
            'targets.*.target_type' => $isInternal ? $targetRules : 'nullable',
            'targets.*.target_id' => $isInternal ? 'required|integer' : 'nullable',
            'cc_targets' => $isInternal ? (($requirements->required($mode, 'cc_targets') ? 'required' : 'nullable') . '|array' . ($requirements->required($mode, 'cc_targets') ? '|min:1' : '')) : 'nullable|array',
            'cc_targets.*.target_type' => $isInternal ? $targetRules : 'nullable',
            'cc_targets.*.target_id' => $isInternal ? 'required|integer' : 'nullable',
            'payload' => 'nullable|array',
            'payload.origin_name' => $mode === 'incoming_external' ? (($requirements->required($mode, 'origin_name') ? 'required' : 'nullable') . '|string|max:255') : 'nullable|string|max:255',
            'payload.internal_origin_type' => $isInternal || $isOutgoing ? (($requirements->required($mode, 'internal_origin') ? 'required' : 'nullable') . '|in:directorate,division,department') : 'nullable',
            'payload.internal_origin_id' => $isInternal || $isOutgoing ? (($requirements->required($mode, 'internal_origin') ? 'required' : 'nullable') . '|integer') : 'nullable',
            'payload.external_recipient' => $isOutgoing ? (($requirements->required($mode, 'external_recipient') ? 'required' : 'nullable') . '|string|max:255') : 'nullable|string|max:255',
            'payload.notes' => in_array($mode, ['incoming_external', 'archive'], true) ? (($requirements->required($mode, 'notes') ? 'required' : 'nullable') . '|string') : 'nullable',
        ]);

        if (($isInternal || $isOutgoing) && filled($validated['payload']['internal_origin_type'] ?? null) && filled($validated['payload']['internal_origin_id'] ?? null)) {
            $originType = $validated['payload']['internal_origin_type'] ?? null;
            $originId = (int) ($validated['payload']['internal_origin_id'] ?? 0);
            $allowedOriginIds = [
                'directorate' => $user->directorate_id,
                'division' => $user->division_id,
                'department' => $user->department_id,
            ];

            abort_if((int) ($allowedOriginIds[$originType] ?? 0) !== $originId, 422, 'Asal surat tidak sesuai dengan profil user.');
        }

        return DB::transaction(function () use ($request, $validated, $user, $mode, $isInternal, $isOutgoing, $isArchive, $supportsTemplate) {
            $letterType = LetterType::query()->findOrFail($validated['letter_type_id']);
            $letterNumber = $validated['letter_number'] ?? null;

            if (! $letterNumber) {
                $letterNumber = app(LetterNumberGenerator::class)->generate(
                    $letterType,
                    $user,
                    $mode,
                    $validated['payload'] ?? []
                );
            }

            $letter = Letter::query()->create([
                'type' => match (true) {
                    $isInternal => 'internal',
                    $isOutgoing => 'outgoing',
                    default => 'incoming_external',
                },
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
                'reference' => $this->makeReference($mode),
                'page_count' => $supportsTemplate && $validated['creation_method'] === 'template' ? ($validated['page_count'] ?? 1) : 1,
                'status' => match (true) {
                    $isInternal || $isOutgoing => ($validated['submit_action'] === 'draft' ? 'draft' : 'sent'),
                    $isArchive => 'archived',
                    default => 'received',
                },
                'body_rendered' => $supportsTemplate ? ($validated['body_rendered'] ?? null) : null,
                'payload' => $validated['payload'] ?? [],
                'meta' => [
                    'source' => 'pegawai_portal',
                    'mode' => $mode,
                ],
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
                $path = $file->store('surat/' . $letter->reference, 'public');

                LetterAttachment::query()->create([
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
                    NotificationLog::query()->create([
                        'user_id' => $userId,
                        'letter_id' => $letter->id,
                        'channel' => 'web',
                        'title' => 'Surat internal baru',
                        'body' => $letter->subject,
                        'sent_at' => now(),
                    ]);
                }
            }

            AuditTrail::query()->create([
                'user_id' => $user->id,
                'action' => match (true) {
                    $letter->status === 'draft' => 'pegawai.letter.drafted',
                    $isInternal => 'pegawai.letter.created',
                    $isOutgoing => 'pegawai.outgoing.created',
                    default => 'pegawai.scan.created',
                },
                'auditable_type' => Letter::class,
                'auditable_id' => $letter->id,
                'meta' => [
                    'reference' => $letter->reference,
                    'mode' => $mode,
                    'creation_method' => $letter->creation_method,
                    'target_count' => $isInternal ? count($validated['targets']) : 0,
                    'cc_count' => $isInternal ? count($validated['cc_targets'] ?? []) : 0,
                ],
            ]);

            return $letter;
        });
    }

    private function makeReference(string $mode): string
    {
        $prefix = match ($mode) {
            'incoming_external' => 'BDK-EXT',
            'archive' => 'BDK-ARS',
            'outgoing' => 'BDK-OUT',
            default => 'BDK-INT',
        };

        return $prefix . '-' . now()->format('YmdHis') . '-' . Str::upper(Str::random(4));
    }

    private function accessibleLetters(User $user, ?string $kind = null, bool $includeCreated = false): Builder
    {
        return Letter::query()
            ->with([
                'creator',
                'letterType',
                'attachments',
                'targets',
                'readReceipts' => fn ($query) => $query->where('user_id', $user->id),
            ])
            ->where('type', 'internal')
            ->where(function (Builder $query) use ($user, $kind, $includeCreated) {
                if ($includeCreated) {
                    $query->where('created_by', $user->id)
                        ->orWhereHas('targets', function (Builder $target) use ($user, $kind) {
                            $this->targetMatches($target, $user, $kind);
                        });
                    return;
                }

                $query->whereHas('targets', function (Builder $target) use ($user, $kind) {
                    $this->targetMatches($target, $user, $kind);
                });
            });
    }

    private function applyLetterFilters(Builder $query, Request $request): Builder
    {
        return $query
            ->when($request->q, fn (Builder $letter, $search) => $letter->where(fn (Builder $q) => $q
                ->where('subject', 'like', "%{$search}%")
                ->orWhere('title', 'like', "%{$search}%")
                ->orWhere('letter_number', 'like', "%{$search}%")
                ->orWhere('reference', 'like', "%{$search}%")
            ))
            ->when($request->filled('letter_type_ids'), fn (Builder $letter) => $letter->whereIn('letter_type_id', (array) $request->letter_type_ids))
            ->when($request->filled('methods'), fn (Builder $letter) => $letter->whereIn('creation_method', (array) $request->methods))
            ->when($request->filled('statuses'), fn (Builder $letter) => $letter->whereIn('status', (array) $request->statuses))
            ->when($request->filled('creator_ids'), fn (Builder $letter) => $letter->whereIn('created_by', (array) $request->creator_ids))
            ->when($request->filled('read_statuses'), function (Builder $letter) use ($request) {
                $statuses = (array) $request->read_statuses;
                $letter->where(function (Builder $q) use ($statuses) {
                    if (in_array('read', $statuses, true)) {
                        $q->orWhereHas('readReceipts', fn (Builder $receipt) => $receipt->where('user_id', auth()->id()));
                    }
                    if (in_array('unread', $statuses, true)) {
                        $q->orWhereDoesntHave('readReceipts', fn (Builder $receipt) => $receipt->where('user_id', auth()->id()));
                    }
                });
            });
    }

    private function applyDispositionFilters(Builder $query, Request $request): Builder
    {
        return $query
            ->when($request->q, fn (Builder $disposition, $search) => $disposition->where(fn (Builder $q) => $q
                ->where('note', 'like', "%{$search}%")
                ->orWhereHas('letter', fn (Builder $letter) => $letter->where('subject', 'like', "%{$search}%")->orWhere('reference', 'like', "%{$search}%"))
            ))
            ->when($request->filled('statuses'), fn (Builder $disposition) => $disposition->whereIn('status', (array) $request->statuses))
            ->when($request->filled('from_user_ids'), fn (Builder $disposition) => $disposition->whereIn('from_user_id', (array) $request->from_user_ids));
    }

    private function unreadLetters(User $user, string $kind): Builder
    {
        return $this->accessibleLetters($user, $kind)
            ->whereDoesntHave('readReceipts', fn (Builder $receipt) => $receipt->where('user_id', $user->id));
    }

    private function accessibleDispositions(User $user): Builder
    {
        return Disposition::query()
            ->where(function (Builder $query) use ($user) {
                $this->targetMatches($query, $user);
            });
    }

    private function canAccessLetter(User $user, Letter $letter): bool
    {
        if ((int) $letter->created_by === (int) $user->id) {
            return true;
        }

        return $letter->targets()
            ->where(function (Builder $query) use ($user) {
                $this->targetMatches($query, $user);
            })
            ->exists()
            || $letter->dispositions()
                ->where(function (Builder $query) use ($user) {
                    $this->targetMatches($query, $user);
                })
                ->exists();
    }

    private function targetMatches(Builder $query, User $user, ?string $kind = null): void
    {
        if ($kind) {
            $query->where('kind', $kind);
        }

        $directorateIds = Directorate::query()
            ->where('director_user_id', $user->id)
            ->pluck('id');
        $gmDivisionIds = Division::query()
            ->where('gm_user_id', $user->id)
            ->pluck('id');
        $managerDepartmentIds = Department::query()
            ->where('manager_user_id', $user->id)
            ->pluck('id');

        $query->where(function (Builder $target) use ($user, $directorateIds, $gmDivisionIds, $managerDepartmentIds) {
            $target->where(function (Builder $match) use ($user) {
                $match->where('target_type', 'user')
                    ->where('target_id', $user->id);
            });

            if ($user->division_id) {
                $target->orWhere(function (Builder $match) use ($user) {
                    $match->where('target_type', 'division')
                        ->where('target_id', $user->division_id);
                });
            }

            if ($user->department_id) {
                $target->orWhere(function (Builder $match) use ($user) {
                    $match->where('target_type', 'department')
                        ->where('target_id', $user->department_id);
                });
            }

            if ($directorateIds->isNotEmpty()) {
                $target->orWhere(function (Builder $match) use ($directorateIds) {
                    $match->where('target_type', 'directorate')
                        ->whereIn('target_id', $directorateIds);
                });
            }

            if ($gmDivisionIds->isNotEmpty()) {
                $target->orWhere(function (Builder $match) use ($gmDivisionIds) {
                    $match->where('target_type', 'division_gm')
                        ->whereIn('target_id', $gmDivisionIds);
                });
            }

            if ($managerDepartmentIds->isNotEmpty()) {
                $target->orWhere(function (Builder $match) use ($managerDepartmentIds) {
                    $match->where('target_type', 'department_manager')
                        ->whereIn('target_id', $managerDepartmentIds);
                });
            }
        });
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
                ->where('role', 'pegawai')
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
}
