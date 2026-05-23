<?php

namespace Database\Seeders;

use App\Models\LetterTemplate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class LetterTemplateTableSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'name' => 'Nota Dinas Internal',
                'category' => 'both',
                'description' => 'Template Nota Dinas PT Berdikari untuk surat internal dan surat keluar.',
                'content_template' => '<p>Sehubungan dengan {{subject}}, bersama ini kami sampaikan materi Nota Dinas untuk menjadi pertimbangan dan persetujuan.</p><p>{{body}}</p><p>Demikian disampaikan, atas perhatian dan arahannya kami ucapkan terima kasih.</p>',
                'extra_fields' => [
                    ['key' => 'recipients', 'label' => 'Kepada Yth', 'type' => 'textarea', 'required' => true],
                    ['key' => 'cc', 'label' => 'Tembusan', 'type' => 'textarea', 'required' => false],
                    ['key' => 'sender', 'label' => 'Dari', 'type' => 'text', 'required' => true],
                    ['key' => 'body', 'label' => 'Isi Surat', 'type' => 'textarea', 'required' => true],
                ],
            ],
        ];

        foreach ($templates as $template) {
            LetterTemplate::create([
                'name' => $template['name'],
                'slug' => Str::slug($template['name']),
                'description' => $template['description'],
                'category' => $template['category'],
                'status' => 'active',
                'content_template' => $template['content_template'],
                'extra_fields' => $template['extra_fields'],
            ]);
        }
    }
}
