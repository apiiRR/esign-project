# Referensi Controller dan Fungsi

Dokumen ini adalah indeks cepat untuk mencari fungsi controller.

## Admin

### `Admin\Auth\LoginController`

- `index()`: halaman login.
- `store(Request)`: proses login.
- `logout(Request)`: proses logout.

### `Admin\DashboardController`

- `index()`: dashboard admin.

### `Admin\LetterController`

- `index(Request, string $type)`: daftar surat admin.
- `create(string $mode)`: form surat.
- `store(Request)`: simpan surat.
- `show(Letter, DispositionService)`: detail surat.
- `update(Request, Letter)`: update nomor/status.
- `destroyDraft(Request, Letter)`: hapus draft.
- `mapType(string)`: mapping route type.
- `typeLabel(string)`: label type.
- `resolveTargetUsers(Collection)`: target ke user.
- `targetOptions()`: options target.
- `uploadValidationMessages()`: pesan upload.
- `logUploadValidationFailure()`: log validasi upload.

### `Admin\DispositionController`

- `index(DispositionService)`: list disposisi.
- `store(Request, DispositionService)`: buat disposisi.
- `update(Request, Disposition)`: update disposisi.

### `Admin\OrganizationController`

- `index(Request, string $type)`: list organisasi.
- `store(Request, string $type)`: tambah organisasi.
- `update(Request, string $type, int $id)`: update organisasi.
- `destroy(string $type, int $id)`: hapus organisasi.
- `validatePayload(Request, string $type)`: validasi payload.
- `uniqueCode(string $model, string $name)`: kode unik.

### `Admin\UserController`

- `index()`: list user.
- `create()`: form create.
- `store(Request)`: simpan user.
- `edit(User)`: form edit.
- `update(Request, User)`: update user.
- `destroy(User)`: hapus user.
- `formOptions()`: options form.
- `validateOfficerUnit(Request)`: validasi pejabat unit.
- `syncOrganizationOfficer(User)`: sinkron pejabat organisasi.

### `Admin\SettingController`

- `index()`: form setting.
- `update(Request)`: simpan setting.
- `setting()`: ambil/buat setting row.

### `Admin\LetterTypeController`

- `index()`
- `store(Request)`
- `update(Request, LetterType)`
- `destroy(LetterType)`

### `Admin\NotificationController`

- `index()`: list notification log.

### `Admin\PermissionController`

- `index()`
- `create()`
- `store(Request)`
- `edit(Permission)`
- `update(Request, Permission)`
- `destroy(Permission)`

### `Admin\RoleController`

- `index()`
- `create()`
- `store(Request)`
- `edit(Role)`
- `update(Request, Role)`
- `destroy(Role)`

## Pegawai

### `Pegawai\PortalController`

Rendering dan dashboard:

- `workspace(Request, string $section, ?string $mode)`
- `detail(Request, Letter, DispositionService)`
- `baseProps(User)`
- `dashboardStats(User)`

Pembuatan surat:

- `storeInternal(Request)`
- `storeOutgoing(Request)`
- `storeIncomingExternal(Request)`
- `storeArchive(Request)`
- `storeLetter(Request, string $mode)`
- `destroyDraft(Request, Letter)`

Publish:

- `publishIncomingExternal(Request, Letter)`
- `revokeIncomingExternalPublication(Request, Letter, LetterTarget)`
- `canPublishLetter(Letter)`
- `businessLetterType(Letter)`
- `assertPublishTargetsExist(Collection)`

Disposisi:

- `storeDisposition(Request, Letter, DispositionService)`
- `replyDisposition(Request, Disposition, DispositionService)`
- `unitSnapshot(User)`
- `replyTarget(Disposition)`
- `annotateDispositionActions(Letter, User)`
- `dispositionTargetsUser(Disposition, User)`

Notifikasi:

- `openNotification(Request, NotificationLog)`

Query akses:

- `accessibleLetters(User, ?string $kind, bool $includeCreated)`
- `archiveLetters(User)`
- `applyLetterFilters(Builder, Request)`
- `applyDispositionFilters(Builder, Request)`
- `unreadLetters(User, string $kind)`
- `accessibleDispositions(User)`
- `canAccessLetter(User, Letter)`
- `targetMatches(Builder, User, ?string $kind)`
- `originMatches(Builder, User)`
- `letterOriginMatches(Letter, User)`
- `resolveTargetUsers(Collection)`
- `targetOptions()`

Helper surat:

- `makeReference(string $mode)`
- `normalizeInternalOriginPayload(Request)`
- `originSnapshot(User, array $validated, string $mode)`
- `attachTargetReadStatuses(Letter)`
- `uploadValidationMessages()`
- `logUploadValidationFailure(Request, ValidationException, string $mode)`

## Service

### `DispositionService`

- `optionsFor(User, bool, ?Letter)`
- `assertAllowed(User, string, ?int, bool, ?Letter)`
- `notifyUsers(Letter, User, string, ?int, ?string)`
- `resolveTargetUsers(string, ?int)`
- `scopeFor(User)`
- `targetTypesForScope(array)`

### `LetterFieldRequirementService`

- `defaults()`
- `get(?Setting)`
- `normalize(array)`
- `required(string, string)`
