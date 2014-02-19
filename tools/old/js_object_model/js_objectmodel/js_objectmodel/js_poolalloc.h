#include <stdint.h>

typedef struct PoolChunk {
	int totused;
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

