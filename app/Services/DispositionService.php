<?php

namespace App\Services;

use App\Models\Department;
use App\Models\Directorate;
use App\Models\Division;
use App\Models\Letter;
use App\Models\NotificationLog;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class DispositionService
{
    public const TARGET_TYPES = ['division', 'department', 'directorate', 'division_gm', 'department_manager'];

    public function optionsFor(User $user, bool $admin = false, ?Letter $letter = null): array
    {
        if ($admin) {
            return [
                'targetTypes' => $letter?->type === 'incoming_external'
                    ? ['directorate', 'division', 'division_gm', 'department_manager']
                    : self::TARGET_TYPES,
                'users' => collect(),
                'directorates' => Directorate::query()->with('director:id,name')->where('status', 'active')->select('id', 'name', 'director_user_id')->orderBy('name')->get(),
                'divisions' => Division::query()->with('generalManager:id,name')->where('status', 'active')->select('id', 'name', 'directorate_id', 'gm_user_id')->orderBy('name')->get(),
                'departments' => Department::query()->with('manager:id,name')->where('status', 'active')->select('id', 'name', 'division_id', 'manager_user_id')->orderBy('name')->get(),
            ];
        }

        $scope = $this->scopeFor($user);

        return [
            'targetTypes' => $this->targetTypesForScope($scope),
            'users' => collect(),
            'directorates' => collect(),
            'divisions' => Division::query()
                ->with('generalManager:id,name')
                ->where('status', 'active')
                ->whereIn('id', $scope['division_ids'])
                ->select('id', 'name', 'directorate_id', 'gm_user_id')
                ->orderBy('name')
                ->get(),
            'departments' => Department::query()
                ->with('manager:id,name')
                ->where('status', 'active')
                ->whereIn('id', $scope['department_ids'])
                ->select('id', 'name', 'division_id', 'manager_user_id')
                ->orderBy('name')
                ->get(),
        ];
    }

    public function assertAllowed(User $user, string $targetType, ?int $targetId, bool $admin = false, ?Letter $letter = null): void
    {
        if (! in_array($targetType, self::TARGET_TYPES, true)) {
            throw ValidationException::withMessages(['target_type' => 'Jenis target disposisi tidak valid.']);
        }

        if ($admin) {
            if ($letter?->type === 'incoming_external' && ! in_array($targetType, ['directorate', 'division', 'division_gm', 'department_manager'], true)) {
                throw ValidationException::withMessages(['target_type' => 'Surat masuk eksternal hanya dapat didisposisikan ke Direktur, Divisi, General Manager, atau Manager.']);
            }

            return;
        }

        $scope = $this->scopeFor($user);
        if (! in_array($targetType, $this->targetTypesForScope($scope), true)) {
            throw ValidationException::withMessages(['target_type' => 'Jenis target disposisi tidak sesuai dengan kewenangan unit Anda.']);
        }

        $allowed = match ($targetType) {
            'division', 'division_gm' => $scope['division_ids']->contains((int) $targetId),
            'department', 'department_manager' => $scope['department_ids']->contains((int) $targetId),
            default => false,
        };

        if (! $allowed) {
            throw ValidationException::withMessages(['target_id' => 'Target disposisi tidak sesuai dengan kewenangan unit Anda.']);
        }
    }

    public function notifyUsers(Letter $letter, User $fromUser, string $targetType, ?int $targetId, ?string $note = null): void
    {
        $this->resolveTargetUsers($targetType, $targetId)
            ->reject(fn ($id) => (int) $id === (int) $fromUser->id)
            ->unique()
            ->each(function ($userId) use ($letter, $note) {
                NotificationLog::query()->create([
                    'user_id' => $userId,
                    'letter_id' => $letter->id,
                    'channel' => 'web',
                    'title' => 'Disposisi baru',
                    'body' => $note ?: $letter->subject,
                    'sent_at' => now(),
                ]);
            });
    }

    public function resolveTargetUsers(string $targetType, ?int $targetId): Collection
    {
        return (match ($targetType) {
            'division' => User::query()->where('status', 'active')->where('division_id', $targetId)->pluck('id'),
            'department' => User::query()->where('status', 'active')->where('department_id', $targetId)->pluck('id'),
            'directorate' => Directorate::query()->whereKey($targetId)->pluck('director_user_id'),
            'division_gm' => Division::query()->whereKey($targetId)->pluck('gm_user_id'),
            'department_manager' => Department::query()->whereKey($targetId)->pluck('manager_user_id'),
            default => collect(),
        })->filter();
    }

    private function scopeFor(User $user): array
    {
        $directorateIds = Directorate::query()->where('director_user_id', $user->id)->pluck('id');
        $directedDivisionIds = Division::query()->whereIn('directorate_id', $directorateIds)->pluck('id');
        $gmDivisionIds = Division::query()->where('gm_user_id', $user->id)->pluck('id');
        $divisionIds = $directedDivisionIds->merge($gmDivisionIds)->unique()->values();
        $managedDepartmentIds = Department::query()->where('manager_user_id', $user->id)->pluck('id');
        $departmentIds = Department::query()
            ->whereIn('division_id', $divisionIds)
            ->pluck('id')
            ->merge($managedDepartmentIds)
            ->unique()
            ->values();

        return [
            'directorate_ids' => $directorateIds,
            'gm_division_ids' => $gmDivisionIds,
            'division_ids' => $divisionIds,
            'managed_department_ids' => $managedDepartmentIds,
            'department_ids' => $departmentIds,
        ];
    }

    private function targetTypesForScope(array $scope): array
    {
        if ($scope['directorate_ids']->isNotEmpty()) {
            return ['division', 'division_gm', 'department_manager', 'department'];
        }

        if ($scope['gm_division_ids']->isNotEmpty()) {
            return ['division', 'department_manager', 'department'];
        }

        if ($scope['managed_department_ids']->isNotEmpty()) {
            return ['department'];
        }

        return [];
    }
}
