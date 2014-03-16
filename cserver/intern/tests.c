#include <stdio.h>
#include <stdarg.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#include "boilerplate.h"
#include "site_boilerplate.h"
#include "strutils.h"

int test_dir_print() {
  FI_PrintDir(stdout, "c:\\dev\\allshape");
}

int test_b64_codec() {
  char *teststr = "/a/b/c/d/e/f/g/[2012-1-1]";
  char *ret = b64encode(teststr);

  printf("%s\n", ret);
  printf("%s\n", b64decode(ret));

  ret = b64_path_encode(teststr);

  printf("%s\n", ret);
  printf("%s\n", b64_path_decode(ret, 1));
}

int test_pages_api() {
  DocPage page;

  PG_InitPage(&page, "/homepage", "Home", PAGE_TYPE_PAGE, "Test");
  PG_SavePage(&page);
  PG_PrintPageMeta();
}

int test_url_escaping() {
  char *test = "\t<a>\n\t<b>\n\t\t<c>\n";
  char *test2 = s_dup(test);
  char *test3;
  int len;

  len = strlen(test);
  printf("%s\n", test);

  array_resize(test2, len*3);
  RQ_EscapePath(test, test2, len*3, RQ_ESC_QUERY);
  printf("%s\n", test2);

  test3 = s_dup(test2);

  RQ_UnEscapePath(test2, test3, len*3, RQ_ESC_QUERY);

  printf("%s\n", test);
}

int main(int argc, char **argv) {
  //test_dir_print();
  //test_b64_codec();
  //test_pages_api();
  test_url_escaping();

  system("PAUSE");
  return 0;
}