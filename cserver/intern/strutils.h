#ifndef _STRUTILS_H
#define _STRUTILS_H

#include "memalloc.h"
#include "utils.h"
#include <string.h>
#include <stdlib.h>
#include <ctype.h>

#define s_cat(s, b) (s=ST_concat(s, b, __FILE__, __LINE__))
#define s_cpy(s, b) (s=ST_cpy(s, b, __FILE__, __LINE__))
#define s_dup(s) ST_dup(s, __FILE__, __LINE__)
#define s_len(s) MAX(array_len(s)-1, 0)
#define s_free(s) (array_free(s), s=NULL);
#define s_resize(s, n) (array_resize(s, n+1), (s[n]=0), (s))

#define MAX_B64_STR (1024*1024*2)
#define MAX_DYN_STR (1024*1024*10)

//MIME b64 encoding
char *b64encode(char *str);
char *b64decode(char *input);

//a tweaked file path-friendly b64 encoding
char *b64_path_encode(char *str);
char *b64_path_decode(char *input, int allow_bad_chars);

static int s_endswith(char *str, char *str2) {
  int i, len=array_len(str), len2=strlen(str2);
  int j=0;

  if (len < len2 || len2 == 0 || len == 0) return 0;

  for (i=len-len2-1; i<len-1; i++) {
    if (str[i] != str2[j]) return 0;
    j++;
  }

  return 1;
}

static int s_find(char *s1, char *s2) {
  int thislen = s_len(s1);
  int len = strlen(s2);
  int i, j, ilen=thislen-len+1, jlen;
  char *c1=s1, *c2=s2, *c3;
  
  if (!(s1 && s2 && thislen && len)) return -1;

  for (i=0; i<ilen; i++, c1++) {
    int match = 1;

    jlen = i+len;
    c2 = s2;
    c3 = s1+i;

    for (j=i; j<jlen; j++, c2++, c3++) {
        if (*c2 != *c3) {
          match = 0;
          break;
        }
    }

    if (match) 
      return i;
  }

  return -1;
}

#ifdef WIN32
static char *strnstr(const char *s1, const char *s2, int n) {
  int thislen = n;
  int len = strlen(s2);
  int i, j, ilen=thislen-len, jlen;
  char *c1=(char*)s1, *c2=(char*)s2, *c3;

  if (!(s1 && s2 && thislen && len && (len <= thislen))) return NULL;

  for (i=0; i<ilen; i++, c1++) {
    int match = 1;

    jlen = i+len;
    c3 = (char*)c1;
    c2 = (char*)s2;

    for (j=i; j<jlen; j++, c2++, c3++) {
        if (*c2 != *c3) {
          match = 0;
          break;
        }
    }

    if (match) 
      return s1+i;
  }

  return NULL;
}

//case-insensitive strncmp.  can handle the case
//of null-terminated strings whose actual length is less
//then MIN(n1, n2).
static int strcncmp(char *s1, char *s2, int n1, int n2)
{
  int i, val, len, notest=0;

  len = MIN(n1, n2);
  for (i=0; i<len; i++) {
    char c1, c2;

    if (!s1[i]) {
      n1 = i;
      notest = 1;
    }
    if (!s2[i]) {
      n2 = i;
      notest = 1;
    }

    if (notest) 
      continue;
   
    c1 = tolower(s1[i]);
    c2 = tolower(s2[i]);

    if (c1 > c2) {
      return 1;
    } else if (c1 < c2) {
      return -1;
    }
  }

  n1 = strnlen(s1, n1);
  n2 = strnlen(s2, n2);

  if (n1 > n2) return 1;
  else if (n1 < n2) return -1;
  else return 0;
}


char *ST_concat(char *dynstr, char *str, const char *file, unsigned int line);
char *ST_cpy(char *dynstr, char *str, const char *file, unsigned int line);
char *ST_dup(char *str, const char *file, unsigned int line);

#endif
#endif /*_STRUTILS_H*/