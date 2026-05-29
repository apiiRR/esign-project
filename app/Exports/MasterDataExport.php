<?php

namespace App\Exports;

use App\Models\Department;
use App\Models\Directorate;
use App\Models\Division;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class MasterDataExport implements FromCollection, WithHeadings
{
    public function __construct(
        private readonly string $type,
        private readonly Request $request,
        private readonly bool $template = false,
    ) {
    }

    public function headings(): array
    {
        return match ($this->type) {
            'directorates' => ['code', 'name', 'director_username', 'status'],
            'divisions' => ['code', 'name', 'directorate_code', 'directorate_name', 'gm_username', 'status'],
            'departments' => ['code', 'name', 'division_code', 'division_name', 'manager_username', 'status'],
            'users' => ['username', 'name', 'email', 'password', 'role', 'directorate_code', 'directorate_name', 'division_code', 'division_name', 'department_code', 'department_name', 'position', 'status'],
            default => [],
        };
    }

    public function collection(): Collection
    {
        if ($this->template) {
            return collect([$this->sampleRow()]);
        }

        return match ($this->type) {
            'directorates' => $this->directorates(),
            'divisions' => $this->divisions(),
            'departments' => $this->departments(),
            'users' => $this->users(),
            default => collect(),
        };
    }

    private function directorates(): Collection
    {
        return Directorate::query()
            ->with('director:id,username')
            ->when($this->request->q, fn ($query, $search) => $query->where('name', 'like', "%{$search}%"))
            ->when($this->request->filled('statuses'), fn ($query) => $query->whereIn('status', (array) $this->request->statuses))
            ->orderBy('name')
            ->get()
            ->map(fn (Directorate $row) => [
                $row->code,
                $row->name,
                $row->director?->username,
                $row->status,
            ]);
    }

    private function divisions(): Collection
    {
        return Division::query()
            ->with(['directorate:id,code,name', 'generalManager:id,username'])
            ->when($this->request->q, fn ($query, $search) => $query->where('name', 'like', "%{$search}%"))
            ->when($this->request->filled('statuses'), fn ($query) => $query->whereIn('status', (array) $this->request->statuses))
            ->when($this->request->filled('directorate_ids'), fn ($query) => $query->whereIn('directorate_id', (array) $this->request->directorate_ids))
            ->orderBy('name')
            ->get()
            ->map(fn (Division $row) => [
                $row->code,
                $row->name,
                $row->directorate?->code,
                $row->directorate?->name,
                $row->generalManager?->username,
                $row->status,
            ]);
    }

    private function departments(): Collection
    {
        return Department::query()
            ->with(['division:id,code,name', 'manager:id,username'])
            ->when($this->request->q, fn ($query, $search) => $query->where('name', 'like', "%{$search}%"))
            ->when($this->request->filled('statuses'), fn ($query) => $query->whereIn('status', (array) $this->request->statuses))
            ->when($this->request->filled('division_ids'), fn ($query) => $query->whereIn('division_id', (array) $this->request->division_ids))
            ->orderBy('name')
            ->get()
            ->map(fn (Department $row) => [
                $row->code,
                $row->name,
                $row->division?->code,
                $row->division?->name,
                $row->manager?->username,
                $row->status,
            ]);
    }

    private function users(): Collection
    {
        return User::query()
            ->with(['directorate:id,code,name', 'division:id,code,name', 'department:id,code,name'])
            ->when($this->request->q, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($this->request->filled('roles'), fn ($query) => $query->whereIn('role', (array) $this->request->roles))
            ->when($this->request->filled('statuses'), fn ($query) => $query->whereIn('status', (array) $this->request->statuses))
            ->when($this->request->filled('directorate_ids'), fn ($query) => $query->whereIn('directorate_id', (array) $this->request->directorate_ids))
            ->when($this->request->filled('division_ids'), fn ($query) => $query->whereIn('division_id', (array) $this->request->division_ids))
            ->when($this->request->filled('department_ids'), fn ($query) => $query->whereIn('department_id', (array) $this->request->department_ids))
            ->orderBy('name')
            ->get()
            ->map(fn (User $row) => [
                $row->username,
                $row->name,
                $row->email,
                '',
                $row->role,
                $row->directorate?->code,
                $row->directorate?->name,
                $row->division?->code,
                $row->division?->name,
                $row->department?->code,
                $row->department?->name,
                $row->position,
                $row->status,
            ]);
    }

    private function sampleRow(): array
    {
        return match ($this->type) {
            'directorates' => ['DIR-OPS', 'Direktorat Operasional', 'direktur.ops', 'active'],
            'divisions' => ['DIV-HCGA', 'Human Capital & General Affair', 'DIR-OPS', '', 'gm.hcga', 'active'],
            'departments' => ['DEPT-IT', 'Information Technology', 'DIV-HCGA', '', 'manager.it', 'active'],
            'users' => ['rafi', 'Rafi Ahmad', 'rafi@example.com', 'password123', 'pegawai', 'DIR-OPS', '', 'DIV-HCGA', '', 'DEPT-IT', '', 'Staff', 'active'],
            default => [],
        };
    }
}
