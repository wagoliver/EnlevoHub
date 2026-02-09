Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get the EnlevoHub directory
strPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
strEnlevoPath = objFSO.GetParentFolderName(strPath)

' Change to EnlevoHub directory
objShell.CurrentDirectory = strEnlevoPath

' Start the daemon in hidden window
' 0 = Hidden window, False = Don't wait for it to finish
objShell.Run "cmd /c node packages\daemon\dist\index.js > logs\enlevohub.log 2>&1", 0, False

WScript.Quit
