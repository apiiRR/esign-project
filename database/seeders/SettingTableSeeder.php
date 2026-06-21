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
            'app_name' => 'Surat dan Arsip Digital Berdikari',
            'company_name' => 'PT Berdikari',
            'company_code' => 'APP',
            'company_logo' => null,
            'login_logo' => null,
            'letter_field_requirements' => json_encode(app(LetterFieldRequirementService::class)->defaults()),
            'mail_notifications_enabled' => false,
            'mail_letter_notifications_enabled' => false,
            'mail_signature_approval_notifications_enabled' => false,
            'signature_otp_enabled' => false,
            'document_download_otp_scope' => 'both',
            'mail_mailer' => 'smtp',
            'mail_host' => null,
            'mail_port' => null,
            'mail_username' => null,
            'mail_password' => null,
            'mail_encryption' => null,
            'mail_from_address' => null,
            'mail_from_name' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
