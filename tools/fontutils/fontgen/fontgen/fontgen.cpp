// fontgen.cpp : Defines the entry point for the console application.
//

#include "stdafx.h"
#include "ft2build.h"
#include FT_FREETYPE_H

#include "png.h"

#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <math.h>
#include <time.h>

#define FONT_NAME "courier"

FT_Library freetype;

int glyph_range[2] = {0, 256};

#define MAX2(a, b) ((a) > (b) ? (a) : (b))
#define MIN2(a, b) ((a) < (b) ? (a) : (b))

int nearest_2(int i)
{
	return (int)pow(2, ceil(log((double)i) / log(2.0)));
}

int blit(unsigned char *src, int sw, int sh, unsigned char *dst, int x, int y, int dw, int dh)
{
	int i, j;

	for (j=0; j<sh; j++) {
		for (i=0; i<sw; i++) {
			dst[(j+y)*dw + (i+x)] = src[j*sw+i];
		}
	}

	return 0;
}


int write_img(const char *path, unsigned char *img, int w, int h, int channels)
{
	png_structp read_ptr;
    png_infop read_info_ptr, end_info_ptr;
    png_structp write_ptr;
    png_infop write_info_ptr;
    png_infop write_end_info_ptr;
    png_bytep row_buf;
    png_uint_32 y;
    png_uint_32 width=w, height=h;
	FILE *outfile;
	int i, color_type;

	outfile = fopen(path, "wb");
	if (!outfile) {
		printf("Could not open %s for writing.\n", path);
		return -1;
	}

	write_ptr =
      png_create_write_struct(PNG_LIBPNG_VER_STRING, NULL, NULL, NULL);
	write_info_ptr = png_create_info_struct(write_ptr);
    write_end_info_ptr = png_create_info_struct(write_ptr);

	png_init_io(write_ptr, outfile);

	if (channels == 1) color_type = PNG_COLOR_TYPE_GRAY;
	else if (channels == 3) color_type = PNG_COLOR_TYPE_RGB;
	else if (channels == 4) color_type = PNG_COLOR_TYPE_RGBA;
	else color_type = PNG_COLOR_TYPE_GRAY;

	png_set_IHDR(write_ptr, write_info_ptr, width, height, 8,
       color_type, PNG_INTERLACE_NONE,  PNG_COMPRESSION_TYPE_DEFAULT, PNG_FILTER_TYPE_DEFAULT);

	png_write_info(write_ptr, write_info_ptr);
	for (i=0; i<h; i++) {
		row_buf = img + w*i*channels;
		png_write_rows(write_ptr, &row_buf, 1);
	}
	png_set_interlace_handling(write_ptr);
	png_write_end(write_ptr, write_end_info_ptr);

	return 0;
}

int gen_font(float size) {
	FT_Init_FreeType(&freetype);
	FT_Face face;
	FT_Error error;
	FT_Bitmap b;
	int cw, ch, w, h, i, j, x, y, max_w=0, max_h=0, totglpyhs;
	float fw, fh;
	unsigned char *img;
  char buf[255];
	FILE *file;

	error = FT_New_Face(freetype, "..\\times.ttf", 0, &face);
	error = FT_Set_Char_Size(face, 0, size*64, 100, 100);

	printf("number of glyphs: %d\n", face->num_glyphs);

	totglpyhs = 0;
	for (i=glyph_range[0]; i < glyph_range[1]; i++) {
		int ci = FT_Get_Char_Index( face, i);	
		if (ci == 0) continue;
		
		error = FT_Load_Glyph(face, ci, FT_LOAD_DEFAULT);
		error = FT_Render_Glyph(face->glyph, FT_RENDER_MODE_NORMAL);

		b = face->glyph->bitmap;
		max_w = MAX2(b.width, max_w);
		max_h = MAX2(b.rows, max_h);
		totglpyhs++;
	}

	/*snap to nearest power of two, and yes, I know there's probably
	  simple bitwise arithmetic to do this*/
	cw = nearest_2(max_w);
	ch = nearest_2(max_h);

	printf("w: %d h: %d\n", cw, ch);
	printf("totglyphs: %d\n", totglpyhs);

	fw = (ceil(sqrt((double)totglpyhs))*(double)cw);
	w = nearest_2((int)fw);

	fh = (ceil(sqrt((double)totglpyhs))*(double)ch);
	h = nearest_2((int)fh);

	printf("w: %d h: %d\n", w, h);
	totglpyhs = 0;

	img = (unsigned char*)malloc(w*h);

  sprintf(buf, "fontgen%d.js", (int)size);
	file = fopen(buf, "w");

	fprintf(file, "var fontinfo%d = {s: [%d, %d], c: [%d, %d], g: {\n", (int)size, w, h, cw, ch);

	x = 0;
	y = 0;
	for (i=glyph_range[0]; i < glyph_range[1]; i++) {
		int ci = FT_Get_Char_Index( face, i);	
		if (ci == 0) continue;

		if (x >= w/cw) {
			y += 1;
			x = 0;
		}

		error = FT_Load_Glyph(face, ci, FT_LOAD_DEFAULT);
		error = FT_Render_Glyph(face->glyph, FT_RENDER_MODE_NORMAL);
		
		fprintf(file, "%d: {s: [%.3f, %.3f], b: [%.3f, %.3f], a: %.3f, c: [%d, %d], bs: [%d, %d]}", 
			   i,
			   (float)face->glyph->metrics.width/64.0f, 
			   (float)face->glyph->metrics.height/64.0f,
			   (float)face->glyph->metrics.horiBearingX/64.0f,
			   (float)face->glyph->metrics.horiBearingY/64.0f,
			   (float)face->glyph->metrics.horiAdvance/64.0f,
			   x*cw, y*ch, face->glyph->bitmap.width, face->glyph->bitmap.rows);

		if (i != glyph_range[1]-1)
			fprintf(file, ",");
		fprintf(file, "\n");

		b = face->glyph->bitmap;
		blit(b.buffer, b.width, b.rows, img, x*cw, y*ch, w, h);

		x++;
	}

  sprintf(buf, "fontgen%d.png", (int)size);
	write_img(buf, img, w, h, 1);

	fprintf(file, "}};\n");

	fclose(file);
	return 0;
}

static int sizes[] = {
  7,
  8,
  10,
  12,
  14,
  16,
};
int totsize = sizeof(sizes) / sizeof(*sizes);

int _tmain(int argc, _TCHAR* argv[])
{
  int i;
  FILE *file;

  for (i=0; i<totsize; i++) {
    printf("generating font size %d...\n", sizes[i]);
    gen_font(sizes[i]);
  }

  file = fopen("fontdata.js", "w");
  fprintf(file, "%s", "var fontdata = {sizes:[");
  for (i=0; i<totsize; i++) {
    if (i > 0) {
      fprintf(file, ",\n");
    } else {
      fprintf(file, "\n");
    }

    fprintf(file, "  [%d, \"fontgen%d.js\", \"fontgen%d.png\"]", sizes[i], sizes[i], sizes[i]);
  }

  fprintf(file, "\n]}\n");
  fclose(file);

	system("PAUSE");    
}

