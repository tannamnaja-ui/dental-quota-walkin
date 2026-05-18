[Setup]
AppName=Dental Quota Walk-in
AppVersion=1.0.0
AppPublisher=IM Department
AppPublisherURL=https://github.com/tannamnaja-ui/dental-quota-walkin
AppSupportURL=https://github.com/tannamnaja-ui/dental-quota-walkin/issues
DefaultDirName={autopf}\DentalQuotaWalkin
DefaultGroupName=Dental Quota Walk-in
OutputDir=.
OutputBaseFilename=dentalquotaWalkin
SetupIconFile=
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=6.1
UninstallDisplayName=Dental Quota Walk-in
DisableProgramGroupPage=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons:"

[Dirs]
Name: "{commonappdata}\DentalQuotaWalkin"; Permissions: users-modify

[Files]
; Main server executable (includes Node.js runtime via pkg)
Source: "install_files\dental-quota-walkin.exe"; DestDir: "{app}"; Flags: ignoreversion

; Frontend static files
Source: "install_files\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs

; Launcher & stop scripts
Source: "install_files\launch.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "install_files\stop.vbs";   DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Start Menu
Name: "{group}\Dental Quota Walk-in";          Filename: "{app}\launch.vbs"; IconFilename: "{app}\dental-quota-walkin.exe"; IconIndex: 0
Name: "{group}\หยุดระบบ Dental Quota";         Filename: "{app}\stop.vbs";   IconFilename: "{sys}\shell32.dll"; IconIndex: 131
Name: "{group}\{cm:UninstallProgram,Dental Quota Walk-in}"; Filename: "{uninstallexe}"

; Desktop
Name: "{autodesktop}\Dental Quota Walk-in"; Filename: "{app}\launch.vbs"; IconFilename: "{app}\dental-quota-walkin.exe"; IconIndex: 0; Tasks: desktopicon

[Run]
; Open the app after installation finishes
Filename: "{app}\launch.vbs"; Description: "Launch Dental Quota Walk-in now"; Flags: nowait postinstall skipifsilent shellexec

[UninstallRun]
; Stop server before uninstall
Filename: "{app}\stop.vbs"; Flags: shellexec; RunOnceId: "StopServer"
