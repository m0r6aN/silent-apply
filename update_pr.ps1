# Read the PR body
$prBody = Get-Content "PR_BODY_UPDATED.md" -Raw

# Escape for JSON
$prBodyEscaped = $prBody -replace '\\', '\\' -replace '"', '\"' -replace "`r`n", '\r\n' -replace "`n", '\n'

# Create JSON payload
$json = @"
{
  "title": "[DRAFT] Integration Scaffolding: Keon + OMEGA + Canon Alignment (NO MERGE)",
  "body": "$prBodyEscaped"
}
"@

# Save to file for inspection
$json | Out-File "pr_update_payload.json" -Encoding UTF8

Write-Host "PR update payload created in pr_update_payload.json"
Write-Host "Body length: $($prBody.Length) characters"

