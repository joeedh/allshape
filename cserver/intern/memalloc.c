#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "utils.h"

typedef struct MemHead {
  struct MemHead *next, *prev;
  int code1;
  int code2;
  
  int size, used, len, esize;
  char *file, *tag; int line;
} MemHead;

typedef struct MemTail {
  struct MemTail *next, *prev;
  int code1;
  int code2;
  
  int size, len, used, esize;
} MemTail;

#define H_MEMCODE1  2343243
#define H_MEMCODE2  9832324

#define T_MEMCODE1  2343121
#define T_MEMCODE2  9898642

#define FREECODE  654912

static List MemHeads;
static List MemTails;

#define GET_TAIL(mem) ((MemTail*)(((unsigned char*)(mem+1)) + mem->size))

void *_MEM_malloc(size_t size, char *tag, char *file, int line)
{
  MemHead *mem;
  MemTail *tail;
  
	if (size & 7) {
		size = size + 8 - (size & 7); //round up to nearest multiple of eight
	}

  mem = (MemHead*) malloc(size+sizeof(MemHead)+sizeof(MemTail));
  
  if (!mem) {
    return NULL;
  }
  
  tail = (MemTail*)(((unsigned char*)(mem+1)) + size);
  
  mem->code1 = H_MEMCODE1;
  mem->code2 = H_MEMCODE2;
  mem->size = size; mem->used = 0;
  mem->len = 0; mem->esize = 0;
  mem->esize = 0;
  mem->file = file;
  mem->tag = tag;
  mem->line = line;
  
  tail->code1 = T_MEMCODE1;
  tail->code2 = T_MEMCODE2;
  tail->size = size;  tail->len = 0; 
  tail->used = 0; tail->esize = 0;
  
  List_Append(&MemHeads, mem);
  List_Append(&MemTails, tail);
  
  return mem+1;
}

void *_MEM_calloc(size_t size, char *tag, char *file, int line)
{
  char *mem = (char*) _MEM_malloc(size, tag, file, line), *c=mem;
  size_t i;
  
  for (i=0; i<size; i++, c++) {
    *c = 0;    
  }
  
  return mem;
}

int _MEM_check(void *vmem, char *file, int line)
{
  MemHead *mem = (MemHead*) vmem;
  MemTail *tail;
  
  if (!vmem) return 0;
  
  mem = (MemHead*) vmem; mem--;
  
  if (mem->code1 != H_MEMCODE1) return 0;
  if (mem->code2 != H_MEMCODE2) return 0;
  
  tail = GET_TAIL(mem);
  if (tail->code1 != T_MEMCODE1) return 0;
  if (tail->code2 != T_MEMCODE2) return 0;
  
  return 1;
}

int _MEM_size(void *vmem, char *file, int line)
{
  MemHead *mem = (MemHead*)vmem;
  MemTail *tail;
  
  if (!vmem) {
    fprintf(stderr, "Warning: tried to free NULL pointer!\n");
    fprintf(stderr, "  at line %d: file: %s\n", line, file); 
    return 0;
  }
  
  mem--;
  
  if (mem->code1 == FREECODE) {
    fprintf(stderr, "MEM_size: Error: Double free!\n");
    fprintf(stderr, "  at line %d: file: %s\n", line, file); 
    return 0;
  }
  
  if (!_MEM_check(vmem, file, line)) {
    tail = GET_TAIL(mem);

    fprintf(stderr, "MEM_size: Error: Corrupted memory block %p!\n", vmem);
    fprintf(stderr, "  at line %d: file: %s\n", line, file); 
   //fprintf(stderr, "[h1=%s, h2=%s, t1=%s, t2=%s] ", mem->code1, mem->code2, tail->code1, tail->code2);
    return 0;
  }

  return mem->size;
}

void _MEM_free(void *vmem, char *file, int line) 
{
  MemHead *mem = (MemHead*)vmem;
  MemTail *tail;
  
  if (!vmem) {
    fprintf(stderr, "Warning: tried to free NULL pointer!\n");
    fprintf(stderr, "  at line %d: file: %s\n", line, file); 
    return;
  }
  
  mem--;
  
  if (mem->code1 == FREECODE) {
    fprintf(stderr, "Error: Double free!\n");
    fprintf(stderr, "  at line %d: file: %s\n", line, file); 
    return;
  }
  
  if (!_MEM_check(vmem, file, line)) {
    tail = GET_TAIL(mem);

    fprintf(stderr, "MEM_free: Error: Corrupted memory block %p!\n", vmem);
    fprintf(stderr, "  at line %d: file: %s\n", line, file); 
    //fprintf(stderr, "[h1=%s, h2=%s, t1=%s, t2=%s] ", mem->code1, mem->code2, tail->code1, tail->code2);
    return;
  }
  
  tail = GET_TAIL(mem);
  
  List_Remove(&MemHeads, mem);
  List_Remove(&MemTails, tail);
  
  mem->code1 = mem->code2 = FREECODE;
  tail->code1 = tail->code2 = FREECODE;
  
  free(mem);
}

const char *memprint_truncate(const char *path)
{
	int i = strlen(path)-2;

	while (i >= 0 && (path[i] == '/' || path[i] == '\\')) i--;

	while (i > 0) {
		if (path[i] == '/' || path[i] == '\\')
			break;
		i--;
	}

	if (i > 0) i++;

	return path+i;
}

void MEM_PrintMemBlocks(FILE *file)
{
  MemHead *mem;
  
  if (MemHeads.first == NULL) {
    return;
  }
  
  fprintf(file, "=====Allocated Memory Blocks:======\n");
  for (mem=(MemHead*)MemHeads.first; mem; mem=mem->next) {
    MemTail *tail = GET_TAIL(mem);
    if (!_MEM_check(mem+1, __FILE__, __LINE__)) {
      fprintf(file, "[corrupted, h1=%s, h2=%s, t1=%s, t2=%s] ", mem->code1, mem->code2, tail->code1, tail->code2);
    }

    fprintf(file, "%s:%d: size: %d\n", memprint_truncate(mem->file), 
			      mem->line, mem->size);
  }
}

void *_Array_New(size_t esize, size_t length, char *file, int line)
{
  MemHead *mem;
  MemTail *tail;
  int size;
  
  if (length == 0) return NULL;
  
  size = length*esize;
  size = size == 0 ? esize*4 : size;

  mem = (MemHead*)_MEM_calloc(size, "array", file, line);
  mem--;
  mem->used = length*esize;
  mem->esize = esize;
  
  tail = GET_TAIL(mem);
  tail->used = length*esize;
  tail->esize = esize;
  
  return mem+1;
}

void *_Array_Realloc(void *vmem, size_t newlength, char *file, int line)
{
  MemHead *mem = (MemHead*)vmem, *mem2;
  MemTail *tail;
  mem--;
  
  mem2 = (MemHead*)_Array_New(mem->esize, newlength, file, line);
  
  memcpy(mem2, mem+1, mem->size);
  mem2--;
  
  mem2->used = mem->used;
  tail = GET_TAIL(mem2);
  tail->used = mem->used;
  
  _MEM_free(mem+1, file, line);
  return mem2+1;
}

void *_Array_GrowOne(void *vmem, int esize, char *file, int line)
{
  MemHead *mem = (MemHead*)vmem;
  MemTail *tail;
  
	mem--;

  if (vmem == NULL) {
    mem = (MemHead*)_Array_New(esize, esize*2, file, line);
    mem--;
    mem->used = 0;
  }
  
  if (mem->size - mem->used < mem->esize) {
    mem = (MemHead*)_Array_Realloc(mem+1, mem->size*2, file, line);
    mem--;
  }
  
  mem->used += mem->esize;
  
  tail = GET_TAIL(mem);
  tail->used = mem->used;

	return mem+1;
}

void *_Array_Append(void *vmem, void *item, int esize, char *file, int line)
{
  MemHead *mem = (MemHead*)vmem;
  MemTail *tail;
  
	mem--;

  if (vmem == NULL) {
    mem = (MemHead*)_Array_New(esize, esize*2, file, line);
    mem--;
    mem->used = 0;
  }
  
  if (mem->size - mem->used < mem->esize) {
    mem = (MemHead*)_Array_Realloc(mem+1, mem->size*2, file, line);
    mem--;
  }
  
  memcpy(((unsigned char*)(mem+1))+mem->used, item, mem->esize);
  mem->used += mem->esize;
  
  tail = GET_TAIL(mem);
  tail->used = mem->used;

	return mem+1;
}

void *_Array_Pop(void *vmem, char *file, int line)
{
  MemHead *mem = (MemHead*)vmem;
  MemTail *tail;
  
  mem--;
  if (mem->used < mem->esize) {
    fprintf(stderr, "Invalid call to Array_Pop\n");
    return;
  }
  
  mem->used -= mem->esize;
  tail = GET_TAIL(mem);
  tail->used = mem->used;

  return (void*)(((unsigned char)(mem+1)) + mem->esize*mem->used);
}

//does not change size unless necassary; if you wish to force
//a change in the allocation size, use realloc
void *_Array_Resize(void *vmem, int newlen, int esize, char *file, int line)
{
  MemHead *mem = (MemHead*)vmem;
  MemTail *tail;
  mem--;
  
  if (vmem == NULL) {
    return _Array_New(esize, newlen, file, line);
  }
  
  if (mem->used + newlen*mem->esize >= mem->size) {
    //double buffer
    mem = (MemHead*)_Array_Realloc(mem+1, newlen*2, file, line);
    mem--;
  }
  
  mem->used = newlen*mem->esize;
    
  tail = GET_TAIL(mem);
  tail->used = mem->used;
    
  return mem+1;
}

int _Array_Len(void *vmem, char *file, int line)
{
  MemHead *mem = (MemHead*)vmem;
  
  if (!vmem) return 0;
  mem--;
  
	if (mem->esize != 0)
		return mem->used / mem->esize;
	else 
		return mem->used;
}