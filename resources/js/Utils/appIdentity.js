export const DEFAULT_APP_NAME = "Surat dan Arsip Digital Berdikari";
export const DEFAULT_COMPANY_NAME = "PT Berdikari";

export function appName(settings) {
    return settings?.app_name || DEFAULT_APP_NAME;
}

export function companyName(settings) {
    return settings?.company_name || DEFAULT_COMPANY_NAME;
}
