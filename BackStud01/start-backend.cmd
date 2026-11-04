@echo off
REM ============================================================
REM  TLK Portal — Backend launcher (Windows, без activate.bat)
REM  Запуск: start-backend.cmd            (порт 8000)
REM          start-backend.cmd 8001       (другой порт)
REM          start-backend.cmd 8000 --pause  (не закрывать окно)
REM ============================================================
setlocal EnableDelayedExpansion

REM ─── 1. Кодировка UTF-8 для корректного вывода кириллицы ───
chcp 65001 >nul

REM ─── 2. Параметры ──────────────────────────────────────────
set "HOST=0.0.0.0"
set "PORT=%~1"
if "%PORT%"=="" set "PORT=8000"
set "VENV_DIR=.venv"
set "VENV_PY=%VENV_DIR%\Scripts\python.exe"
set "VENV_UVICORN=%VENV_DIR%\Scripts\uvicorn.exe"
set "REQ_FILE=requirements.txt"
set "ENV_FILE=.env"

REM ─── 3. Переход в папку скрипта ────────────────────────────
cd /d "%~dp0"
echo [TLK] Рабочая папка: %CD%
echo.

REM ─── 4. Проверка системного Python ─────────────────────────
where python >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Python не найден в PATH.
    echo Установите Python 3.10+ с python.org
    echo и отметьте "Add Python to PATH" при установке.
    goto :fail
)
for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set "PYVER=%%v"
echo [TLK] Системный Python: %PYVER%

REM ─── 5. Создание venv при первом запуске ───────────────────
if not exist "%VENV_PY%" (
    echo [TLK] Виртуальное окружение отсутствует — создаю...
    python -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo [ОШИБКА] Не удалось создать venv.
        goto :fail
    )
    echo [TLK] venv создан: %VENV_DIR%
) else (
    echo [TLK] venv найден: %VENV_DIR%
)

REM ─── 6. Установка зависимостей (только если нужно) ─────────
if not exist "%VENV_UVICORN%" goto :install_deps

REM Если requirements.txt новее uvicorn.exe — переустановить
for %%A in ("%REQ_FILE%") do set "REQ_TIME=%%~tA"
for %%A in ("%VENV_UVICORN%") do set "UV_TIME=%%~tA"
if "%REQ_FILE%" NEQ "" if "%REQ_TIME%" GTR "%UV_TIME%" goto :install_deps
goto :check_env

:install_deps
if exist "%REQ_FILE%" (
    echo [TLK] Устанавливаю зависимости из %REQ_FILE% ...
    "%VENV_PY%" -m pip install --upgrade pip >nul
    "%VENV_PY%" -m pip install -r "%REQ_FILE%"
    if errorlevel 1 (
        echo [ОШИБКА] Не удалось установить зависимости.
        goto :fail
    )
) else (
    echo [TLK] %REQ_FILE% не найден — ставлю минимальный набор...
    "%VENV_PY%" -m pip install --upgrade pip >nul
    "%VENV_PY%" -m pip install fastapi "uvicorn[standard]" psycopg2-binary python-dotenv
    if errorlevel 1 (
        echo [ОШИБКА] Не удалось установить зависимости.
        goto :fail
    )
)
echo [TLK] Зависимости установлены.

REM ─── 7. Проверка .env ──────────────────────────────────────
:check_env
if not exist "%ENV_FILE%" (
    echo [ПРЕДУПРЕЖДЕНИЕ] %ENV_FILE% отсутствует — создаю шаблон.
    (
        echo DB_HOST=127.0.0.1
        echo DB_PORT=5432
        echo DB_NAME=postgres
        echo DB_PASSWORD=123
    ) > "%ENV_FILE%"
    echo [TLK] Создан %ENV_FILE%. Отредактируйте при необходимости.
)

REM ─── 8. Освобождение порта, если занят ─────────────────────
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    echo [TLK] Порт %PORT% занят процессом PID=%%p — останавливаю.
    taskkill /PID %%p /F >nul 2>&1
    timeout /t 1 /nobreak >nul
)

REM ─── 9. Запуск uvicorn напрямую из venv ────────────────────
echo.
echo ============================================================
echo   TLK Portal Backend
echo   Слушаем: http://%HOST%:%PORT%
echo   Health:  http://127.0.0.1:%PORT%/health
echo   Остановка: Ctrl+C
echo ============================================================
echo.

"%VENV_UVICORN%" main:app --host %HOST% --port %PORT%

REM ─── 10. Сюда попадаем после остановки uvicorn ────────────
echo.
echo [TLK] Бэкенд остановлен.
if "%~2"=="--pause" pause
endlocal
exit /b 0

:fail
echo.
echo [TLK] Запуск прерван из-за ошибки.
if "%~2"=="--pause" pause
endlocal
exit /b 1