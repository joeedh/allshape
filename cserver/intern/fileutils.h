#ifndef FILEUTILS_H
#define FILEUTILS_H

#ifdef WIN32
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>

#include "memalloc.h"
#include "utils.h"
#include "strutils.h"
#include "types.h"

typedef struct DirIter {
  void (*next)(struct DirIter *self);
  char name[MAX_PATH];
  uint64 accesstime, modifiedtime;
  int done;

  /*private data*/
  WIN32_FIND_DATA ret;
  int filter;
  HANDLE handle;
} DirIter;

#else
#include "utils.h"
#include "strutils.h"
#include "types.h"

typedef struct DirIter {
  void (*next)(DirIter *self);
  char name[MAX_PATH];
  uint64 accesstime, modifiedtime;
  int done;

  /*private data*/
  ...
} DirIter;

#endif

#define FI_EXCL_FILES        1
#define FI_EXCL_DIRS         2

void FI_DirIter(DirIter *iter, char *path, int filter);
void FI_PrintDir(FILE *file, char *path);
 
#endif /* FILEUTILS_H */
  