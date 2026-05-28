<?php

namespace App\Services;

use App\Models\Setting;

class LetterFieldRequirementService
{
    public const DEFINITIONS = [
        'incoming_external' => [
            'letter_type_id' => 'Jenis Surat',
            'letter_number' => 'Nomor Surat',
            'subject' => 'Perihal',
            'scan_file' => 'File Scan PDF',
            'origin_name' => 'Asal Surat',
            'notes' => 'Catatan',
        ],
        'internal' => [
            'letter_type_id' => 'Jenis Surat',
            'subject' => 'Perihal',
            'scan_file' => 'File Scan PDF',
            'internal_origin' => 'Asal Surat',
            'targets' => 'Tujuan',
            'cc_targets' => 'Tembusan',
            'letter_number' => 'Nomor Surat',
        ],
        'outgoing' => [
            'letter_type_id' => 'Jenis Surat',
            'subject' => 'Perihal',
            'scan_file' => 'File Scan PDF',
            'internal_origin' => 'Asal Surat',
            'external_recipient' => 'Tujuan Eksternal',
            'letter_number' => 'Nomor Surat',
        ],
        'archive' => [
            'letter_type_id' => 'Jenis Surat',
            'letter_number' => 'Nomor Surat',
            'subject' => 'Perihal',
            'scan_file' => 'File Scan PDF',
            'notes' => 'Catatan',
        ],
    ];

    public function defaults(): array
    {
        return [
            'incoming_external' => [
                'letter_type_id' => true,
                'letter_number' => false,
                'subject' => true,
                'scan_file' => true,
                'origin_name' => true,
                'notes' => false,
            ],
            'internal' => [
                'letter_type_id' => true,
                'subject' => true,
                'scan_file' => true,
                'internal_origin' => true,
                'targets' => true,
                'cc_targets' => false,
                'letter_number' => false,
            ],
            'outgoing' => [
                'letter_type_id' => true,
                'subject' => true,
                'scan_file' => true,
                'internal_origin' => true,
                'external_recipient' => true,
                'letter_number' => false,
            ],
            'archive' => [
                'letter_type_id' => true,
                'letter_number' => false,
                'subject' => true,
                'scan_file' => true,
                'notes' => false,
            ],
        ];
    }

    public function get(?Setting $setting = null): array
    {
        $setting ??= Setting::query()->first();

        return $this->normalize($setting?->letter_field_requirements ?? []);
    }

    public function normalize(array $value): array
    {
        $defaults = $this->defaults();

        foreach (self::DEFINITIONS as $context => $fields) {
            foreach ($fields as $field => $label) {
                $defaults[$context][$field] = (bool) ($value[$context][$field] ?? $defaults[$context][$field] ?? false);
            }
        }

        return $defaults;
    }

    public function required(string $context, string $field): bool
    {
        $requirements = $this->get();

        return (bool) ($requirements[$context][$field] ?? false);
    }
}
