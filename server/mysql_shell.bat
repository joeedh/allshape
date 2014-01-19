set PATH=%PATH%;C:\wamp\bin\mysql\mysql5.5.24\bin;C:\MinGW\msys\1.0\bin;C:\MinGW\bin;
set MYSQL_CONFIG=perl C:\wamp\bin\mysql\mysql5.5.24\bin\mysql_config.pl
cd C:\Users\JoeEagar\Google Drive\WebGL\server
set COMSPEC=%WINDIR%\SysWOW64\cmd.exe

if "x%MSYSBGCOLOR%" == "x" set MSYSBGCOLOR=White
if "x%MSYSFGCOLOR%" == "x" set MSYSFGCOLOR=Black
if "x%MINGW32BGCOLOR%" == "x" set MINGW32BGCOLOR=LightYellow
if "x%MINGW32FGCOLOR%" == "x" set MINGW32FGCOLOR=Navy
if "%MSYSTEM%" == "MSYS" set BGCOLOR=%MSYSBGCOLOR%
if "%MSYSTEM%" == "MSYS" set FGCOLOR=%MSYSFGCOLOR%
if "%MSYSTEM%" == "MINGW32" set BGCOLOR=%MINGW32BGCOLOR%
if "%MSYSTEM%" == "MINGW32" set FGCOLOR=%MINGW32FGCOLOR%

cd C:\Users\JoeEagar\Google Drive\WebGL\server
bash --login -i "C:\Users\JoeEagar\Google Drive\WebGL\server\bash_start.sh"
