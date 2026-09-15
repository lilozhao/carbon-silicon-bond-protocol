#!/usr/bin/env bash
# check-repo-hygiene.sh — 共享仓卫生检查（CSB 七仓通用 · 机器拦）
#
# 策略真源: carbon-silicon-bond-protocol/docs/shared-repo-hygiene.md
# 缘起    : 2026-09-14 —— ① 实例配置混入（config 的 self 段）② 六端分叉
# 维护    : 若兰 🌸
#
# 用法:
#   scripts/check-repo-hygiene.sh              # 检查暂存区（pre-commit 语义，默认 strict）
#   scripts/check-repo-hygiene.sh --audit      # 审计全部已跟踪文件（找历史卫生债）
#   scripts/check-repo-hygiene.sh --files f1 f2
#   scripts/check-repo-hygiene.sh --no-strict  # 只查黑名单，不强制白名单
#   scripts/check-repo-hygiene.sh --install-hook
# 退出码: 0 = 通过 · 1 = 命中违规 · 2 = 用法/环境错误
#
# 检查项:
#   A 路径黑名单   —— identity/AID、*.env、密钥、*.bak、data|logs、known-agents…
#   B 内容: 私钥块 · 疑似 token · RFC1918 内网 IP · 公网 IP(URL/host:port 形态) · 凭据赋值 · config 的 "self" 段
#   C 白名单 fail-closed —— 新增文件必须命中白名单（--no-strict 关闭）
#   D 实例名隔离 —— 模板/上下文（a2a-contexts/ 等）不得出现具体实例名（2026-09-15 加）
set -u

strict=1
mode=staged
files=()

while [ $# -gt 0 ]; do
  case "$1" in
    --audit)        mode=audit ;;
    --staged)       mode=staged ;;
    --files)        shift; while [ $# -gt 0 ]; do files+=("$1"); shift; done; mode=files; break ;;
    --strict)       strict=1 ;;
    --no-strict)    strict=0 ;;
    --install-hook) mode=install ;;
    -h|--help)      sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
  shift
done

root=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "❌ 不在 git 仓库内" >&2; exit 2; }
cd "$root" || exit 2

tmp=$(mktemp 2>/dev/null) || tmp="$root/.git/hygiene.tmp"
trap 'rm -f "$tmp"' EXIT

# ---------- 安装 pre-commit ----------
if [ "$mode" = install ]; then
  hook=".git/hooks/pre-commit"
  mkdir -p .git/hooks
  cat > "$hook" <<'HOOK'
#!/usr/bin/env bash
exec "$(git rev-parse --show-toplevel)/scripts/check-repo-hygiene.sh"
HOOK
  chmod +x "$hook"
  echo "✅ 已安装 pre-commit → scripts/check-repo-hygiene.sh"
  exit 0
fi

# ---------- 组装敏感串（分段，避免脚本自身被规则命中）----------
PK_HDR='-----BEGIN '
PK_TAIL='PRIVATE KEY-----'
TOK_RE='(ghp_[A-Za-z0-9]{20,}|glpat-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16})'
IP_RE='(^|[^0-9])(10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}|192\.168\.[0-9]{1,3}\.[0-9]{1,3}|172\.(1[6-9]|2[0-9]|3[01])\.[0-9]{1,3}\.[0-9]{1,3})([^0-9]|$)'
SELF_RE='"self"[[:space:]]*:'
# 实例名隔离（2026-09-15）：模板/上下文里写死实例名 → 随仓分发造成全网身份串号（恺事件）
INSTANCE_NAMES_DEFAULT='阿轩|若兰|明德|小虾|恺|墨丘|舟楫|苏念|清漪|星尘|言蹊|若琢|鲸歌|川贝|知砚|若辰|初白|Jeason'
GATE_RE='OPENCLAW_GATEWAY_TOKEN[[:space:]]*=[[:space:]]*["'\'']?[A-Za-z0-9_./+-]{16,}'

deny_path() {
  local p="$1"
  case "$p" in
    *.example|*.sample|*.template) return 1 ;;   # 模板放行
  esac
  grep -Eq '(^|/)[^/]*\.env([._-][^/]*)?$|(^|/)\.env$' <<<"$p" && return 0
  grep -Eq '(^|/)identity[^/]*\.json' <<<"$p" && return 0
  grep -Eq '(^|/)[^/]*[-.]aid\.json$' <<<"$p" && return 0
  grep -Eq '(^|/)known-agents\.json$' <<<"$p" && return 0
  grep -Eq '\.(pem|key|p12|pfx|jks)$' <<<"$p" && return 0
  grep -Eq '\.(bak|backup|orig|tmp|swp|swo)([._-]|$)|~$' <<<"$p" && return 0
  grep -Eq '(^|/)(data|logs?)/' <<<"$p" && return 0
  return 1
}

template_path() {
  local p="$1"
  case "$p" in *'a2a-contexts/local/'*) return 1 ;; esac   # 实例专属，本地，不扫
  # 只扫「会被注入的模板」：a2a-contexts 下的 md/txt + *.template/*.sample
  # （json 等记录类数据不注入，不在本规则内）
  if grep -Eq '(^|/)a2a-contexts/[^/]+\.(md|txt)$' <<<"$p"; then return 0; fi
  grep -Eq '\.(template|sample)$' <<<"$p" && return 0
  return 1
}

allow_path() {
  local p="$1" base="${1##*/}"
  case "$p" in *.example|*.sample|*.template|*.schema.json) return 0 ;; esac
  case "$base" in
    README*|LICENSE*|CHANGELOG*|CONTRIBUTING*|CODE_OF_CONDUCT*|Makefile|makefile|VERSION|Dockerfile|.gitignore|.gitattributes|.editorconfig|*.lock|*.md) return 0 ;;
  esac
  grep -Eq '^(src|docs|tests?|__tests__|scripts|assets|examples|community|philosophy|protocol|negotiation|legacy|community-site)/' <<<"$p" && return 0
  grep -Eq '\.(js|mjs|cjs|ts|tsx|py|sh|bash|json|md|markdown|txt|yml|yaml|toml|ini|cfg|conf|css|scss|html|htm|svg|png|jpe?g|gif|webp|ico|csv)$' <<<"$p" && return 0
  return 1
}

# ---------- 收集目标 ----------
case "$mode" in
  staged) mapfile -t files < <(git diff --cached --name-only --diff-filter=ACMR) ;;
  audit)  mapfile -t files < <(git ls-files) ;;
esac

echo "🔎 check-repo-hygiene · mode=$mode · strict=$strict · 目标 ${#files[@]} 个文件"
[ ${#files[@]} -eq 0 ] && { echo "✅ 无文件，通过"; exit 0; }

v=0
for f in "${files[@]}"; do
  [ -z "$f" ] && continue

  # A. 路径黑名单
  if deny_path "$f"; then
    printf '  🚫 [黑名单·路径] %s\n     → 实例本地/敏感，永不入库: git rm --cached "%s"\n' "$f" "$f"
    v=$((v+1)); continue
  fi

  # C. 白名单 fail-closed（仅暂存区新增文件）
  if [ "$strict" = 1 ] && [ "$mode" = staged ]; then
    if git diff --cached --name-status --diff-filter=A -- "$f" 2>/dev/null | grep -q '^A'; then
      if ! allow_path "$f"; then
        printf '  ⚠️ [白名单外·fail-closed] %s\n     → 新增文件须命中白名单；确要入库请 PR 改策略 §1\n' "$f"
        v=$((v+1))
      fi
    fi
  fi

  # B. 内容扫描（先落到临时文件，避免二进制空字节告警）
  if [ "$mode" = staged ]; then git show ":$f" >"$tmp" 2>/dev/null || : >"$tmp"; else cat "$f" >"$tmp" 2>/dev/null || : >"$tmp"; fi
  if [ -s "$tmp" ]; then
    grep -a -Eq -- "$PK_HDR.*$PK_TAIL" "$tmp" && { printf '  🚫 [私钥内容] %s\n' "$f"; v=$((v+1)); }
    grep -a -Eq -- "$TOK_RE" "$tmp"          && { printf '  🚫 [疑似 token] %s\n' "$f"; v=$((v+1)); }
    grep -a -Eq -- "$IP_RE" "$tmp"           && { printf '  🚫 [内网 IP] %s\n' "$f"; v=$((v+1)); }
    pub=$(grep -a -oE '//[0-9]{1,3}(\.[0-9]{1,3}){3}|[0-9]{1,3}(\.[0-9]{1,3}){3}:[0-9]{1,5}' "$tmp" 2>/dev/null | grep -oE '[0-9]{1,3}(\.[0-9]{1,3}){3}' | sort -u | grep -vE '^(10\.|127\.|0\.|255\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.|192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)')
    [ -n "$pub" ] && { printf '  🚫 [疑似公网 IP] %s → %s\n' "$f" "$(echo "$pub" | tr '\n' ' ')"; v=$((v+1)); }
    grep -a -Eq -- "$GATE_RE" "$tmp"         && { printf '  🚫 [凭据赋值] %s\n' "$f"; v=$((v+1)); }
    if template_path "$f"; then
      names="$INSTANCE_NAMES_DEFAULT"
      [ -n "${HYGIENE_INSTANCE_NAMES:-}" ] && names="$HYGIENE_INSTANCE_NAMES"
      if [ -f "$root/config/hygiene-instance-names.txt" ]; then
        fromfile=$(grep -vE '^[[:space:]]*(#|$)' "$root/config/hygiene-instance-names.txt" 2>/dev/null | tr '\n' '|' | sed 's/|$//')
        [ -n "$fromfile" ] && names="$fromfile"
      fi
      if grep -a -Eq -- "$names" "$tmp"; then
        hit=$(grep -a -oE -- "$names" "$tmp" | sort -u | tr '\n' ' ')
        printf '  🚫 [模板含实例名] %s → %s\n     → 模板/上下文必须中性：身份只走运行时注入（策略 §7）\n' "$f" "$hit"; v=$((v+1))
      fi
    fi
    if grep -a -Eq -- "$SELF_RE" "$tmp" && grep -Eq '(^|/)config/.*\.json$' <<<"$f"; then
      printf '  🚫 [实例 self 段] %s\n     → self 属实例本地（identity.json，gitignored）\n' "$f"; v=$((v+1))
    fi
  fi
done

echo ""
if [ "$v" -gt 0 ]; then
  echo "❌ 卫生检查未通过：$v 处 · 策略: docs/shared-repo-hygiene.md"
  exit 1
fi
echo "✅ 卫生检查通过（${#files[@]} 个文件）"
exit 0
