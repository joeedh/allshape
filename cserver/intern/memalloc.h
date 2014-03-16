#ifndef _MEMALLOC_H
#define _MEMALLOC_H

#include "stdint.h"
#include "stdio.h"

void MEM_PrintMemBlocks(FILE *file);

#define MEM_malloc(size, tag) _MEM_malloc(size, tag, __FILE__, __LINE__)
#define MEM_calloc(size, tag) _MEM_calloc(size, tag, __FILE__, __LINE__)
#define MEM_check(mem) _MEM_check(mem, __FILE__, __LINE__)
#define MEM_free(mem) _MEM_free(mem, __FILE__, __LINE__)
#define MEM_ElementMalloc(size) _MEM_ElementMalloc(size, __FILE__, __LINE__)
#define MEM_ElementCalloc(size) _MEM_ElementCalloc(size, __FILE__, __LINE__)
#define MEM_ElementFree(size, mem) _MEM_ElementFree(size, mem, __FILE__, __LINE__)
#define MEM_size(mem) _MEM_size(mem, __FILE__, __LINE__)

#define ELEMENT_SIZE_LIMIT	4092

//#pragma warning(disable : 
#define array_append(arr, item) \
  (arr=_Array_GrowOne(arr, sizeof(*arr), __FILE__, __LINE__),\
  (arr[array_len(arr)-1] = item),\
  arr)

#define array_growone(arr, item) \
  (arr=_Array_GrowOne(arr, sizeof(*arr), __FILE__, __LINE__),\
  (arr+array_len(arr)-1))

#define array_resize(arr, newlen) (arr=_Array_Resize(arr, newlen, sizeof(*arr), __FILE__, __LINE__))
#define array_pop(arr) (_Array_Pop(arr, __FILE__, __LINE__))
#define array_len(arr) ((arr) ? _Array_Len(arr, __FILE__, __LINE__) : 0)
#define array_catn(arr1, arr2, len) (arr1=_Array_CatN(arr1, arr2, len, sizeof(*arr1), __FILE__, __LINE__))
#define array_pop(arr) (_Array_Pop(arr, __FILE__, __LINE__))
#define array_reset(arr) (arr) ? array_resize(arr, 0, sizeof(*arr), __FILE__, __LINE__) : NULL
#define array_free(arr) (arr ? _MEM_free(arr, __FILE__, __LINE__) : NULL)

//XXX untested!
#define array_dup(arr) ((arr) ? _Array_Dup(arr, __FILE__, __LINE__) : NULL)

//ndup doesn't require an array allocated type, like dup does.
//it does return an array-allocated array, though.
#define array_ndup(arr, n) ((arr) ? _Array_nDup(arr, sizeof(*arr), n, __FILE__, __LINE__) : NULL)

void *_MEM_malloc(size_t size, char *tag, char *file, int line);
void *_MEM_calloc(size_t size, char *tag, char *file, int line);
int _MEM_check(void *vmem, char *file, int line);
void *_MEM_free(void *vmem, char *file, int line);
void *_MEM_ElementMalloc(size_t size, char *file, int line);
void *_MEM_ElementCalloc(size_t size, char *file, int line);
void _MEM_ElementFree(size_t size, void *mem, char *file, int line);
int _MEM_size(void *vmem, char *file, int line);

void *_Array_Dup(void *vemem, char *file, int line);
//ndup doesn't require an array allocated type, like dup does
void *_Array_nDup(void *vemem, int esize, int n, char *file, int line);
void *_Array_Realloc(void *vmem, size_t newlength, char *file, int line);
void *_Array_Append(void *vmem, void *item, int esize, char *file, int line);
void *_Array_GrowOne(void *vmem, int esize, char *file, int line);
void *_Array_Pop(void *vmem, char *file, int line);
void *_Array_CatN(void *arr1, void *arr2, int len, int esize, char *file, int line);
int _Array_Len(void *vmem, char *file, int line);
//does not change size unless necassary; if you wish to force
//a change in the allocation size, use realloc
void *_Array_Resize(void *vmem, int newlen, int esize, char *file, int line);
#endif /*_MEMALLOC_H*/
