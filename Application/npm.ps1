param(
  [Parameter(ValueFromRemainingArguments = $true)]
  $Arguments
)
& "C:\Program Files\nodejs\npm.cmd" @Arguments
