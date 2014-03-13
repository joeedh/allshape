import glob

cs_targets = {
  "main" : glob.glob("intern/*.c") +
           glob.glob("intern/*.h") +
  [
    "tst.ccs",
  ]
}
