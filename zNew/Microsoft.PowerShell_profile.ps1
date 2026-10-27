function toDoc {

    param([string]$InputFile)

    # Убираем пробелы по краям
    $trimmed = $InputFile.Trim()

    # Если пусто — подставляем list.md, но это лучше вообще не делать:
    # пользователь должен явно указать файл.
    if ([string]::IsNullOrEmpty($trimmed)) {
        Write-Warning "Имя файла не указано. Используется list.md по умолчанию."
        $trimmed = "list.md"
    }

    $InputFile = $trimmed

    # ВАЖНО: используй СВОЙ шаблон, а не Normal.dotm.
    # Пример: создай TechDoc.dotx в C:\Templates и укажи этот путь.
    $template = "C:\Users\John\AppData\Roaming\Microsoft\Templates\Normal.dotm"

    if (-not (Test-Path $template)) {
        Write-Error "Шаблон не найден: $template"
        return
    }

    cd C:\Users\John\Downloads

    # Вычисляем имя выходного файла
    $outputFile = $InputFile -replace '\.md$', '.docx'
    # Удаляем старый файл, чтобы не было путаницы между версиями
    if (Test-Path $outputFile) {
       Remove-Item $outputFile -Force
       Write-Verbose "Старый файл удалён: $outputFile"
    }

    pandoc $InputFile -o $outputFile --reference-doc=$template --toc --toc-depth=3

    Write-Host "Готово! Файл: $outputFile" -ForegroundColor Green
}
