@echo off
chcp 65001 >nul
title ProvaFormat — Servidor Local
cls
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     ProvaFormat — Colégio Cristo Rei     ║
echo  ║          Iniciando servidor local...     ║
echo  ╚══════════════════════════════════════════╝
echo.
echo  O sistema sera aberto automaticamente em:
echo  http://localhost:8080
echo.
echo  Para encerrar o servidor, feche esta janela.
echo.

:: Verificar se PowerShell está disponível
where powershell >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERRO: PowerShell não encontrado.
    pause
    exit /b 1
)

:: Iniciar o servidor HTTP com PowerShell
powershell -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"

pause
