#include "memalloc.h"
#include "utils.h"
#include "poolalloc.h"

#include <stdint.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

static PoolAlloc **pool_allocators = NULL;

PoolAlloc *_Pool_new(int esize, int csize, char *file, int line)
{
	PoolAlloc *alloc = (PoolAlloc*) MEM_calloc(sizeof(PoolAlloc), "pool");
	PoolChunk *chunk = (PoolChunk*) MEM_malloc(sizeof(PoolChunk) + esize*csize, "pool");
	_FreeElement *freel;
	char *ptr;
	int i;

	alloc->esize = esize;
	alloc->csize = csize;
	
	array_append(alloc->chunks, chunk);

	ptr = (char*)(chunk+1);

	for (i=0; i<csize; i++, ptr += esize) {
		freel = (_FreeElement*) ptr;
		freel->next = alloc->freelist;
		alloc->freelist = freel;
	}

	return alloc;
}

void *_Pool_malloc(PoolAlloc *pool, char *file, int line)
{
	void *ret;

	if (!pool->freelist) {
		PoolChunk *chunk;
		_FreeElement *freel;
		char *ptr;
		int i;

		chunk = (PoolChunk*) MEM_malloc(sizeof(PoolChunk) + pool->esize*pool->csize, "PoolChunk");
		array_append(pool->chunks, chunk);

		ptr = (char*)(chunk+1);

		for (i=0; i<pool->csize; i++, ptr += pool->esize) {
			freel = (_FreeElement*) ptr;
			freel->next = pool->freelist;
			pool->freelist = freel;
		}
	}

	ret = pool->freelist;
	pool->freelist = pool->freelist->next;

	return ret;
}

void *_Pool_calloc(PoolAlloc *pool, char *file, int line)
{
	void *ret = _Pool_malloc(pool, file, line);
	int i;
	char *c = (char*)ret;

	for (i=0; i<pool->esize; i++, c++)
		*c = 0;

	return ret;
}

void _Pool_free(PoolAlloc *alloc, void *mem, char *file, int line)
{
	_FreeElement *freel;

	if (!mem) {
		fprintf(stderr, "Warning: Null pointer passed to _Pool_Free\n");
		return;
	}

	freel = (_FreeElement*) mem;
	freel->next = alloc->freelist;
	alloc->freelist = freel;
}

void _Pool_destroy(PoolAlloc *alloc, char *file, int line)
{
	int i, clen;

	clen = array_len(alloc->chunks);
	for (i=0; i<clen; i++) {
		_MEM_free(alloc->chunks[i], file, line);
	}

	array_free(alloc->chunks);
	_MEM_free(alloc, file, line);
}

void *_MEM_ElementMalloc(size_t size, char *file, int line)
{
	if (array_len(pool_allocators) <= size) {
		array_resize(pool_allocators, size);
	}

	if (!pool_allocators[size]) {
		pool_allocators[size] = _Pool_new(size, DEFAULT_POOL_CHUNKSIZE, file, line);
	}

	return _Pool_malloc(pool_allocators[size], file, line);
}

void *_MEM_ElementCalloc(size_t size, char *file, int line)
{
	void *ret = _MEM_ElementMalloc(size, file, line);
	char *ptr = (char*)ret;
	size_t i;

	for (i=0; i<size; i++, ptr++)
		*ptr = 0;

	return ret;
}

void _MEM_ElementFree(size_t size, void *mem, char *file, int line)
{
	if (!mem) {
		fprintf(stderr, "Warning: NULL pointer passed to _MEM_ElementFree\n");
		return;
	}
	
	_Pool_free(pool_allocators[size], mem, file, line);
}