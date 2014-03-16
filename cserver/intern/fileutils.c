#include <stdio.h>
#include <stdarg.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#include "boilerplate.h"
#include "fileutils.h"

#define ERR_MSG_LIMIT 512
char *GetLastErrorMsg() {
  char *s = NULL;
  int id;
  DWORD err = GetLastError();
  LPVOID lpMsgBuf;

  FormatMessage(FORMAT_MESSAGE_ALLOCATE_BUFFER|
                FORMAT_MESSAGE_FROM_SYSTEM, NULL, err, 
                MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT), &lpMsgBuf, 0, NULL);

  s = s_dup((char*)lpMsgBuf);
  LocalFree(lpMsgBuf);

  return s;
}

static void _fi_diriternext(DirIter *iter) {
  __int64 mt, at;
  
  memset(&iter->ret, 0, sizeof(iter->ret));

  if (iter->handle == INVALID_HANDLE_VALUE) {
    iter->done = 1;
    return;
  }
  
  if (!FindNextFile(iter->handle, &iter->ret)) {
    int err = GetLastError();
    if (err != ERROR_NO_MORE_FILES) {
      char *s = GetLastErrorMsg();
      printf("Error in directory iterator: %s\n", s);
      s_free(s);
    }

    if (!FindClose(iter->handle)) {
      char *s = GetLastErrorMsg();
      printf("Error in directory iterator: %s\n", s);
      s_free(s);
    }

    iter->handle = INVALID_HANDLE_VALUE;
    iter->done = 1;
    return;
  }

  //apparently, the FILETIME structure is not necassarily 
  //aligned at the 8 byte boundary.  idiots.
  //so, we manually copy  the data in variables which
  //are.
  memcpy(&mt, &iter->ret.ftLastWriteTime, sizeof(mt));
  memcpy(&at, &iter->ret.ftLastAccessTime, sizeof(at));

  strncpy(iter->name, iter->ret.cFileName, MAX_PATH);
  iter->name[MAX_PATH-1] = 0;
  iter->modifiedtime = mt;
  iter->accesstime = at;

  if (!strcmp(iter->name, ".") || !strcmp(iter->name, ".."))
    _fi_diriternext(iter);
  

  if ((iter->filter & FI_EXCL_DIRS) && (iter->ret.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY)) {
    _fi_diriternext(iter);
  }

  if ((iter->filter & FI_EXCL_FILES) && !(iter->ret.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY)) {
    _fi_diriternext(iter);
  }
}

void FI_DirIter(DirIter *iter, char *path, int filter) {
  char path2[MAX_PATH];
  char *ast = "*";
  int len;

  memset(iter, 0, sizeof(*iter));
  iter->next = _fi_diriternext;
  iter->filter = filter;

  strncpy(path2, path, sizeof(path2)-4);
  path2[sizeof(path2)-4] = 0;

  len = strnlen(path, sizeof(path2)-1);
  if (path2[len-1] != '\\' && path2[len-1] != '/')
    strcat(path2, "\\");
  strcat(path2, "*");
  
  iter->handle = FindFirstFileEx(path2, FindExInfoStandard, &iter->ret, 0, NULL, 2);

  if (iter->handle == INVALID_HANDLE_VALUE) {
    char *msg = GetLastErrorMsg();
    fprintf(stderr, "Error searching directory %s: %s\n", path2, msg);
    s_free(msg);
    iter->done = 1;
  } else {
    uint64 mt, at;

    //apparently, the FILETIME structure is not necassarily 
    //aligned at the 8 byte boundary.  idiots.
    //so, we manually copy  the data in variables which
    //are.
    memcpy(&mt, &iter->ret.ftLastWriteTime, sizeof(mt));
    memcpy(&at, &iter->ret.ftLastAccessTime, sizeof(at));

    strncpy(iter->name, iter->ret.cFileName, MAX_PATH);
    iter->name[MAX_PATH-1] = 0;
    iter->modifiedtime = mt;
    iter->accesstime = at;

    if (!strcmp(iter->name, ".") || !strcmp(iter->name, ".."))
      _fi_diriternext(iter);
  

    if ((iter->filter & FI_EXCL_DIRS) || (iter->ret.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY)) {
      _fi_diriternext(iter);
    }
  }
}

void FI_PrintDir(FILE *file, char *path) {
  DirIter iter;

  if (file == NULL) file = stdout;

  for (FI_DirIter(&iter, path, FI_EXCL_DIRS); !iter.done; iter.next(&iter)) {
    fprintf(file, "%s\n", iter.name);
  }
}
