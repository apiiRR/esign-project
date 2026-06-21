<?php

namespace App\Services;

use App\Models\AuditTrail;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

class AuditTrailService
{
    public function log(
        ?Request $request,
        ?User $user,
        string $category,
        string $action,
        ?string $description = null,
        ?Model $auditable = null,
        array $metadata = []
    ): ?AuditTrail {
        try {
            $context = $this->requestContext($request);

            return AuditTrail::query()->create([
                'user_id' => $user?->id,
                'category' => $category,
                'action' => $action,
                'description' => $description,
                'auditable_type' => $auditable?->getMorphClass(),
                'auditable_id' => $auditable?->getKey(),
                'metadata' => $metadata ?: null,
                'ip_address' => $context['ip_address'],
                'user_agent' => $context['user_agent'],
                'device' => $context['device'],
                'location_source' => $context['location_source'],
                'latitude' => $context['latitude'],
                'longitude' => $context['longitude'],
                'city' => $context['city'],
                'region' => $context['region'],
                'country' => $context['country'],
                'created_at' => now(),
            ]);
        } catch (Throwable) {
            return null;
        }
    }

    public function requestContext(?Request $request): array
    {
        $location = $this->location($request);

        return [
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'device' => $this->device($request?->userAgent()),
            'location_source' => $location['source'] ?? null,
            'latitude' => $location['latitude'] ?? null,
            'longitude' => $location['longitude'] ?? null,
            'city' => $location['city'] ?? null,
            'region' => $location['region'] ?? null,
            'country' => $location['country'] ?? null,
        ];
    }

    public function signatureSnapshot(?Request $request): array
    {
        $context = $this->requestContext($request);

        return [
            'signed_ip_address' => $context['ip_address'],
            'signed_user_agent' => $context['user_agent'],
            'signed_device' => $context['device'],
            'signed_location_source' => $context['location_source'],
            'signed_latitude' => $context['latitude'],
            'signed_longitude' => $context['longitude'],
            'signed_city' => $context['city'],
            'signed_region' => $context['region'],
            'signed_country' => $context['country'],
        ];
    }

    public function location(?Request $request): array
    {
        $latitude = $request?->header('X-Client-Latitude');
        $longitude = $request?->header('X-Client-Longitude');

        if (is_numeric($latitude) && is_numeric($longitude)) {
            return [
                'source' => 'gps',
                'latitude' => $latitude,
                'longitude' => $longitude,
            ];
        }

        $ip = $request?->ip();
        if (! $ip || in_array($ip, ['127.0.0.1', '::1'], true) || Str::startsWith($ip, ['10.', '192.168.', '172.16.'])) {
            return ['source' => 'ip_lookup'];
        }

        try {
            $response = Http::timeout(2)->acceptJson()->get("http://ip-api.com/json/{$ip}", [
                'fields' => 'status,country,regionName,city,lat,lon',
            ]);

            if ($response->ok() && $response->json('status') === 'success') {
                return [
                    'source' => 'ip_lookup',
                    'latitude' => $response->json('lat'),
                    'longitude' => $response->json('lon'),
                    'city' => $response->json('city'),
                    'region' => $response->json('regionName'),
                    'country' => $response->json('country'),
                ];
            }
        } catch (Throwable) {
            //
        }

        return ['source' => 'ip_lookup'];
    }

    public function device(?string $userAgent): ?string
    {
        if (! $userAgent) {
            return null;
        }

        $platform = match (true) {
            str_contains($userAgent, 'Windows') => 'Windows',
            str_contains($userAgent, 'Mac OS') => 'macOS',
            str_contains($userAgent, 'Android') => 'Android',
            str_contains($userAgent, 'iPhone'), str_contains($userAgent, 'iPad') => 'iOS',
            str_contains($userAgent, 'Linux') => 'Linux',
            default => 'Unknown',
        };

        $browser = match (true) {
            str_contains($userAgent, 'Edg/') => 'Edge',
            str_contains($userAgent, 'Chrome/') => 'Chrome',
            str_contains($userAgent, 'Safari/') && ! str_contains($userAgent, 'Chrome/') => 'Safari',
            str_contains($userAgent, 'Firefox/') => 'Firefox',
            default => 'Browser',
        };

        return "{$browser} / {$platform}";
    }
}
