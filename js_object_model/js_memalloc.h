#include "stdint.h"
#include "stdio.h"

void MEM_PrintMemBlocks(FILE *file);

#define MEM_malloc(size) _MEM_malloc(size, __FILE__, __LINE__)
#define MEM_calloc(size) _MEM_calloc(size, __FILE__, __LINE__)
#define MEM_check(mem) _MEM_check(mem, __FILE__, __LINE__)
#define MEM_free(mem) _MEM_free(mem, __FILE__, __LINE__)
#define MEM_ElementMalloc(size) _MEM_ElementMalloc(size, __FILE__, __LINE__)
#define MEM_ElementCalloc(size) _MEM_ElementCalloc(size, __FILE__, __LINE__)
#define MEM_ElementFree(size, mem) _MEM_ElementFree(size, mem, __FILE__, __LINE__)
#define ELEMENT_SIZE_LIMIT	4092

//#pragma warning(disable : 
#define array_append(arr, item) (arr=_Array_Append(arr, &item, sizeof(*arr), __FILE__, __LINE__))
#define array_resize(arr, newlen) (arr=_Array_Resize(arr, newlen, sizeof(*arr), __FILE__, __LINE__))
#define array_pop(arr) (_Array_Pop(arr, __FILE__, __LINE__))
#define array_len(arr) (_Array_Len(arr, __FILE__, __LINE__))
#define array_free(arr) _MEM_free(arr, __FILE__, __LINE__)
#define array_reset(arr) array_resize(arr, 0, sizeof(*arr), __FILE__, __LINE__)

void *_MEM_malloc(size_t size, char *file, int line);
void *_MEM_calloc(size_t size, char *file, int line);
int _MEM_check(void *vmem, char *file, int line);
void *_MEM_free(void *vmem, char *file, int line) ;
void *_MEM_ElementMalloc(size_t size, char *file, int line);
void *_MEM_ElementCalloc(size_t size, char *file, int line);
void _MEM_ElementFree(size_t size, void *mem, char *file, int line);

void *_Array_Realloc(void *vmem, size_t newlength, char *file, int line);
void *_Array_Append(void *vmem, void *item, int esize, char *file, int line);
void *_Array_Pop(void *vmem, char *file, int line);
int _Array_Len(void *vmem, char *file, int line);
//does not change size unless necassary; if you wish to force
//a change in the allocation size, use realloc
void *_Array_Resize(void *vmem, int newlen, int esize, char *file, int line);
