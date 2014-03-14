import glob

cs_targets = {
  "pages.c" : glob.glob("intern/*.c") +
           glob.glob("intern/*.h") +
  [
    "tst.ccs",
  ]
}
