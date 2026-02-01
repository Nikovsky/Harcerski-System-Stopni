# @file: ./scripts/core/doctoring.py
# @description: Doctor registry and ENV validation/fix engine (decorator-driven)

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Callable, Final

from scripts.core.errors import CliError
from scripts.core.global_vars import gv
from scripts.schemas.schema import EnvSchema, EnvVarSpec
from scripts.utils.console import msg, msgx
from scripts.utils.prompt import ask_yes_no


@dataclass(frozen=True, slots=True)
class EnvIssue:
    """Single env validation issue."""
    key: str
    kind: str  # "missing" | "empty" | "invalid"
    line_no: int | None
    message: str


@dataclass(frozen=True, slots=True)
class EnvCheck:
    """Registered env check via decorator."""
    schema: EnvSchema
    rel_path: str
    func: Callable[[], None]

@dataclass(frozen=True, slots=True)
class TextFixResult:
    """Result of a text normalization fix."""
    scanned: int
    changed: int
    skipped: int

class DoctorRegistry:
    """Registry for doctor checks, populated via decorators."""

    def __init__(self) -> None:
        self._checks: list[EnvCheck] = []

    def __call__(self, schema: EnvSchema, rel_path: str) -> Callable[[Callable[[], None]], Callable[[], None]]:
        """
        Decorator:

        @doctor(schema.nest, "./.env")
        def _check_env(): ...
        """
        def _decorator(fn: Callable[[], None]) -> Callable[[], None]:
            def _wrapped() -> None:
                self._run_env_check(schema=schema, rel_path=rel_path)
                fn()

            self._checks.append(EnvCheck(schema=schema, rel_path=rel_path, func=_wrapped))
            return _wrapped

        return _decorator

    def run_all(self, *, yes: bool, check_only: bool) -> int:
        """
        Run all registered checks.

        Returns exit code:
          0 => all OK (or fixed)
          2 => some remain broken
        """
        if not self._checks:
            msgx.w("[doctor] No checks registered.")
            return 0

        broken = 0
        for chk in self._checks:
            ok = self._run_env_check(schema=chk.schema, rel_path=chk.rel_path, yes=yes, check_only=check_only)
            if not ok:
                broken += 1

        if broken == 0:
            msgx.s("[doctor] All checks passed.")
            return 0

        msgx.e(f"[doctor] Completed with issues remaining: {broken}")
        return 2

    # ---- ENV CHECK IMPLEMENTATION ---------------------------------------------------------------

    def _run_env_check(
        self,
        *,
        schema: EnvSchema,
        rel_path: str,
        yes: bool = False,
        check_only: bool = False,
    ) -> bool:
        """
        Validate (and optionally fix) a single env file.

        Behavior:
          - missing file => [w] and generate default (unless check_only)
          - issues => print + expected keys + prompt to fix (default No) unless yes=True
          - fixes => backup then patch only failing keys (no full overwrite policy)
        """
        root = gv().repo_root
        path = (root / rel_path.lstrip("./")).resolve()

        if not path.exists():
            msgx.w(f"[doctor] Missing file: {path} -> generating default file")
            if check_only:
                return False
            self._write_default_env(path=path, schema=schema)
            msgx.s(f"[doctor] Default file created: {path}")
            return True

        issues = self._validate_env(path=path, schema=schema)
        if not issues:
            msgx.s(f"[doctor] {schema.name} OK: {path}")
            return True

        msgx.e(f"[doctor] Found issues in {path.name}:")
        for it in issues:
            # use msg (no prefix) for clean bullets like in your screenshot
            if it.line_no is None:
                msg(f"- [missing] {it.key}: {it.message}")
            else:
                msg(f"- [{it.kind}] {it.key} (line {it.line_no}): {it.message}")

        msg("")  # spacing
        msg("Expected .env keys:")
        for line in self._describe_schema(schema):
            msg(line)

        if check_only:
            return False

        apply = True if yes else ask_yes_no(f"Apply fixes to {path.name}?", default_no=True)
        if not apply:
            msgx.w(f"[doctor] Skipped fixes for: {path.name}")
            return False

        self._backup_file(path=path)
        fixed = self._apply_fixes(path=path, schema=schema, issues=issues)
        if not fixed:
            msgx.e(f"[doctor] Could not apply fixes for: {path.name}")
            return False

        # re-validate
        after = self._validate_env(path=path, schema=schema)
        if after:
            msgx.e(f"[doctor] Fix applied but file is still invalid: {path.name}")
            return False

        msgx.s(f"[doctor] Fixed file written: {path}")
        return True

    def _validate_env(self, *, path: Path, schema: EnvSchema) -> list[EnvIssue]:
        lines = path.read_text(encoding="utf-8").splitlines(keepends=False)
        parsed = _parse_env_lines(lines)

        issues: list[EnvIssue] = []
        for key, spec in schema.keys.items():
            entry = parsed.get(key)

            if entry is None:
                if spec.required:
                    issues.append(EnvIssue(key=key, kind="missing", line_no=None, message="Required key is missing."))
                continue

            line_no, value = entry
            if value.strip() == "":
                if spec.required:
                    issues.append(EnvIssue(key=key, kind="empty", line_no=line_no, message="Required key is empty."))
                continue

            if spec.allowed is not None and value not in spec.allowed:
                issues.append(
                    EnvIssue(
                        key=key,
                        kind="invalid",
                        line_no=line_no,
                        message=f"Value {value!r} is not allowed; allowed={sorted(spec.allowed)}.",
                    )
                )

        return issues

    def _apply_fixes(self, *, path: Path, schema: EnvSchema, issues: list[EnvIssue]) -> bool:
        """
        Patch only the failing keys:
          - missing => append KEY=DEFAULT
          - empty/invalid => replace value on the existing line
        Keeps unrelated lines unchanged.
        """
        original_lines = path.read_text(encoding="utf-8").splitlines(keepends=False)
        indexed = _index_env_assignments(original_lines)  # key -> last index

        to_append: list[str] = []
        lines = list(original_lines)

        for issue in issues:
            spec = schema.keys.get(issue.key)
            if spec is None:
                continue

            default_val = spec.default
            if default_val is None:
                # if you want stricter policy: raise error here
                msgx.w(f"[doctor] No default for {issue.key}; cannot auto-fix.")
                continue

            if issue.kind == "missing":
                # to_append.append(f"{issue.key}={_quote_if_needed(default_val)}")
                to_append.append(f"{issue.key}={_format_value(spec, default_val)}")

                continue

            idx = indexed.get(issue.key)
            if idx is None:
                # treat as missing if parser didn't find an assignment line
                # to_append.append(f"{issue.key}={_quote_if_needed(default_val)}")
                to_append.append(f"{issue.key}={_format_value(spec, default_val)}")

                continue

            # lines[idx] = _replace_env_value_line(lines[idx], issue.key, default_val)
            lines[idx] = _replace_env_value_line(lines[idx], issue.key, default_val, spec)


        if to_append:
            if lines and lines[-1].strip() != "":
                lines.append("")
            lines.append("# Added by doctor (missing required keys)")
            lines.extend(to_append)

        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return True

    def _write_default_env(self, *, path: Path, schema: EnvSchema) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)

        root = gv().repo_root
        try:
            rel = "./" + str(path.relative_to(root)).replace("\\", "/")
        except Exception:
            rel = str(path)

        lines: list[str] = []
        lines.append(f"# @file: {rel}")
        lines.append(f"# @description: Generated by doctor (defaults) for {schema.name}")
        lines.append("#")

        for key, spec in schema.keys.items():
            if not spec.required:
                continue
            if spec.default is None:
                raise CliError(f"[doctor] Missing default for required key: {key} ({schema.name})")
            lines.append(f"{key}={_format_value(spec, spec.default)}")

        lines.append("")
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")


    def _backup_file(self, *, path: Path) -> None:
        root = gv().repo_root
        tmp = root / "tmp"
        tmp.mkdir(parents=True, exist_ok=True)

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup = tmp / f"{path.name}.{ts}.bad.env"
        backup.write_text(path.read_text(encoding="utf-8"), encoding="utf-8")
        msgx.i(f"[doctor] Backup saved: {backup}")

    def _describe_schema(self, schema: EnvSchema) -> list[str]:
        out: list[str] = []
        for key in sorted(schema.keys.keys()):
            spec = schema.keys[key]
            req = "required" if spec.required else "optional"
            default = f"default={spec.default}" if spec.default is not None else "default=none"
            allowed = f"allowed={sorted(spec.allowed)}" if spec.allowed is not None else "allowed=any"
            out.append(f"- {key} ({req}, {default}, {allowed}) — {spec.help}")
        return out


    def run_env_check(self, *, schema: EnvSchema, rel_path: str, yes: bool = False, check_only: bool = False) -> bool:
        """
        Public API to validate (and optionally fix) a single env file.
        Used by other subsystems (e.g., docker decorator).
        """
        return self._run_env_check(schema=schema, rel_path=rel_path, yes=yes, check_only=check_only)


    def normalize_shell_scripts_lf(
        self,
        *,
        root_rel: str,
        glob_pattern: str = "**/*.sh",
        yes: bool = False,
        check_only: bool = False,
    ) -> TextFixResult:
        """
        Ensure all shell scripts under root_rel use LF line endings.
        Converts CRLF -> LF, keeps content otherwise unchanged.
        """
        root = gv().repo_root
        base = (root / root_rel.lstrip("./")).resolve()
        if not base.exists():
            msgx.w(f"[doctor] Shell scripts root does not exist: {base}")
            return TextFixResult(scanned=0, changed=0, skipped=0)

        msgx.i(f"[doctor] Checking shell scripts line endings (LF): root={base} pattern={glob_pattern}")
        changed_files: list[Path] = []
        paths = sorted(p for p in base.glob(glob_pattern) if p.is_file())

        scanned = 0
        changed = 0
        skipped = 0

        for p in paths:
            scanned += 1
            if not _file_has_crlf(p):
                continue

            msgx.w(f"[doctor] CRLF detected in: {p}")
            if check_only:
                skipped += 1
                continue

            apply = True if yes else ask_yes_no(f"Convert to LF: {p.name}?", default_no=True)
            if not apply:
                msgx.w(f"[doctor] Skipped: {p.name}")
                skipped += 1
                continue

            self._backup_text_file(path=p, suffix="bad.sh")
            _convert_file_crlf_to_lf(p)
            changed_files.append(p)
            msgx.s(f"[doctor] Converted to LF: {p}")
            changed += 1

        if scanned == 0:
            msgx.i("[doctor] No .sh files found to check.")

        msgx.i(f"[doctor] Shell scripts LF done: scanned={scanned} changed={changed} skipped={skipped}")
        if changed_files:
            msgx.i("[doctor] Converted files:")
            for fp in changed_files:
                msgx.i(f"  - {fp}")
        else:
            msgx.s("[doctor] No CRLF issues found in .sh files.")

        return TextFixResult(scanned=scanned, changed=changed, skipped=skipped)

    def _backup_text_file(self, *, path: Path, suffix: str) -> None:
        root = gv().repo_root
        tmp = root / "tmp"
        tmp.mkdir(parents=True, exist_ok=True)

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup = tmp / f"{path.name}.{ts}.{suffix}"
        backup.write_bytes(path.read_bytes())
        msgx.i(f"[doctor] Backup saved: {backup}")



doctor: Final[DoctorRegistry] = DoctorRegistry()


# ---- helpers (pure functions) --------------------------------------------------------------------

_ASSIGN_RE: Final[re.Pattern[str]] = re.compile(
    r"""^\s*(?:export\s+)?(?P<key>[A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?P<val>.*)\s*$"""
)


def _parse_env_lines(lines: list[str]) -> dict[str, tuple[int, str]]:
    """
    Parse env lines to key -> (line_no, value).
    Uses the LAST occurrence as effective (common env behavior).
    """
    out: dict[str, tuple[int, str]] = {}
    for i, raw in enumerate(lines, start=1):
        s = raw.strip()
        if not s or s.startswith("#"):
            continue
        m = _ASSIGN_RE.match(raw)
        if not m:
            continue
        key = m.group("key")
        val = _unquote(_strip_inline_comment(m.group("val")))
        out[key] = (i, val)
    return out


def _index_env_assignments(lines: list[str]) -> dict[str, int]:
    """Return key -> last line index (0-based) for assignment lines."""
    idx: dict[str, int] = {}
    for i, raw in enumerate(lines):
        s = raw.strip()
        if not s or s.startswith("#"):
            continue
        m = _ASSIGN_RE.match(raw)
        if not m:
            continue
        key = m.group("key")
        idx[key] = i
    return idx


def _replace_env_value_line(raw_line: str, key: str, new_value: str) -> str:
    """
    Replace only the value part for KEY=... while preserving:
      - leading whitespace
      - 'export ' prefix if present
      - inline comment (best effort)
    """
    m = _ASSIGN_RE.match(raw_line)
    if not m:
        return f"{key}={_quote_if_needed(new_value)}"

    # Preserve 'export ' if present
    prefix = "export " if raw_line.lstrip().startswith("export ") else ""

    # Preserve leading whitespace of the original line
    leading_ws = raw_line[: len(raw_line) - len(raw_line.lstrip())]

    # Preserve inline comment (best effort)
    val_raw = m.group("val")
    val_stripped = val_raw.rstrip()
    comment = ""
    split = _split_inline_comment(val_stripped)
    if split is not None:
        _val_part, comment = split
        comment = " " + comment if comment else ""

    return f"{leading_ws}{prefix}{key}={_quote_if_needed(new_value)}{comment}".rstrip()


def _split_inline_comment(val: str) -> tuple[str, str] | None:
    """
    Best-effort split at ' #' (space-hash), common .env style.
    Returns (value_part, comment_with_hash) or None.
    """
    pos = val.find(" #")
    if pos == -1:
        return None
    return val[:pos].rstrip(), val[pos + 1 :].strip()  # keep '#...' in comment


def _strip_inline_comment(val: str) -> str:
    split = _split_inline_comment(val)
    return val if split is None else split[0]


def _unquote(val: str) -> str:
    v = val.strip()
    if len(v) >= 2 and ((v[0] == v[-1] == '"') or (v[0] == v[-1] == "'")):
        return v[1:-1]
    return v


def _quote_if_needed(val: str) -> str:
    if val == "":
        return '""'
    needs = any(ch.isspace() for ch in val) or "#" in val
    if not needs:
        return val
    return '"' + val.replace('"', '\\"') + '"'


def _format_value(spec: EnvVarSpec, val: str) -> str:
    """Format value using schema rules (quote=True forces double quotes)."""
    if spec.quote:
        return _double_quote(val)
    return _quote_if_needed(val)


def _double_quote(val: str) -> str:
    return '"' + val.replace('"', '\\"') + '"'


def _replace_env_value_line(raw_line: str, key: str, new_value: str, spec: EnvVarSpec) -> str:
    """
    Replace only KEY value while preserving:
      - leading whitespace
      - 'export ' prefix if present
      - inline comment (best effort)
    """
    m = _ASSIGN_RE.match(raw_line)
    if not m:
        return f"{key}={_format_value(spec, new_value)}"

    prefix = "export " if raw_line.lstrip().startswith("export ") else ""
    leading_ws = raw_line[: len(raw_line) - len(raw_line.lstrip())]

    val_raw = m.group("val")
    comment = ""
    split = _split_inline_comment(val_raw.rstrip())
    if split is not None:
        _val_part, comment = split
        comment = " " + comment if comment else ""

    return f"{leading_ws}{prefix}{key}={_format_value(spec, new_value)}{comment}".rstrip()


def _file_has_crlf(path: Path) -> bool:
    data = path.read_bytes()
    return b"\r\n" in data


def _convert_file_crlf_to_lf(path: Path) -> None:
    data = path.read_bytes()
    # Convert CRLF -> LF, also normalize lone CR (rare) -> LF
    data = data.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
    path.write_bytes(data)
