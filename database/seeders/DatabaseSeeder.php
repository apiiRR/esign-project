<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(RolesTableSeeder::class);
        $this->call(PermissionsTableSeeder::class);
        $this->call(OrganizationTableSeeder::class);
        $this->call(UserTableSeeder::class);
        $this->call(LetterTypeTableSeeder::class);
        $this->call(LetterTemplateTableSeeder::class);
        $this->call(SettingTableSeeder::class);
    }
}
