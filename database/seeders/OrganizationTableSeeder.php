<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Directorate;
use App\Models\Division;
use Illuminate\Database\Seeder;

class OrganizationTableSeeder extends Seeder
{
    public function run(): void
    {
        $finance = Directorate::create([
            'name' => 'Direktorat Utama',
            'code' => '1',
        ]);

        $operations = Directorate::create([
            'name' => 'Direktorat Keuangan & SDM',
            'code' => '2',
        ]);

        $procurement = Division::create([
            'directorate_id' => $finance->id,
            'name' => 'Corporate Strategy & Digital Transformation',
            'code' => '3',
        ]);

        $distribution = Division::create([
            'directorate_id' => $operations->id,
            'name' => 'Human Capital & General Affair',
            'code' => '4',
        ]);

        Department::create([
            'division_id' => $procurement->id,
            'name' => 'Information Technology',
            'code' => '1',
        ]);

        Department::create([
            'division_id' => $distribution->id,
            'name' => 'General Affair & Procurement',
            'code' => '2',
        ]);
    }
}
