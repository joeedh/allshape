#include "png.h"
#include "freetype2.h"

typedef struct Image {
  int sizex, sizey;
  char *buf;
} Image;

typedef struct KernTable {
  float (*table)[2];
  int sizex, sizey;
}


