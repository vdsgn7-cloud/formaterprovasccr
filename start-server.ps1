$port = 8080
$root = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "Servidor rodando em http://localhost:$port" -ForegroundColor Green
    Write-Host "Pasta: $root" -ForegroundColor Cyan

    Start-Sleep -Milliseconds 800
    Start-Process "http://localhost:$port"

    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request  = $context.Request
            $response = $context.Response

            $urlPath = $request.Url.LocalPath.TrimStart('/')
            if ($urlPath -eq '' -or $urlPath -eq '/') { $urlPath = 'index.html' }

            $filePath = Join-Path $root $urlPath

            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PATCH, DELETE, PUT")
            $response.Headers.Add("Access-Control-Allow-Headers", "*")

            if ($request.HttpMethod -eq "OPTIONS") {
                $response.StatusCode = 204
                $response.OutputStream.Close()
                continue
            }

            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = switch ($ext) {
                    '.html' { 'text/html; charset=utf-8' }
                    '.css'  { 'text/css; charset=utf-8' }
                    '.js'   { 'application/javascript; charset=utf-8' }
                    '.json' { 'application/json; charset=utf-8' }
                    '.png'  { 'image/png' }
                    '.jpg'  { 'image/jpeg' }
                    '.svg'  { 'image/svg+xml' }
                    '.ico'  { 'image/x-icon' }
                    default { 'application/octet-stream' }
                }

                $content = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentType = $contentType
                $response.ContentLength64 = $content.Length
                $response.StatusCode = 200
                $response.OutputStream.Write($content, 0, $content.Length)
            } else {
                $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
                $response.StatusCode = 404
                $response.ContentType = 'text/plain'
                $response.ContentLength64 = $body.Length
                $response.OutputStream.Write($body, 0, $body.Length)
            }

            $response.OutputStream.Close()

        } catch [System.Net.HttpListenerException] {
            break
        } catch {
            try { $context.Response.Close() } catch {}
        }
    }
} catch {
    Write-Host "ERRO: $_" -ForegroundColor Red
    Write-Host "Verifique se a porta $port nao esta em uso." -ForegroundColor Yellow
} finally {
    try { $listener.Stop() } catch {}
    try { $listener.Close() } catch {}
}
