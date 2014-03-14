#include "memalloc.h"
#include "strutils.h"

#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <math.h>

char *_check_dynstr(char *dynstr, const char *file, unsigned int line) {
  char c = 0;

  if (dynstr == NULL) 
    (dynstr=_Array_Append(dynstr, &c, sizeof(*dynstr), file, line));

  if (array_len(dynstr) == 0)
    (dynstr=_Array_Append(dynstr, &c, sizeof(*dynstr), file, line));

  return dynstr;
}

char *ST_concat(char *dynstr, char *str, const char *file, unsigned int line) {
  int len = strlen(str);
  int thislen = s_len(dynstr);

  dynstr = _check_dynstr(dynstr, file, line);

  (dynstr=_Array_Resize(dynstr, thislen+len+1, sizeof(*dynstr), file, line));
  strcat(dynstr, str);

  return dynstr;
}

char *ST_cpy(char *dynstr, char *str, const char *file, unsigned int line) {
  int len = strlen(str);

  dynstr = _check_dynstr(dynstr, file, line);
  (dynstr=_Array_Resize(dynstr, len+1, sizeof(*dynstr), file, line));

  strcpy(dynstr, str);
  dynstr[len] = 0;

  return dynstr;
}

char *ST_dup(char *str, const char *file, unsigned int line) {
  char *s = NULL;
  int len;

  if (str == NULL) return NULL;
  len = CLAMP(strlen(str), 0, MAX_DYN_STR);

  (s=_Array_Resize(s, len+1, sizeof(*s), file, line));

  strcpy(s, str);
  s[len] = 0;

  return s;
}
