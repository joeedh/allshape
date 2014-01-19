#include "png.h"
#include <math.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <float.h>

#ifdef _WIN32_WCE
#  if _WIN32_WCE < 211
     __error__ (f|w)printf functions are not supported on old WindowsCE.;
#  endif
#  include <windows.h>
#  include <stdlib.h>
#  define READFILE(file, data, length, check) \
     if (ReadFile(file, data, length, &check, NULL)) check = 0
#  define WRITEFILE(file, data, length, check)) \
     if (WriteFile(file, data, length, &check, NULL)) check = 0
#  define FCLOSE(file) CloseHandle(file)
#else
#  include <stdio.h>
#  include <stdlib.h>
#  define READFILE(file, data, length, check) \
     check=(png_size_t)fread(data, (png_size_t)1, length, file)
#  define WRITEFILE(file, data, length, check) \
     check=(png_size_t)fwrite(data, (png_size_t)1, length, file)
#  define FCLOSE(file) fclose(file)
#endif

#ifndef PNG_STDIO_SUPPORTED
#  ifdef _WIN32_WCE
     typedef HANDLE                png_FILE_p;
#  else
     typedef FILE                * png_FILE_p;
#  endif
#endif

static void
pngtest_read_data(png_structp png_ptr, png_bytep data, png_size_t length)
{
   png_size_t check = 0;
   png_voidp io_ptr;

   /* fread() returns 0 on error, so it is OK to store this in a png_size_t
    * instead of an int, which is what fread() actually returns.
    */
   io_ptr = png_get_io_ptr(png_ptr);
   if (io_ptr != NULL)
   {
      READFILE((png_FILE_p)io_ptr, data, length, check);
   }

   if (check != length)
   {
      png_error(png_ptr, "Read Error!");
   }
}

static void
pngtest_write_data(png_structp png_ptr, png_bytep data, png_size_t length)
{
   png_uint_32 check;

   WRITEFILE((png_FILE_p)png_ptr->io_ptr,  data, length, check);
   if (check != length)
   {
      png_error(png_ptr, "Write Error");
   }
}

pngtest_flush(png_structp png_ptr)
{
   /* Do nothing; fflush() is said to be just a waste of energy. */
   png_ptr = png_ptr;  /* Stifle compiler warning */
}

//#define CLAMP(a, x, y) ((a)*(a > x && a < y) + (x)*(a < x) + (y)*(a > y))
#define CLAMP(a, x, y) (a > y ? y : (a < x ? x : a))

static float proc_color(float in)
{
    float d = in/255.0;
    
    if (d > 0.9)
        d = sqrt(d)*2;
    
    return d*255.0;
}

int blur(unsigned char (*img)[3], int w, int h)
{
    unsigned char (*img2)[3] = malloc(w*h*3);
    int i, j, k, x, y;
    int size = 55, sizeh=size/2;
    float *filter = malloc(size*size*sizeof(float)), max;
    float *filter2 = malloc(size*sizeof(float));
    memcpy(img2, img, w*h*3);
    
    max = 0.0;
    float max2 = 0.0;
    for (x=0; x<size; x++) {
        for (y=0; y<size; y++) {
            float dx = (float)x / (float) (size-1) - 0.5f;
            float dy = (float)y / (float) (size-1) - 0.5f;
            float d = 1.0 - sqrt(dx*dx + dy*dy);
            
            dx += 0.5f;
            //if (dx > 0.5) dx = 1.0 - dx;
            dx = dx*1.5 - 0.25;
            dx = cos(dx*M_PI*2);
            dx = (dx+1.0)*0.5;
            
            //dx *= 2.0;
            filter2[x] = pow(dx, 0.75);
            
            //d = 1.0 - d; //pow(d, 20.0);
            filter[y*size+x] = d; //powf(d, 0.5);
            max += d;
        }
        max2 += filter2[x];
        printf("dx: %f\n", filter2[x]);
    }
    
    max = 1 / max;
    for (x=0; x<size*size; x++) {
        filter[x] *= fabs(max);
    }
    
    for (x=0; x<size; x++) {
        filter2[x] /= max2;
    }    
    printf("Blurring. . .\n");
    float r=0, g=0, b=0, d;
    int fi, fj;
    int i2, j2, idx;
    unsigned char *c;
    float *fil;
    
    for (y=0; y<h; y++) {
        printf("%.2f\r", ((float)y/(float)h)*100.0);
        if (y%10==0) fflush(stdout);
        
        for (x=0; x<w; x++) {
            r = g = b = 0.0f;
            
            fil = filter2;
            for (fj=0, j=y-sizeh; fj<1; j++, fj++) {
              for (fi=0, i=x-sizeh-1; fi<size; i++, fi++) {
                d = *(fil++);
                
                i2 = CLAMP(i, 0, w-1);
                j2 = CLAMP(j, 0, h-1);
                idx = j2*w+i2;
                
                c = img[idx];
                
                r += proc_color((float)(*(c++)))*d;
                g += proc_color((float)(*(c++)))*d;
                b += proc_color((float)(*(c++)))*d;
              }
           }
           
           img2[y*w+x][0] = CLAMP(r, 0, 255);
           img2[y*w+x][1] = CLAMP(g, 0, 255);
           img2[y*w+x][2] = CLAMP(b, 0, 255);
        }
    }

    
    for (y=0; y<h; y++) {
        printf("%.2f\r", ((float)y/(float)h)*100.0);
        if (y%10==0) fflush(stdout);
        
        for (x=0; x<w; x++) {
            r = g = b = 0.0f;
            
            fil = filter2;
            for (fj=0, j=y-sizeh; fj<size; j++, fj++) {
              for (fi=0, i=x-sizeh-1; fi<1; i++, fi++) {
                d = *(fil++);
                
                i2 = CLAMP(i, 0, w-1);
                j2 = CLAMP(j, 0, h-1);
                idx = j2*w+i2;
                
                c = img2[idx];
                
                r += proc_color((float)(*(c++)))*d;
                g += proc_color((float)(*(c++)))*d;
                b += proc_color((float)(*(c++)))*d;
              }
           }
           
           img[y*w+x][0] = CLAMP(r, 0, 255);
           img[y*w+x][1] = CLAMP(g, 0, 255);
           img[y*w+x][2] = CLAMP(b, 0, 255);
        }
    }
    
    printf("Done blurring.\n");
}

int sharpen(unsigned char (*img)[3], int w, int h)
{
    unsigned char (*img2)[3] = malloc(w*h*3);
    int i, j, k, x, y;
    int size = 4, sizeh=size/2;
    float *filter = malloc(size*size*sizeof(float)), max;
    memcpy(img2, img, w*h*3);
    
    max = 0.0;
    for (x=0; x<size; x++) {
        for (y=0; y<size; y++) {
            float dx = (float)x / (float) (size-1) - 0.5f;
            float dy = (float)y / (float) (size-1) - 0.5f;
            float d = 1.0 - sqrt(dx*dx + dy*dy);
            
            d = -pow(d, 1);
            //d = 1.0 - d; //pow(d, 20.0);
            filter[y*size+x] = d; //powf(d, 0.5);
            max += d;
        }
    }
    
    filter[size*size/2 + size/2 - 1] = 0.0;
    max = 0.0;
    for (x=0; x<size*size; x++) {
        max += filter[x];
        printf("%.3f\n", filter[x]);
    }
    
    max = 6 / max;
    for (x=0; x<size*size; x++) {
        filter[x] *= fabs(max);
    }
    
    filter[size*size/2 + size/2 - 1] = 7;
    
    printf("Blurring. . .\n");
    float r=0, g=0, b=0, d;
    int fi, fj;
    int i2, j2, idx;
    unsigned char *c;
    float *fil;
    
    for (y=0; y<h; y++) {
        printf("%.2f\r", ((float)y/(float)h)*100.0);
        if (y%10==0) fflush(stdout);
        
        for (x=0; x<w; x++) {
            r = g = b = 0.0f;
            
            fil = filter;
            for (fj=0, j=y-sizeh; fj<size; j++, fj++) {
              for (fi=0, i=x-sizeh-1; fi<size; i++, fi++) {
                d = *(fil++);
                
                i2 = CLAMP(i, 0, w-1);
                j2 = CLAMP(j, 0, h-1);
                idx = j2*w+i2;
                
                c = img2[idx];
                
                r += (float)(*(c++))*d;
                g += (float)(*(c++))*d;
                b += (float)(*(c++))*d;
              }
           }
           
           img[y*w+x][0] = CLAMP(r, 0, 255);
           img[y*w+x][1] = CLAMP(g, 0, 255);
           img[y*w+x][2] = CLAMP(b, 0, 255);
        }
    }
    
    printf("Done blurring.\n");
}

int main(int argc, char **argv)
{
    png_structp read_ptr;
    png_infop read_info_ptr, end_info_ptr;
    png_structp write_ptr;
    png_infop write_info_ptr;
    png_infop write_end_info_ptr;
    png_bytep row_buf;
    png_uint_32 y;
    png_uint_32 width, height;
    int num_pass, pass;
    int bit_depth, color_type;
    FILE *infile, *outfile;
    unsigned char (*img)[3];
    int i, j, k, x;
    
    if (argc < 3) {
        printf("usage: pngstuff infile outfile\n");
    }
    
    infile = fopen(argv[1], "rb");
    
    if (!infile) {
        fprintf(stderr, "Could not open file %s\n", argv[1]);
        return -1;
    }
    
    outfile = fopen(argv[2], "wb");
    if (!outfile) {
        fprintf(stderr, "Could not open file %s\n", argv[2]);
        return -1;
    }
    
    printf("Reading %s...\n", argv[1]);
    
    read_ptr =
      png_create_read_struct(PNG_LIBPNG_VER_STRING, NULL, NULL, NULL);
    
    write_ptr =
      png_create_write_struct(PNG_LIBPNG_VER_STRING, NULL, NULL, NULL);
   
   read_info_ptr = png_create_info_struct(read_ptr);
   end_info_ptr = png_create_info_struct(read_ptr);
   write_info_ptr = png_create_info_struct(write_ptr);
   write_end_info_ptr = png_create_info_struct(write_ptr);
   
   png_init_io(read_ptr, infile);
   png_init_io(write_ptr, outfile); 
   
   png_set_read_fn(read_ptr, (png_voidp)infile, pngtest_read_data);
   png_set_write_fn(write_ptr, (png_voidp)outfile,  pngtest_write_data, pngtest_flush);
   
   png_read_info(read_ptr, read_info_ptr);
   
   width = png_get_image_width(read_ptr, read_info_ptr);
   height = png_get_image_height(read_ptr, read_info_ptr);
   
   img = malloc(width*height*4);
   memset(img, 188, width*height*3);
   for (i=0; i<height; i++) {
       row_buf = img+width*i;
       png_read_rows(read_ptr, (png_bytepp)&row_buf, png_bytepp_NULL, 1);
   }
   
   for (i=0; i<1; i++) {
     blur(img, width, height);
   }
   int interlace_type, compression_type, filter_type;

   if (png_get_IHDR(read_ptr, read_info_ptr, &width, &height, &bit_depth,
       &color_type, &interlace_type, &compression_type, &filter_type))
   {
       png_set_IHDR(write_ptr, write_info_ptr, width, height, bit_depth,
       color_type, PNG_INTERLACE_NONE, compression_type, filter_type);
   }
   
   printf("buf: %p, w: %u, h: %u\n", row_buf, width, height);
   printf("bit depth: %d\n", color_type);
   
   png_write_info(write_ptr, write_info_ptr);
   for (i=0; i<height; i++) {
       row_buf = img + i*width;
       png_write_rows(write_ptr, (png_bytepp)&row_buf, 1);
   }
   
   png_textp text_ptr;
   int num_text;
   if (png_get_text(read_ptr, read_info_ptr, &text_ptr, &num_text) > 0)
   {
       png_debug1(0, "Handling %d iTXt/tEXt/zTXt chunks", num_text);
       png_set_text(write_ptr, write_info_ptr, text_ptr, num_text);
   }

   png_set_interlace_handling(write_ptr);

   png_write_end(write_ptr, write_end_info_ptr);
   free(img);
   return 0;
}

