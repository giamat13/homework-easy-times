@echo off
REM מפעיל את האפליקציה בדפדפן. מנסה Python, ואם אין - Node.
where python >nul 2>nul && (python "%~dp0serve.py" & exit /b)
where py     >nul 2>nul && (py "%~dp0serve.py" & exit /b)
where npx    >nul 2>nul && (start "" http://localhost:8000/index.html & npx --yes serve -l 8000 "%~dp0" & exit /b)
echo לא נמצא Python או Node. התקן אחד מהם, או פתח את התיקייה בעורך עם שרת סטטי.
pause
