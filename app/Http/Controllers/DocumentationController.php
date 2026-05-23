<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DocumentationController extends Controller
{
    public function admin()
    {
        return inertia('Admin/Documentation/Index');
    }

    public function pegawai()
    {
        return inertia('Pegawai/Documentation/Index');
    }

    public function developer()
    {
        return inertia('Public/DeveloperDocs');
    }
}
