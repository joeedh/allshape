#ifndef _STRUTILS_H
#define _STRUTILS_H

#include "memalloc.h"
#include "utils.h"

#define s_cat(s, b) (s=ST_concat(s, b, __FILE__, __LINE__))
#define s_cpy(s, b) (s=ST_cpy(s, b, __FILE__, __LINE__))
#define s_dup(s) ST_dup(s, __FILE__, __LINE__)
#define s_len(s) MAX(array_len(s)-1, 0)
#define s_free(s) (array_free(s), s=NULL);

#define MAX_DYN_STR (1024*1024*10)

char *ST_concat(char *dynstr, char *str, const char *file, unsigned int line);
char *ST_cpy(char *dynstr, char *str, const char *file, unsigned int line);
char *ST_dup(char *str, const char *file, unsigned int line);

static char s_endswith(char *str, char *str2) {
  int i, len=array_len(str), len2=strlen(str2);
  int j=0;

  if (len < len2 || len2 == 0 || len == 0) return 0;

  for (i=len-len2-1; i<len-1; i++) {
    if (str[i] != str2[j]) return 0;
    j++;
  }

  return 1;
}

#endif /*_STRUTILS_H*/