#include <stdint.h>

typedef struct PoolChunk {
	int totused;
	int pad;
} PoolChunk;

typedef struct _FreeElement {
	void *next;
} _FreeElement;

typedef struct PoolAlloc {
	int esize, csize;
	int totchunk;
	PoolChunk **chunks;
	_FreeElement *freelist;
} PoolAlloc;

#define Pool_new(esize, csize) _Pool_new(esize, csize, __FILE__, __LINE__)
#define Pool_malloc(pool) _Pool_malloc(pool, __FILE__, __LINE__)
#define Pool_calloc(pool) _Pool_calloc(pool, __FILE__, __LINE__)
#define Pool_free(alloc, mem) _Pool_free(alloc, mem, __FILE__, __LINE__)
#define Pool_destroy(alloc) _Pool_destroy(alloc, __FILE__, __LINE__)

#define DEFAULT_POOL_CHUNKSIZE 2048

PoolAlloc *_Pool_new(int esize, int csize, char *file, int line);
void *_Pool_malloc(PoolAlloc *pool, char *file, int line);
void *_Pool_calloc(PoolAlloc *pool, char *file, int line);
void _Pool_free(PoolAlloc *alloc, void *mem, char *file, int line);
void _Pool_destroy(PoolAlloc *alloc, char *file, int line);