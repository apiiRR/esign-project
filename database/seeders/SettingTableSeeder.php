<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Services\LetterFieldRequirementService;

class SettingTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Pastikan hanya ada 1 data setting
        DB::table('settings')->truncate();

        DB::table('settings')->insert([
            'app_name' => 'Surat & Arsip Digital',
            'company_name' => 'PT Berdikari',
            'company_code' => 'BDK',
            'company_logo' => null,
            'letter_field_requirements' => json_encode(app(LetterFieldRequirementService::class)->defaults()),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
