@echo off
echo Creating .env file from .env.example...

REM Copy .env.example to .env
copy .env.example .env

echo.
echo ================================
echo .env file created successfully!
echo ================================
echo.
echo The email settings have been copied:
echo - SMTP_USERNAME=
echo - SMTP_PASSWORD is set
echo - FROM_EMAIL=
echo.
echo Your parent email notifications should now work!
echo.
echo Please restart the backend server to load the new configuration.
echo.
pause
