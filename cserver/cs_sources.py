import glob

cs_targets = {
  "pages.c" : glob.glob("intern/*.c") +
           glob.glob("intern/*.h") +
  [
    "site/getpage.ccs",
    "site/admin/editor.ccs",
    "site/admin/editor_api.ccs",
    "site/admin/admin.ccs",
    "site/admin/main.ccs",
    "site/admin/pages.ccs",
    "site/index.ccs",
    "site/header.ccs",
    "site/footer.ccs",
    "site_config.h"
  ]
}
