Option Explicit

Dim WshShell, FSO, exeDir, exePath

Set WshShell = CreateObject("WScript.Shell")
Set FSO     = CreateObject("Scripting.FileSystemObject")

exeDir  = FSO.GetParentFolderName(WScript.ScriptFullName)
exePath = exeDir & "\dental-quota-walkin.exe"

' --- Check if server already running ---
Function IsServerRunning()
    Dim http
    Set http = CreateObject("MSXML2.XMLHTTP")
    On Error Resume Next
    http.Open "GET", "http://localhost:3001/api/health", False
    http.setRequestHeader "Connection", "close"
    http.Send
    If Err.Number = 0 And http.Status = 200 Then
        IsServerRunning = True
    Else
        IsServerRunning = False
    End If
    On Error GoTo 0
End Function

' --- Start server if not running ---
If Not IsServerRunning() Then
    ' window style 0 = completely hidden (no console)
    WshShell.Run Chr(34) & exePath & Chr(34), 0, False

    ' Wait up to 20 seconds for server to be ready
    Dim i
    For i = 1 To 20
        WScript.Sleep 1000
        If IsServerRunning() Then Exit For
    Next
End If

' --- Open default browser ---
WshShell.Run "http://localhost:3001"
