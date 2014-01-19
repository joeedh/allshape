#include <cstdlib>
#include <cstdio>
#include <cstdint>
#include <cmath>
#include <ctime>
#include "half.hpp"
#include <limits>

#define USE_32_FOR_HALF

#ifndef USE_32_FOR_HALF
typedef half_float::half float16;
#else
typedef float float16;
#endif

class vec {
private:
	float16 data[4];
public:
	vec() {
		data[0] = data[1] = data[2] = data[3] = 0.0;
	}

	vec(const vec &b) {
		for (int i=0; i<4; i++) {
			data[i] = b.data[i];
		}
	}

	vec(float16 x, float16 y) {
		data[0] = x; data[1] = y;
	}

	float16 &operator[] (int x) {
		return data[x];
	}
};

typedef int sampler2D;
typedef vec vec3;
typedef vec vec2;
typedef vec vec4;

vec2 vec2_struct_new(float16 x, float16 y)
{
	vec2 ret;
	ret[0] = x;
	ret[1] = y;

	return ret;
}

vec3 vec3_struct_new(float16 x, float16 y, float16 z)
{
	vec3 ret;
	ret[0] = x;
	ret[1] = y;
	ret[2] = z;

	return ret;
}

vec4 vec4_struct_new(float16 x, float16 y, float16 z, float16 w)
{
	vec4 ret;
	ret[0] = x;
	ret[1] = y;
	ret[2] = z;
	ret[3] = z;

	return ret;
}

vec4 gl_FragCoord;
vec4 gl_FragColor;
int sampler2d_util_tab = 0;
float16 util_w((float)67.0), width((float)256.0);

int f16_to_i16(float16 f)
{
	return (int)float(f);
}

float f16_to_cf32(float16 f)
{
	return float(f);
}

float16 float16_new(float f);
float16 i16_to_f16(int i)
{
	return float16_new((float)i);
}

int int_new(float16 i)
{
	return i;
}

float16 float16_new(float f)
{
#ifndef USE_32_FOR_HALF
	return half_float::half_cast<half_float::half,std::numeric_limits<float>::round_style>(f);
#else
	return f;
#endif
}

#ifndef USE_32_FOR_HALF
float16 float16_new(float16 f)
{
	return f;
}
#endif

#ifdef USE_32_FOR_HALF
#define floor16(a) floorf((float)a)
#define ceil16(a) ceilf((float)a)
#define pow16(a, b) powf((float)a, (float)b)
#define log16(a) logf((float)a)
#define sqrt16(a) sqrtf((float)a)
#define exp16(a) expf((float)a)
#define mod16(a, b) fmodf((float)a, (float)b)
#define abs16(a) fabsf((float)a)
#else
#define floor16(a) half_float::floor(a)
#define ceil16(a) half_float::ceil(a)

float16 pow16(float16 a, float16 b)
{	
	if (b < 0.0)
		return half_float::half(1) / half_float::pow(a, half_float::fabs(b));
	else
		return half_float::pow(a, b);
}
#define log16 half_float::log
#define sqrt16 half_float::sqrt
#define exp16 half_float::exp
#define mod16 half_float::fmod
#define abs16 half_float::abs
#endif

unsigned short util_tex[67];

void gen_util_tex() {
	for (int i=0; i<32; i++) {
		if (i < 8) {
			util_tex[i*2] = 1<<(i);
			util_tex[i*2+1] = 1;
		} else {
			util_tex[i*2] = 128;
			util_tex[i*2+1] = 1<<(i-7);
		}
	}
}

float f16_get(float16 f)
{
	return float(f);
}

vec4 texture2D(int sampler, vec2 coord)
{
	vec4 ret;
	float16 c = coord[0];
	float c32 = c;
	int i = (int)float(coord[0]*float16_new(67.0));
	ret[3] = float16_new((float)util_tex[i])/float16_new(255.0);
	
	return ret;
}

struct f32;
float f32_to_c32(struct f32 f);
void _f32_print(char *name, struct f32 f);
void _f16_print(char *name, float16 f);
void printf0(char *str);

#define f32_print(f) _f32_print(#f, f)
#define f32_print2(str, f) _f32_print(str, f)

#define f16_print(f) _f16_print(#f, f)
#define f16_print2(s, f) _f16_print(s, f)

#include "tinygpu_mathlib.hpp"

void _f32_print(char *name, struct f32 f)
{
	double sign = double(f.sign);
	double m_off2 = (double) m_off; 
	double f2 = (double(f.mant)+m_off2)*std::pow((double)2.0, (double)f.exp)*sign;

	printf("%s: %f | e%lf m%lf\n\r", name, f2, (float)f.exp, (float)f.mant);
}

void _f16_print(char *name, float16 f)
{
	printf("%s: %lfhf\r\n", name, (float)f);
}

void printf0(char *str)
{
	printf(str);
}

float f32_to_c32(struct f32 f)
{
	return std::powf(2.0, f.exp)*(1.0 + f.mant)*f.sign;
}

f32 c32_to_f32(float f)
{
	float f2 = f;

	if (f == 0.0) {
		return f32_struct_new(float16(0.0), float16(-1.0), float16(1.0));
	}

	f32 ret;
	if (f < 0.0) {
		ret.sign = -1.0;
	} else {
		ret.sign = 1.0;
	}

	f = std::fabs(f);
	float exp = std::floor(std::logf(f) / std::logf(2.0f));
	float mant = f / std::powf(2.0f, exp);
	
	ret.exp = exp;
	ret.mant = float16(mant-1.0f);

	return ret;
}

int main(char argv, int argc)
{
	gen_util_tex();
	float16 fa(0.5), fb(3.0);
	vec4 fbytes;
	unsigned char bytes[4];
	float *f;

	f32 a = f32_new(fa); f32 b = f32_new(fb);
	f32 c = c32_to_f32(2.0);

	c = f32_pow(c, b);

	fbytes = pack_float(c);
	for (int i=0; i<4; i++) {
		bytes[i] = (unsigned char)(float(fbytes[i])*255.0);
	}
	f = (float*)bytes;

	float ret = *f;
	printf("ret1:%lf\n", ret);
	// */

	//c = f32_floor(c32_to_f32(182.34)); //(c32_to_f32(2.0), c32_to_f32(18207));
	//f32_print2("ret", c);

	system("PAUSE");
}