<?php

namespace App\Http\Controllers;

use App\Models\LetterSignatureRequest;

class SignatureVerificationController extends Controller
{
    public function show(string $token)
    {
        $signatureRequest = LetterSignatureRequest::query()
            ->with(['letter', 'signer:id,name,username,position'])
            ->where('verification_token', $token)
            ->firstOrFail();

        return inertia('Public/SignatureVerification', [
            'signature' => $signatureRequest,
            'letter' => $signatureRequest->letter,
        ]);
    }
}
