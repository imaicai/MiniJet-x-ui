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


# MiniJet UI overrides. The ordinary panel contains only the dashboard,
# node list, two-field add/edit form and essential node actions.
copy("MiniJetQuickInboundModal.tsx", "frontend/src/pages/inbounds/MiniJetQuickInboundModal.tsx")
copy("InboundList.tsx", "frontend/src/pages/inbounds/list/InboundList.tsx")
copy("RowActions.tsx", "frontend/src/pages/inbounds/list/RowActions.tsx")
copy("useInboundColumns.tsx", "frontend/src/pages/inbounds/list/useInboundColumns.tsx")
copy("AppSidebar.tsx", "frontend/src/layouts/AppSidebar.tsx")
copy("IndexPage.tsx", "frontend/src/pages/index/IndexPage.tsx")
copy("routes.tsx", "frontend/src/routes.tsx")
copy("minijet.css", "frontend/src/styles/minijet.css")

main_tsx = ROOT / "frontend/src/main.tsx"
replace_once(
    main_tsx,
    "import '@/styles/page-cards.css';\n",
    "import '@/styles/page-cards.css';\nimport '@/styles/minijet.css';\n",
)

# The command palette exposes advanced pages, so it is removed entirely from
# the ordinary MiniJet shell.
panel_layout = ROOT / "frontend/src/layouts/PanelLayout.tsx"
replace_once(panel_layout, "import CommandPalette from '@/components/command-palette/CommandPalette';\n", "")
replace_once(
    panel_layout,
    """  return (
    <>
      <Outlet />
      <CommandPalette />
    </>
  );
""",
    "  return <Outlet />;\n",
)

# Both ADD and EDIT use the same two-field MiniJet form. Existing node internals
# are preserved automatically during edit; users only change name and port.
inbounds_page = ROOT / "frontend/src/pages/inbounds/InboundsPage.tsx"
replace_once(
    inbounds_page,
    "const InboundFormModal = lazy(() => import('./form/InboundFormModal'));\n",
    "const MiniJetQuickInboundModal = lazy(() => import('./MiniJetQuickInboundModal'));\n",
)
replace_once(
    inbounds_page,
    "  const { nodes: nodesList, fetched: nodesFetched } = useNodesQuery();\n",
    "  const { nodes: nodesList } = useNodesQuery();\n",
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
          <MiniJetQuickInboundModal
            open={formOpen}
            onClose={() => setFormOpen(false)}
            onSaved={refresh}
            mode={formMode}
            dbInbound={formDbInbound}
          />
        </LazyMount>
"""
replace_once(inbounds_page, old_modal, new_modal)

# User-facing wording uses “node” instead of upstream “inbound”.
zh_path = ROOT / "internal/web/translation/zh-CN.json"
zh = json.loads(zh_path.read_text(encoding="utf-8"))
try:
    zh["menu"]["inbounds"] = "节点"
    zh["pages"]["inbounds"]["addInbound"] = "添加节点"
    if "title" in zh["pages"]["inbounds"]:
        zh["pages"]["inbounds"]["title"] = "节点"
except Exception as exc:  # pragma: no cover
    raise SystemExit(f"translation patch guard failed: {exc}")
zh_path.write_text(json.dumps(zh, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

en_path = ROOT / "internal/web/translation/en-US.json"
if en_path.exists():
    en = json.loads(en_path.read_text(encoding="utf-8"))
    try:
        en["menu"]["inbounds"] = "Nodes"
        en["pages"]["inbounds"]["addInbound"] = "Add Node"
        if "title" in en["pages"]["inbounds"]:
            en["pages"]["inbounds"]["title"] = "Nodes"
    except Exception as exc:  # pragma: no cover
        raise SystemExit(f"English translation patch guard failed: {exc}")
    en_path.write_text(json.dumps(en, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

notice = ROOT / "MINIJET_SOURCE_NOTICE.md"
notice.write_text(
    "# MiniJet source notice\n\n"
    "This repository is a modified GPL-3.0 derivative of MHSanaei/3x-ui.\n"
    "MiniJet modifications are applied automatically from the tracked `minijet/` layer.\n"
    "The yonggekkk/x-ui-yg binary repository is used as a behavior reference only and is not copied here.\n",
    encoding="utf-8",
)

print("MiniJet patches applied successfully")
