<?php

namespace App\Services;

use App\Models\Department;
use App\Models\Directorate;
use App\Models\Division;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Setting;
use App\Models\User;
use Carbon\Carbon;

class LetterNumberGenerator
{
    public const DEFAULT_FORMAT = '{day}-{daily_sequence}/{letter_type_code}/{company_code}/{origin_code}/{roman_month}/{year}';

    public function preview(LetterType $letterType, User $user, string $context, array $payload = []): ?string
    {
        if (! $this->isEnabledForContext($letterType, $context)) {
            return null;
        }

        return $this->render($letterType, $user, $context, $payload, now(), $this->nextSequence(now()));
    }

    public function generate(LetterType $letterType, User $user, string $context, array $payload = []): ?string
    {
        if (! $this->isEnabledForContext($letterType, $context)) {
            return null;
        }

        $date = now();
        $sequence = $this->nextSequence($date);

        do {
            $number = $this->render($letterType, $user, $context, $payload, $date, $sequence);
            $sequence++;
        } while (Letter::query()->where('letter_number', $number)->exists());

        return $number;
    }

    public function isEnabledForContext(LetterType $letterType, string $context): bool
    {
        $contexts = $letterType->numbering_contexts ?: [];

        return (bool) $letterType->numbering_enabled
            && in_array($context, $contexts, true);
    }

    private function render(LetterType $letterType, User $user, string $context, array $payload, Carbon $date, int $sequence): string
    {
        $format = $letterType->numbering_format ?: self::DEFAULT_FORMAT;
        $variables = [
            'day' => $date->format('d'),
            'daily_sequence' => str_pad((string) $sequence, 2, '0', STR_PAD_LEFT),
            'letter_type_code' => $letterType->code ?: str_pad((string) $letterType->id, 2, '0', STR_PAD_LEFT),
            'company_code' => Setting::query()->value('company_code') ?: 'BDK',
            'origin_code' => $this->originCode($user, $payload),
            'roman_month' => $this->romanMonth((int) $date->format('n')),
            'month' => $date->format('m'),
            'year' => $date->format('Y'),
        ];

        return strtr($format, collect($variables)
            ->mapWithKeys(fn ($value, $key) => ['{' . $key . '}' => $value])
            ->all());
    }

    private function nextSequence(Carbon $date): int
    {
        return Letter::query()
            ->whereNotNull('letter_number')
            ->whereDate('created_at', $date->toDateString())
            ->count() + 1;
    }

    private function originCode(User $user, array $payload): string
    {
        $type = $payload['internal_origin_type'] ?? null;
        $id = (int) ($payload['internal_origin_id'] ?? 0);

        if ($type === 'department' && $id) {
            $department = Department::query()->with('division.directorate')->find($id);

            if ($department?->division?->directorate) {
                return sprintf(
                    'MGR-%s.%s.%s',
                    $this->unitCode($department->division->directorate),
                    $this->unitCode($department->division),
                    $this->unitCode($department)
                );
            }
        }

        if ($type === 'division' && $id) {
            $division = Division::query()->with('directorate')->find($id);

            if ($division?->directorate) {
                return sprintf('GM-%s.%s', $this->unitCode($division->directorate), $this->unitCode($division));
            }
        }

        if ($type === 'directorate' && $id) {
            $directorate = Directorate::query()->find($id);

            if ($directorate) {
                return 'DIR-' . $this->unitCode($directorate);
            }
        }

        if ($user->department_id) {
            return $this->originCode($user, [
                'internal_origin_type' => 'department',
                'internal_origin_id' => $user->department_id,
            ]);
        }

        if ($user->division_id) {
            return $this->originCode($user, [
                'internal_origin_type' => 'division',
                'internal_origin_id' => $user->division_id,
            ]);
        }

        if ($user->directorate_id) {
            return $this->originCode($user, [
                'internal_origin_type' => 'directorate',
                'internal_origin_id' => $user->directorate_id,
            ]);
        }

        return 'BDK';
    }

    private function unitCode(object $unit): string
    {
        return (string) ($unit->code ?: $unit->id);
    }

    private function romanMonth(int $month): string
    {
        return [
            1 => 'I',
            2 => 'II',
            3 => 'III',
            4 => 'IV',
            5 => 'V',
            6 => 'VI',
            7 => 'VII',
            8 => 'VIII',
            9 => 'IX',
            10 => 'X',
            11 => 'XI',
            12 => 'XII',
        ][$month] ?? '';
    }
}
