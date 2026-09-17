#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path


ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
LAYER = ROOT / "minijet"
OVERRIDES = LAYER / "overrides"


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"patch guard failed: {path}: expected 1 occurrence, got {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def copy(src: str, dst: str) -> None:
    target = ROOT / dst
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(OVERRIDES / src, target)


# 1) Add MiniJet components and global theme.
copy("MiniJetQuickInboundModal.tsx", "frontend/src/pages/inbounds/MiniJetQuickInboundModal.tsx")
copy("minijet.css", "frontend/src/styles/minijet.css")

main_tsx = ROOT / "frontend/src/main.tsx"
replace_once(
    main_tsx,
    "import '@/styles/page-cards.css';\n",
    "import '@/styles/page-cards.css';\nimport '@/styles/minijet.css';\n",
)

# 2) Use the two-field form for ADD while retaining the full upstream editor
#    only for maintenance/editing of existing nodes.
inbounds_page = ROOT / "frontend/src/pages/inbounds/InboundsPage.tsx"
replace_once(
    inbounds_page,
    "const InboundFormModal = lazy(() => import('./form/InboundFormModal'));\n",
    "const InboundFormModal = lazy(() => import('./form/InboundFormModal'));\n"
    "const MiniJetQuickInboundModal = lazy(() => import('./MiniJetQuickInboundModal'));\n",
)

old_modal = """        <LazyMount when={formOpen}>
          <InboundFormModal
            open={formOpen}
            onClose={() => setFormOpen(false)}
            onSaved={refresh}
            mode={formMode}
            dbInbound={formDbInbound}
            dbInbounds={dbInbounds}
            availableNodes={nodesList}
            availableNodesFetched={nodesFetched}
          />
        </LazyMount>
"""
new_modal = """        <LazyMount when={formOpen}>
          {formMode === 'add' ? (
            <MiniJetQuickInboundModal
              open={formOpen}
              onClose={() => setFormOpen(false)}
              onSaved={refresh}
            />
          ) : (
            <InboundFormModal
              open={formOpen}
              onClose={() => setFormOpen(false)}
              onSaved={refresh}
              mode={formMode}
              dbInbound={formDbInbound}
              dbInbounds={dbInbounds}
              availableNodes={nodesList}
              availableNodesFetched={nodesFetched}
            />
          )}
        </LazyMount>
"""
replace_once(inbounds_page, old_modal, new_modal)

# 3) Chinese copy: user-facing language says “node” instead of “inbound”.
zh_path = ROOT / "internal/web/translation/zh-CN.json"
zh = json.loads(zh_path.read_text(encoding="utf-8"))
try:
    zh["pages"]["inbounds"]["addInbound"] = "添加节点"
    if "inbounds" in zh["pages"] and "title" in zh["pages"]["inbounds"]:
        zh["pages"]["inbounds"]["title"] = "节点管理"
except Exception as exc:  # pragma: no cover - explicit patch guard
    raise SystemExit(f"translation patch guard failed: {exc}")
zh_path.write_text(json.dumps(zh, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# 4) Mark the derivative clearly without deleting upstream notices.
notice = ROOT / "MINIJET_SOURCE_NOTICE.md"
notice.write_text(
    "# MiniJet source notice\n\n"
    "This repository is a modified GPL-3.0 derivative of MHSanaei/3x-ui.\n"
    "MiniJet modifications were applied automatically from the tracked `minijet/` layer.\n"
    "The yonggekkk/x-ui-yg binary repository was analyzed as a reference only and is not copied here.\n",
    encoding="utf-8",
)

print("MiniJet patches applied successfully")
