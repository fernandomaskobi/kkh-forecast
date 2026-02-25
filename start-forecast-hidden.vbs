Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\Fernando Maskobi\OneDrive\Desktop\KKH  analyses\KKH AI\kkh-forecast"
WshShell.Run "cmd /c npm run dev", 0, False
