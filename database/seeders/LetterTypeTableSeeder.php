<?php

namespace Database\Seeders;

use App\Models\LetterType;
use Illuminate\Database\Seeder;

class LetterTypeTableSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['name' => 'Nota Dinas', 'description' => 'Surat internal resmi antar unit kerja.'],
            ['name' => 'Undangan', 'description' => 'Surat undangan kegiatan, rapat, atau koordinasi.'],
            ['name' => 'Surat Edaran', 'description' => 'Surat pemberitahuan informasi resmi.'],
        ];

        foreach ($types as $type) {
            $letterType = LetterType::query()->firstOrNew(['name' => $type['name']]);

            $letterType->fill([
                'description' => $type['description'],
                'status' => $letterType->status ?: 'active',
            ]);

            $letterType->save();
        }
    }
}
