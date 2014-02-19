#include "js_hashtable.h"
#include "js_memalloc.h"
#include "js_obj_model.h"
#include "js_poolalloc.h"
#include "js_utils.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <stdint.h>
#include <float.h>


int main(int argc, char **argv) 
{
	char *mem = MEM_calloc(32);
	PoolAlloc *pool;

	strcpy(mem, "Hi!");
	printf("%s\n", mem);

	MEM_free(mem);
	pool = Pool_new(32, 32);

	mem = Pool_malloc(pool);
	strcpy(mem, "Hi!");
	printf("%s\n", mem);
	
	Pool_destroy(pool);
	MEM_PrintMemBlocks(stdout);
	system("PAUSE");
}