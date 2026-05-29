<?php

namespace App\Imports;

use App\Models\Department;
use App\Models\Directorate;
use App\Models\Division;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Spatie\Permission\Models\Role;

class MasterDataImport implements ToCollection, WithHeadingRow
{
    public int $created = 0;

    public int $updated = 0;

    public function __construct(private readonly string $type)
    {
    }

    public function collection(Collection $rows): void
    {
        $errors = [];

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;
            $data = $this->normalizeRow($row);

            if ($this->blank($data)) {
                continue;
            }

            try {
                match ($this->type) {
                    'directorates' => $this->importDirectorate($data),
                    'divisions' => $this->importDivision($data),
                    'departments' => $this->importDepartment($data),
                    'users' => $this->importUser($data),
                    default => abort(404),
                };
            } catch (ValidationException $exception) {
                foreach ($exception->errors() as $field => $messages) {
                    foreach ($messages as $message) {
                        $errors[] = "Baris {$rowNumber} [{$field}]: {$message}";
                    }
                }
            }
        }

        if ($errors) {
            throw ValidationException::withMessages(['import_file' => $errors]);
        }
    }

    private function importDirectorate(array $data): void
    {
        $this->require($data, ['name', 'status']);
        $this->assertStatus($data['status']);
        $director = $this->optionalUser($data['director_username'] ?? null, 'director_username');

        $model = filled($data['code'] ?? null)
            ? Directorate::query()->where('code', $data['code'])->first()
            : Directorate::query()->where('name', $data['name'])->first();

        $exists = (bool) $model;
        $model ??= new Directorate(['code' => $this->uniqueCode(Directorate::class, $data['code'] ?: $data['name'])]);

        $model->fill([
            'name' => $data['name'],
            'director_user_id' => $director?->id,
            'status' => $data['status'],
        ])->save();

        $exists ? $this->updated++ : $this->created++;
    }

    private function importDivision(array $data): void
    {
        $this->require($data, ['name', 'status']);
        $this->assertStatus($data['status']);
        $directorate = $this->resolveDirectorate($data['directorate_code'] ?? null, $data['directorate_name'] ?? null);
        $gm = $this->optionalUser($data['gm_username'] ?? null, 'gm_username');

        $model = filled($data['code'] ?? null)
            ? Division::query()->where('code', $data['code'])->first()
            : Division::query()->where('name', $data['name'])->where('directorate_id', $directorate->id)->first();

        $exists = (bool) $model;
        $model ??= new Division(['code' => $this->uniqueCode(Division::class, $data['code'] ?: $data['name'])]);

        $model->fill([
            'directorate_id' => $directorate->id,
            'name' => $data['name'],
            'gm_user_id' => $gm?->id,
            'status' => $data['status'],
        ])->save();

        $exists ? $this->updated++ : $this->created++;
    }

    private function importDepartment(array $data): void
    {
        $this->require($data, ['name', 'status']);
        $this->assertStatus($data['status']);
        $division = $this->resolveDivision($data['division_code'] ?? null, $data['division_name'] ?? null);
        $manager = $this->optionalUser($data['manager_username'] ?? null, 'manager_username');

        $model = filled($data['code'] ?? null)
            ? Department::query()->where('code', $data['code'])->first()
            : Department::query()->where('name', $data['name'])->where('division_id', $division->id)->first();

        $exists = (bool) $model;
        $model ??= new Department(['code' => $this->uniqueCode(Department::class, $data['code'] ?: $data['name'])]);

        $model->fill([
            'division_id' => $division->id,
            'name' => $data['name'],
            'manager_user_id' => $manager?->id,
            'status' => $data['status'],
        ])->save();

        $exists ? $this->updated++ : $this->created++;
    }

    private function importUser(array $data): void
    {
        $this->require($data, ['username', 'name', 'role', 'status']);
        $this->assertStatus($data['status']);
        if (! in_array($data['role'], ['admin', 'pegawai'], true)) {
            throw ValidationException::withMessages(['role' => 'Role harus admin atau pegawai.']);
        }

        $user = User::query()->where('username', $data['username'])->first();
        if (! $user && blank($data['password'] ?? null)) {
            throw ValidationException::withMessages(['password' => 'Password wajib untuk user baru.']);
        }

        if (filled($data['email'] ?? null)) {
            $emailExists = User::query()
                ->where('email', $data['email'])
                ->when($user, fn ($query) => $query->whereKeyNot($user->id))
                ->exists();

            if ($emailExists) {
                throw ValidationException::withMessages(['email' => 'Email sudah digunakan user lain.']);
            }
        }

        $directorate = $this->resolveOptionalDirectorate($data['directorate_code'] ?? null, $data['directorate_name'] ?? null);
        $division = $this->resolveOptionalDivision($data['division_code'] ?? null, $data['division_name'] ?? null);
        $department = $this->resolveOptionalDepartment($data['department_code'] ?? null, $data['department_name'] ?? null);
        $this->validateOfficerUnit($data['position'] ?? null, $directorate, $division, $department);

        $exists = (bool) $user;
        $user ??= new User(['username' => $data['username']]);

        $payload = [
            'name' => $data['name'],
            'email' => $data['email'] ?: null,
            'role' => $data['role'],
            'directorate_id' => $directorate?->id,
            'division_id' => $division?->id,
            'department_id' => $department?->id,
            'position' => $data['position'] ?: null,
            'status' => $data['status'],
        ];

        if (filled($data['password'] ?? null)) {
            $payload['password'] = Hash::make($data['password']);
        }

        $user->fill($payload)->save();

        $role = Role::query()->firstOrCreate(['name' => $data['role'], 'guard_name' => 'web']);
        $user->syncRoles([$role->id]);
        $this->syncOrganizationOfficer($user);

        $exists ? $this->updated++ : $this->created++;
    }

    private function normalizeRow($row): array
    {
        return collect($row)->mapWithKeys(fn ($value, $key) => [
            Str::snake(trim((string) $key)) => is_string($value) ? trim($value) : $value,
        ])->all();
    }

    private function blank(array $data): bool
    {
        return collect($data)->filter(fn ($value) => filled($value))->isEmpty();
    }

    private function require(array $data, array $fields): void
    {
        $errors = [];
        foreach ($fields as $field) {
            if (blank($data[$field] ?? null)) {
                $errors[$field] = "Kolom {$field} wajib diisi.";
            }
        }

        if ($errors) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function assertStatus(?string $status): void
    {
        if (! in_array($status, ['active', 'inactive'], true)) {
            throw ValidationException::withMessages(['status' => 'Status harus active atau inactive.']);
        }
    }

    private function optionalUser(?string $username, string $field): ?User
    {
        if (blank($username)) {
            return null;
        }

        return User::query()->where('username', $username)->first()
            ?? throw ValidationException::withMessages([$field => "Username {$username} tidak ditemukan."]);
    }

    private function resolveDirectorate(?string $code, ?string $name): Directorate
    {
        return $this->resolveOptionalDirectorate($code, $name)
            ?? throw ValidationException::withMessages(['directorate_code' => 'Direktorat tidak ditemukan. Isi directorate_code atau directorate_name yang valid.']);
    }

    private function resolveOptionalDirectorate(?string $code, ?string $name): ?Directorate
    {
        return filled($code)
            ? Directorate::query()->where('code', $code)->first()
            : (filled($name) ? Directorate::query()->where('name', $name)->first() : null);
    }

    private function resolveDivision(?string $code, ?string $name): Division
    {
        return $this->resolveOptionalDivision($code, $name)
            ?? throw ValidationException::withMessages(['division_code' => 'Divisi tidak ditemukan. Isi division_code atau division_name yang valid.']);
    }

    private function resolveOptionalDivision(?string $code, ?string $name): ?Division
    {
        return filled($code)
            ? Division::query()->where('code', $code)->first()
            : (filled($name) ? Division::query()->where('name', $name)->first() : null);
    }

    private function resolveOptionalDepartment(?string $code, ?string $name): ?Department
    {
        return filled($code)
            ? Department::query()->where('code', $code)->first()
            : (filled($name) ? Department::query()->where('name', $name)->first() : null);
    }

    private function uniqueCode(string $model, string $seed): string
    {
        $base = Str::upper(Str::slug($seed, '-')) ?: 'UNIT';
        $code = $base;
        $counter = 2;

        while ($model::query()->where('code', $code)->exists()) {
            $code = "{$base}-{$counter}";
            $counter++;
        }

        return $code;
    }

    private function syncOrganizationOfficer(User $user): void
    {
        Directorate::query()->where('director_user_id', $user->id)->update(['director_user_id' => null]);
        Division::query()->where('gm_user_id', $user->id)->update(['gm_user_id' => null]);
        Department::query()->where('manager_user_id', $user->id)->update(['manager_user_id' => null]);

        match ($user->position) {
            'Direktur' => $user->directorate_id ? Directorate::query()->whereKey($user->directorate_id)->update(['director_user_id' => $user->id]) : null,
            'General Manager' => $user->division_id ? Division::query()->whereKey($user->division_id)->update(['gm_user_id' => $user->id]) : null,
            'Manager' => $user->department_id ? Department::query()->whereKey($user->department_id)->update(['manager_user_id' => $user->id]) : null,
            default => null,
        };
    }

    private function validateOfficerUnit(?string $position, ?Directorate $directorate, ?Division $division, ?Department $department): void
    {
        if ($position === 'Direktur' && ! $directorate) {
            throw ValidationException::withMessages(['directorate_code' => 'Direktur wajib memiliki direktorat.']);
        }

        if ($position === 'General Manager' && ! $division) {
            throw ValidationException::withMessages(['division_code' => 'General Manager wajib memiliki divisi.']);
        }

        if ($position === 'Manager' && ! $department) {
            throw ValidationException::withMessages(['department_code' => 'Manager wajib memiliki department.']);
        }
    }
}
