Option Explicit

Dim http
Set http = CreateObject("MSXML2.XMLHTTP")

On Error Resume Next
http.Open "POST", "http://localhost:3001/api/shutdown", False
http.setRequestHeader "Content-Type", "application/json"
http.Send "{}"

If Err.Number = 0 Then
    MsgBox "หยุดระบบ Dental Quota Walk-in เรียบร้อยแล้ว", 64, "Dental Quota Walk-in"
Else
    MsgBox "ระบบไม่ได้ทำงานอยู่", 48, "Dental Quota Walk-in"
End If
