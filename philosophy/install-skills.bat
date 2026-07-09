@echo off
REM ============================================================
REM Carbon-Silicon Bond - Skill Installer (Windows)
REM Companion: install-skills-core.js
REM
REM Usage:
REM   install-skills.bat [options]
REM
REM Options:
REM   --all              Install all skills (default)
REM   --required-only    Install required skills only
REM   --skill <id>       Install a specific skill
REM   --target <dir>     Target directory (default: %CD%\skills)
REM   --agent <name>     Agent name (skip interactive prompt)
REM   --list             List available skills
REM   --dry-run          Preview without installing
REM   --help, -h, /?     Show this help
REM ============================================================

setlocal enabledelayedexpansion

REM Script directory (strip trailing backslash)
set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

REM Defaults
set "TARGET_DIR=%CD%\skills"
set "MANIFEST_FILE=%SCRIPT_DIR%\skills-manifest.json"
set "AGENT_NAME="
set "DRY_RUN=false"
set "MODE=all"
set "TARGET_SKILL="

REM Handle help/list first (no other args needed)
if /i "%~1"=="--help" goto :show_help
if /i "%~1"=="-h" goto :show_help
if /i "%~1"=="/?" goto :show_help
if /i "%~1"=="--list" goto :list_skills

REM Parse args
:parse_args
if "%~1"=="" goto :after_parse
if /i "%~1"=="--all" (
    set "MODE=all"
    shift
    goto :parse_args
)
if /i "%~1"=="--required-only" (
    set "MODE=required"
    shift
    goto :parse_args
)
if /i "%~1"=="--skill" (
    set "MODE=single"
    set "TARGET_SKILL=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="--target" (
    set "TARGET_DIR=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="--agent" (
    set "AGENT_NAME=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="--dry-run" (
    set "DRY_RUN=true"
    shift
    goto :parse_args
)

echo [ERROR] Unknown option: %~1
echo.
goto :show_help

:after_parse
REM If --agent not given, prompt interactively
if "%AGENT_NAME%"=="" (
    echo Welcome to CSB skill installer!
    set /p "AGENT_NAME=Enter your Agent name (default: Inheritor): "
    if "!AGENT_NAME!"=="" set "AGENT_NAME=Inheritor"
)

if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

node "%SCRIPT_DIR%\install-skills-core.js" "%MANIFEST_FILE%" "%SCRIPT_DIR%" "%TARGET_DIR%" "%AGENT_NAME%" "%MODE%" "%TARGET_SKILL%" "%DRY_RUN%"
set EXIT_CODE=%ERRORLEVEL%

if %EXIT_CODE% NEQ 0 (
    echo.
    echo [ERROR] Installation failed, code: %EXIT_CODE%
    exit /b %EXIT_CODE%
)

exit /b 0

:list_skills
node -e "const fs=require('fs');const m=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));console.log('');console.log('Available skills:');console.log('-----------------------------------------------');m.skills.forEach(s=>{var tag=s.required?'REQUIRED':'optional';console.log('  '+s.id+' - '+s.name+' ['+tag+']');console.log('    '+s.description);console.log();});console.log('-----------------------------------------------');console.log('Total: '+m.skills.length);" "%MANIFEST_FILE%"
exit /b 0

:show_help
echo Carbon-Silicon Bond - Skill Installer (Windows)
echo.
echo Usage:
echo   install-skills.bat [options]
echo.
echo Options:
echo   --all              Install all skills (default)
echo   --required-only    Install required skills only
echo   --skill ^<id^>       Install a specific skill
echo   --target ^<dir^>     Target directory (default: %CD%\skills)
echo   --agent ^<name^>     Agent name (skip interactive prompt)
echo   --list             List available skills
echo   --dry-run          Preview without installing
echo   --help, -h, /?      Show this help
exit /b 0