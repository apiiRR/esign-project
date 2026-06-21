export const DEFAULT_APP_NAME = "Surat dan Arsip Digital Berdikari";
export const DEFAULT_COMPANY_NAME = "PT XYZ";

export function appName(settings) {
    return settings?.app_name || DEFAULT_APP_NAME;
}

export function companyName(settings) {
    return settings?.company_name || DEFAULT_COMPANY_NAME;
}

export function settingsMediaUrl(filename) {
    return filename ? `/media/settings/${encodeURIComponent(filename)}` : "";
}

export function appLogoUrl(settings) {
    return settingsMediaUrl(settings?.company_logo);
}

export function loginLogoUrl(settings) {
    return settingsMediaUrl(settings?.login_logo || settings?.company_logo);
}
