<?php

namespace Database\Seeders;

use App\Models\LetterType;
use Illuminate\Database\Seeder;

class LetterTypeTableSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['name' => 'Nota Dinas', 'code' => '01', 'description' => 'Surat internal resmi antar unit kerja.'],
            ['name' => 'Undangan', 'code' => '02', 'description' => 'Surat undangan kegiatan, rapat, atau koordinasi.'],
            ['name' => 'Surat Edaran', 'code' => '03', 'description' => 'Surat pemberitahuan informasi resmi.'],
        ];

        foreach ($types as $type) {
            $letterType = LetterType::query()->firstOrNew(['name' => $type['name']]);

            $letterType->fill([
                'code' => $type['code'],
                'description' => $type['description'],
                'numbering_contexts' => $letterType->numbering_contexts ?: ['internal', 'outgoing'],
                'numbering_format' => $letterType->numbering_format ?: '{day}-{daily_sequence}/{letter_type_code}/{company_code}/{origin_code}/{roman_month}/{year}',
                'status' => $letterType->status ?: 'active',
            ]);

            if (! $letterType->exists) {
                $letterType->numbering_enabled = false;
            }

            $letterType->save();
        }
    }
}
