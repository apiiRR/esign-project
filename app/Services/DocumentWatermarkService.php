<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use setasign\Fpdi\Fpdi;

class DocumentWatermarkService
{
    public function make(string $sourceAbsolutePath, Letter $letter, User $user): string
    {
        $relativePath = 'tmp/downloads/' . Str::uuid() . '.pdf';
        $destination = Storage::disk('local')->path($relativePath);

        if (! is_dir(dirname($destination))) {
            mkdir(dirname($destination), 0755, true);
        }

        $pdf = new class extends Fpdi {
            protected float $angle = 0;
            protected array $extGStates = [];

            public function rotate(float $angle, float $x = -1, float $y = -1): void
            {
                if ($x === -1) {
                    $x = $this->x;
                }

                if ($y === -1) {
                    $y = $this->y;
                }

                if ($this->angle !== 0.0) {
                    $this->_out('Q');
                }

                $this->angle = $angle;
                if ($angle !== 0.0) {
                    $angle *= M_PI / 180;
                    $c = cos($angle);
                    $s = sin($angle);
                    $cx = $x * $this->k;
                    $cy = ($this->h - $y) * $this->k;
                    $this->_out(sprintf(
                        'q %.5F %.5F %.5F %.5F %.5F %.5F cm 1 0 0 1 %.5F %.5F cm',
                        $c,
                        $s,
                        -$s,
                        $c,
                        $cx,
                        $cy,
                        -$cx,
                        -$cy
                    ));
                }
            }

            public function _endpage(): void
            {
                if ($this->angle !== 0.0) {
                    $this->angle = 0;
                    $this->_out('Q');
                }

                parent::_endpage();
            }

            public function setAlpha(float $alpha): void
            {
                $alpha = max(0.0, min(1.0, $alpha));
                if ($this->PDFVersion < '1.4') {
                    $this->PDFVersion = '1.4';
                }

                $gs = $this->addExtGState(['ca' => $alpha, 'CA' => $alpha]);
                $this->setExtGState($gs);
            }

            protected function addExtGState(array $parameters): int
            {
                foreach ($this->extGStates as $index => $extGState) {
                    if ($extGState['parms'] === $parameters) {
                        return $index;
                    }
                }

                $index = count($this->extGStates) + 1;
                $this->extGStates[$index]['parms'] = $parameters;

                return $index;
            }

            protected function setExtGState(int $index): void
            {
                $this->_out(sprintf('/GS%d gs', $index));
            }

            protected function _putextgstates(): void
            {
                foreach ($this->extGStates as $index => $extGState) {
                    $this->_newobj();
                    $this->extGStates[$index]['n'] = $this->n;
                    $this->_put('<</Type /ExtGState');
                    $this->_put(sprintf('/ca %.3F', $extGState['parms']['ca']));
                    $this->_put(sprintf('/CA %.3F', $extGState['parms']['CA']));
                    $this->_put('>>');
                    $this->_put('endobj');
                }
            }

            protected function _putresourcedict(): void
            {
                parent::_putresourcedict();

                if ($this->extGStates) {
                    $this->_put('/ExtGState <<');
                    foreach ($this->extGStates as $index => $extGState) {
                        $this->_put('/GS' . $index . ' ' . $extGState['n'] . ' 0 R');
                    }
                    $this->_put('>>');
                }
            }

            protected function _putresources(): void
            {
                $this->_putextgstates();
                parent::_putresources();
            }
        };

        $settings = $this->settings();
        $pageCount = $pdf->setSourceFile($sourceAbsolutePath);
        $text = $this->watermarkText($letter, $user, $settings);

        for ($pageNumber = 1; $pageNumber <= $pageCount; $pageNumber++) {
            $templateId = $pdf->importPage($pageNumber);
            $size = $pdf->getTemplateSize($templateId);
            $width = (float) $size['width'];
            $height = (float) $size['height'];
            $orientation = $width > $height ? 'L' : 'P';

            $pdf->AddPage($orientation, [$width, $height]);
            $pdf->useTemplate($templateId);
            $pdf->SetTextColor(80, 80, 80);
            $pdf->setAlpha($this->alphaFromOpacity((float) $settings['opacity']));
            $fontSize = (float) $settings['font_size'];
            $pdf->SetFont('Arial', 'B', $fontSize);
            $textWidth = $pdf->GetStringWidth($text);
            [$centerX, $centerY, $x, $y] = $this->textPlacementFromCenter($settings, $width, $height, $textWidth, $fontSize);

            $pdf->rotate(-1 * (float) $settings['angle'], $centerX, $centerY);
            $pdf->Text(
                $x,
                $y,
                $text
            );
            $pdf->rotate(0);
            $pdf->setAlpha(1);
        }

        $pdf->Output($destination, 'F');

        return $destination;
    }

    private function watermarkText(Letter $letter, User $user, array $settings): string
    {
        $setting = Setting::query()->first();
        $template = trim((string) ($settings['text_template'] ?? ''));
        if ($template === '') {
            $template = Setting::defaultDocumentDownloadWatermarkSettings()['text_template'];
        }

        $number = $letter->letter_number ?: 'dokumen';
        $downloadedAt = now('Asia/Jakarta')->format('d/m/Y H:i:s');

        return strtr($template, [
            '{user_name}' => $user->name ?: '-',
            '{user_email}' => $user->email ?: '-',
            '{downloaded_at}' => $downloadedAt,
            '{document_number}' => $number,
            '{document_subject}' => $letter->subject ?: $letter->title ?: '-',
            '{app_name}' => $setting?->app_name ?: config('app.name'),
            '{company_name}' => $setting?->company_name ?: '-',
        ]);
    }

    private function settings(): array
    {
        $defaults = Setting::defaultDocumentDownloadWatermarkSettings();
        $setting = Setting::query()->first();
        $values = $setting?->documentDownloadWatermarkSettingsWithDefaults() ?: $defaults;

        return [
            'x_percent' => $this->clamp($values['x_percent'] ?? $defaults['x_percent'], 0, 100),
            'y_percent' => $this->clamp($values['y_percent'] ?? $defaults['y_percent'], 0, 100),
            'angle' => $this->clamp($values['angle'] ?? $defaults['angle'], -90, 90),
            'font_size' => $this->clamp($values['font_size'] ?? $defaults['font_size'], 8, 36),
            'opacity' => $this->clamp($values['opacity'] ?? $defaults['opacity'], 10, 80),
            'color' => 'gray',
            'text_template' => filled($values['text_template'] ?? null)
                ? (string) $values['text_template']
                : $defaults['text_template'],
        ];
    }

    private function clamp(mixed $value, float $min, float $max): float
    {
        if (! is_numeric($value)) {
            return $min;
        }

        return max($min, min($max, (float) $value));
    }

    private function alphaFromOpacity(float $opacity): float
    {
        return max(10, min(80, $opacity)) / 100;
    }

    private function textPlacementFromCenter(array $settings, float $pageWidth, float $pageHeight, float $textWidth, float $fontSize): array
    {
        $margin = 2.0;
        $centerX = max($margin, min($pageWidth - $margin, $pageWidth * ((float) $settings['x_percent'] / 100)));
        $centerY = max($margin, min($pageHeight - $margin, $pageHeight * ((float) $settings['y_percent'] / 100)));
        $textHeight = $fontSize * 0.352778;

        return [
            $centerX,
            $centerY,
            $centerX - ($textWidth / 2),
            $centerY + ($textHeight / 2),
        ];
    }
}
