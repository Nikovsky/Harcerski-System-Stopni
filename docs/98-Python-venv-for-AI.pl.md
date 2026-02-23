## Instalowanie bibliotek
Po aktywacji `.venv`:
```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

> [!TIP]
> Warto wcześniej podbić PIP (update)
> ```powershell
> python -m pip install -U pip
> ```

## INIT
1. Utworzenie venv w projekcie:
```powershell
py -m venv .venv
```

2. Aktywacja venv
```powershell
.\.venv\Scripts\python.exe
# lub
# .\.venv\Scripts\Activate.ps1
```

3. Instalacja paczek
```powershell
python -m pip install -U pip
pip install rich regex charset-normalizer pyyaml tomlkit orjson typer pathspec tqdm
```

4. Generacja zależności
```powershell
pip freeze > requirements.txt
```


## Dodatkowe auto aktywowanie .venv w VSCode:
**.vscode/lunch.json**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Current File (venv)",
      "type": "python",
      "request": "launch",
      "program": "${file}",
      "console": "integratedTerminal",
      "justMyCode": true
    }
  ]
}
```

**.vscode/settings.json**
```json
{
{
  "python.terminal.activateEnvironment": true,
  "python.analysis.exclude": [
    "**/.venv/**",
    "**/node_modules",
    "**/__pycache__"
  ],
  // "python.defaultInterpreterPath": "${workspaceFolder}\\.venv\\Scripts\\python.exe",
  "python.defaultInterpreterPath": "${workspaceFolder}\\.venv\\Scripts\\Activate.ps1",
}
}
```
