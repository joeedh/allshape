float16 g_total_out=float16_new(0.000000);
typedef struct f32 {
  float16 exp;
  float16 mant;
  float16 sign;
} f32;
f32 f32_struct_new(float16 exp, float16 mant, float16 sign)
{
  f32 ret;

  ret.exp = exp;
  ret.sign = sign;
  ret.mant = mant;
  return ret;
}
f32 f32_expr_tmp;
float16 m_off=float16_new(1.000000);
f32 one_const=f32_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(1.000000));
f32 zero_const=f32_struct_new(float16_new(0.000000), -float16_new(1.000000), float16_new(1.000000));
f32 f32_e=f32_struct_new(float16_new(1.000000), float16_new(0.359141), float16_new(1.000000));
f32 f32_1_e=f32_struct_new(float16_new(1.000000), float16_new(0.359141), float16_new(1.000000));
float16 f16_e=float16_new(2.718282);
float16 f16_1_e=float16_new(0.367879);
f32 f32_log_of_10=f32_struct_new(float16_new(1.000000), float16_new(0.151293), float16_new(1.000000));
f32 f32_1_log_of_10=f32_struct_new(float16_new(1.000000), float16_new(0.151293), float16_new(1.000000));
float16 f16_log_of_10=float16_new(2.302585);
float16 f16_1_log_of_10=float16_new(0.434294);
f32 f32_log_of_2=f32_struct_new(-float16_new(1.000000), float16_new(0.386294), float16_new(1.000000));
f32 f32_1_log_of_2=f32_struct_new(-float16_new(1.000000), float16_new(0.386294), float16_new(1.000000));
float16 f16_log_of_2=float16_new(0.693147);
float16 f16_1_log_of_2=float16_new(1.442695);
f32 f32_pi=f32_struct_new(float16_new(1.000000), float16_new(0.570796), float16_new(1.000000));
f32 f32_1_pi=f32_struct_new(float16_new(1.000000), float16_new(0.570796), float16_new(1.000000));
float16 f16_pi=float16_new(3.141593);
float16 f16_1_pi=float16_new(0.318310);
f32 f32_sqrt_of_2=f32_struct_new(float16_new(0.000000), float16_new(0.414214), float16_new(1.000000));
f32 f32_1_sqrt_of_2=f32_struct_new(float16_new(0.000000), float16_new(0.414214), float16_new(1.000000));
float16 f16_sqrt_of_2=float16_new(1.414214);
float16 f16_1_sqrt_of_2=float16_new(0.707107);
float16 zero=float16_new(0.000000);
int cur_stream_pos;
float16 lshift16(float16 i, float16 count)
{
  count=floor16(count);
  float16 c1=texture2D(sampler2d_util_tab, vec2_struct_new((count*float16_new(2.000000)+float16_new(0.001000))/util_w, float16_new(0.000000)))[3]*float16_new(255.000000);
  float16 c2=texture2D(sampler2d_util_tab, vec2_struct_new((count*float16_new(2.000000)+float16_new(1.000000)+float16_new(0.001000))/util_w, float16_new(0.000000)))[3]*float16_new(255.000000);
  return i*c1*c2;
}

float16 rshift16(float16 i, float16 count)
{
  count=floor16(count);
  float16 c1=texture2D(sampler2d_util_tab, vec2_struct_new((count*float16_new(2.000000)+float16_new(0.001000))/util_w, float16_new(0.000000)))[3]*float16_new(255.000000);
  float16 c2=texture2D(sampler2d_util_tab, vec2_struct_new((count*float16_new(2.000000)+float16_new(1.000000)+float16_new(0.001000))/util_w, float16_new(0.000000)))[3]*float16_new(255.000000);
  return i/(c1*c2);
}

float16 single_and16(float16 a, float16 b)
{
  a=a+float16_new(0.000001);
  b=b+float16_new(0.000001);
  float16 p=pow16(float16_new(2.000000), b);
  float16 n=floor16(a/p);
  return p*mod16(n, float16_new(2.000000));
}

f32 f32_negate(f32 f)
{
  f.sign=f.sign*-float16_new(1.000000);
  return f;
}

bool f32_gt(f32 a, f32 b)
{
  if (a.sign!=b.sign)
    return a.sign>float16_new(0.000000);
  if (a.exp!=b.exp) {
    return a.exp>b.exp;
  }
  else {
    return a.mant-b.mant>float16_new(0.000010);
  }
}

bool f32_lt(f32 a, f32 b)
{
  if (a.sign!=b.sign)
    return a.sign<float16_new(0.000000);
  if (a.exp!=b.exp) {
    return a.exp<b.exp;
  }
  else {
    return a.mant-b.mant<-float16_new(0.000010);
  }
}

bool f32_equals(f32 a, f32 b)
{
  if (a.sign!=b.sign)
    return false;
  if (a.exp!=b.exp)
    return false;
  float16 fac;
  if (a.exp>float16_new(0.000000))
    fac=pow16(float16_new(2.000000), a.exp)*pow16(float16_new(2.000000), -float16_new(14.000000));
  else
    fac=pow16(float16_new(2.000000), -float16_new(14.000000));
  return abs16(a.mant-b.mant)<fac;
}

f32 f32_copy(f32 fn)
{
  return   f32_struct_new(fn.exp, fn.mant, fn.sign);
}

f32 f32_norm(f32 fn)
{
  if (fn.mant>=m_off) {
    fn.mant=fn.mant+m_off;
    float16 n=floor16(log16(fn.mant)*f16_1_log_of_2);
    fn.mant=fn.mant*pow16(float16_new(2.000000), -n);
    fn.exp=fn.exp+n;
    fn.mant=fn.mant-m_off;
  }
  else if (fn.mant<float16_new(0.000000)&&fn.mant!=-float16_new(1.000000)) {
    float16 expfac=abs16(floor16(log16(abs16(fn.mant+m_off))/f16_log_of_2));
    fn.mant=abs16(fn.mant+m_off)*pow16(float16_new(2.000000), expfac)-m_off;
    fn.exp=fn.exp-expfac;
  }
  else if (fn.mant==-float16_new(1.000000)) {
    fn.exp=float16_new(0.000000);
  }
  return fn;
}

bool f32_is_zero(f32 fn)
{
  return fn.mant==-float16_new(1.000000)||fn.exp<-float16_new(22.000000);
}

f32 f32_abs(f32 a)
{
  a.sign=float16_new(1.000000);
  return a;
}

f32 f32_mul(f32 fn, f32 b)
{
  f32 f;
  if (f32_is_zero(fn))
    return zero_const;
  if (f32_is_zero(b))
    return zero_const;
  f.sign=fn.sign*b.sign;
  f.exp=b.exp+fn.exp;
  f.mant=(fn.mant+m_off)*(b.mant+m_off)-m_off;
  f=f32_norm(f);
  return f;
}

f32 f32_div(f32 fn, f32 b)
{
  f32 f;
  if (f32_is_zero(fn))
    return zero_const;
  if (f32_is_zero(b))
    return zero_const;
  f.sign=fn.sign*b.sign;
  f.exp=fn.exp-b.exp;
  if (m_off+b.mant!=float16_new(0.000000)) {
    f.mant=(m_off+fn.mant)/(m_off+b.mant)-m_off;
  }
  f=f32_norm(f);
  return f;
}

f32 f32_new(float16 n)
{
  f32 f;
  if (n<float16_new(0.000000))
    f.sign=-float16_new(1.000000);
  else
    f.sign=float16_new(1.000000);
  n=abs16(n);
  if (n!=float16_new(0.000000)) {
    f.exp=floor16(log16(n)*f16_1_log_of_2);
    float16 pw=pow16(float16_new(2.000000), -f.exp);
    f.mant=n*pw-m_off;
  }
  else {
    f.exp=float16_new(0.000000);
    f.mant=-float16_new(1.000000);
  }
  return f;
}

float16 f16_new(f32 n)
{
  if (f32_is_zero(n))
    return zero;
  return n.sign*(n.mant+m_off)*pow16(float16_new(2.000000), n.exp);
}

f32 f16_to_f32(float16 f)
{
  return   f32_new(f);
}

float16 f32_to_f16(f32 f)
{
  return   f16_new(f);
}

f32 lshift(f32 i, f32 count1)
{
  float16 count=floor16(f32_to_f16(count1));
  f32 c1=f16_to_f32(texture2D(sampler2d_util_tab, vec2_struct_new((count*float16_new(2.000000)+float16_new(0.001000))/util_w, float16_new(0.000000)))[3]*float16_new(255.000000));
  f32 c2=f16_to_f32(texture2D(sampler2d_util_tab, vec2_struct_new((count*float16_new(2.000000)+float16_new(1.000000)+float16_new(0.001000))/util_w, float16_new(0.000000)))[3]*float16_new(255.000000));
  return f32_mul(f32_mul(i, c1), c2);
}

f32 rshift(f32 i, f32 count1)
{
  float16 count=floor16(f32_to_f16(count1));
  f32 c1=f16_to_f32(texture2D(sampler2d_util_tab, vec2_struct_new((count*float16_new(2.000000)+float16_new(0.001000))/util_w, float16_new(0.000000)))[3]*float16_new(255.000000));
  f32 c2=f16_to_f32(texture2D(sampler2d_util_tab, vec2_struct_new((count*float16_new(2.000000)+float16_new(1.000000)+float16_new(0.001000))/util_w, float16_new(0.000000)))[3]*float16_new(255.000000));
  return f32_div(i, f32_mul(c1, c2));
}

f32 f32_pow2(f32 f)
{
  if (f32_gt(f, f32_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(1.000000)))) {
    return     lshift(f32_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(1.000000)), f);
  }
  else {
    return f32_div(f32_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(1.000000)), lshift(f32_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(1.000000)), f));
  }
}

float16 arith_err_add2(float16 a, float16 b)
{
  float16 c=a+b;
  c=c-b;
  return a-c;
}

float16 arith_err_add(float16 a, float16 b)
{
  return arith_err_add2(a, b)+arith_err_add2(b, a);
}

f32 simple_add(f32 fn, f32 b)
{
  f32 f;
  f32 f1;
  f32 f2;
  if (fn.exp>b.exp) {
    f1=fn;
    f2=b;
  }
  else {
    f2=fn;
    f1=b;
  }
  float16 mul=float16_new(1.000000)/floor16(pow16(float16_new(2.000000), f1.exp-f2.exp));
  float16 m1=(f2.mant+float16_new(1.000000))*f2.sign;
  float16 e1=arith_err_add(f2.mant, float16_new(1.000000));
  float16 m2=(f1.mant+float16_new(1.000000))*f1.sign;
  float16 e2=arith_err_add(f1.mant, float16_new(1.000000));
  f.mant=(f1.mant+float16_new(1.000000))*f1.sign+(f2.mant+float16_new(1.000000))*mul*f2.sign-float16_new(1.000000);
  f.sign=float16_new(1.000000);
  f.exp=f1.exp;
  f.sign=float16_new(1.000000);
  if (f.mant<-float16_new(1.000000)) {
    f.sign=-float16_new(1.000000);
  }
  else {
    if (f1.sign==-float16_new(1.000000)&&f2.sign==-float16_new(1.000000))
      f.sign=-float16_new(1.000000);
    else
      f.sign=float16_new(1.000000);
  }
  f=f32_norm(f);
  return f;
}

f32 f32_add(f32 fn, f32 b)
{
  if (f32_is_zero(fn)||fn.exp>float16_new(26.000000)) {
    return b;
  }
  else if (f32_is_zero(b)||b.exp>float16_new(26.000000)) {
    return fn;
  }
  return   simple_add(fn, b);
}

f32 f32_sub(f32 fn, f32 b)
{
  b.sign=b.sign*-float16_new(1.000000);
  return   f32_add(fn, b);
}

f32 f32_floor(f32 f)
{
  f32 f2=f;
  f32 f2_f32=f;
  if (f2_f32.exp<float16_new(0.000000)||f32_is_zero(f2)) {
    return     f32_struct_new(float16_new(0.000000), -float16_new(1.000000), float16_new(1.000000));
  }
  f32 off=f32_struct_new(f2_f32.exp, float16_new(0.000000), float16_new(1.000000));
  f2=f32_sub(f, off);
  f2=f32_add(f16_to_f32(floor16(f32_to_f16(f2))), off);
  return f2;
}

f32 f32_floor2(f32 f)
{
  f32 f3=f;
  if (f3.exp>float16_new(0.000000)) {
    return     f32_struct_new(float16_new(0.000000), -float16_new(1.000000), float16_new(1.000000));
  }
  f3=f32_div(f32_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(1.000000)), f3);
  f32 f4=f32_struct_new(f3.exp, float16_new(0.000000), float16_new(1.000000));
  f32 f5=f32_struct_new(-f3.exp+float16_new(1.000000), float16_new(0.000000), float16_new(1.000000));
  f4=f32_mul(f4, f5);
  f32 ff=f32_mul(f3, f4);
  f3=f32_div(f32_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(1.000000)), f3);
  return f3;
}

f32 f32_sqrt(f32 a4)
{
  f32 r;
  if (f32_gt(a4, f32_struct_new(float16_new(1.000000), float16_new(0.000000), float16_new(1.000000)))||f32_lt(a4, f32_negate(f32_struct_new(float16_new(1.000000), float16_new(0.000000), float16_new(1.000000))))) {
    r=f32_div(a4, f32_struct_new(float16_new(2.000000), float16_new(0.000000), float16_new(1.000000)));
  }
  else {
    r=f32_mul(a4, f32_struct_new(float16_new(2.000000), float16_new(0.000000), float16_new(1.000000)));
  }

  for (int i=0; i<4; i++) {
    r=f32_mul(f32_add(f32_div(a4, r), r), f32_struct_new(float16_new(-1.000000), float16_new(0.000000), float16_new(1.000000)));
  }
  return r;
}

bool f32_sign(f32 a)
{
  return a.sign<float16_new(0.000000);
}

f32 _f32_exp1(f32 a)
{
  f32 sum=a;
  f32 a2=f32_mul(a, a);
  f32 fact=f32_struct_new(float16_new(1.000000), float16_new(0.000000), float16_new(1.000000));
  f32 c=f32_struct_new(float16_new(0.000000), float16_new(-1.000000), float16_new(1.000000));
  f32 di=f32_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(1.000000));
  f32 y;
  f32 t;
  if (f32_lt(f32_abs(a2), f32_new(float16_new(0.000001)))) {
    return     f32_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(1.000000));
  }

  for (int i=3; i<3; i++) {
    y=f32_add(f32_div(a2, fact), c);
    t=f32_add(sum, y);
    c=f32_sub(f32_sub(t, sum), y);
    sum=t;
    fact=f32_mul(fact, di);
    a2=f32_mul(a2, a);
    di=f32_add(di, f32_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(1.000000)));
  }
  return f32_add(sum, f32_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(1.000000)));
}

f32 f32_exp(f32 a1)
{
  f32 r=f32_struct_new(-float16_new(1.000000), float16_new(0.000000), float16_new(1.000000));
  f32 ex2=f32_div(a1, f32_log_of_2);
  r.exp=floor16(f32_to_f16(f32_floor(ex2)));
  ex2=f32_sub(ex2, f32_floor(ex2));
  r.mant=f32_to_f16(f32_sub(_f32_exp1(f32_mul(ex2, f32_log_of_2)), f32_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(1.000000))));
  f32 mant=_f32_exp1(f32_mul(ex2, f32_log_of_2));
  r=f32_norm(r);
  return r;
}

f32 f32_log(f32 fn)
{
  f32 f=fn;
  if (f32_is_zero(fn))
    return fn;
  f32 x=f16_to_f32(float16_new(1.000000)*(f.exp+float16_new(1.000000))*f16_log_of_2);
  f32 xexp=f32_exp(x);
  f32 y;
  if (f32_lt(xexp, f32_struct_new(float16_new(-14.000000), float16_new(0.638400), float16_new(1.000000)))) {
    x=f32_struct_new(float16_new(0.000000), float16_new(-1.000000), float16_new(1.000000));
    y=fn;
  }
  else {
    y=f32_div(fn, xexp);
  }
  f32 sum=zero_const;
  fn=f32_div(f32_sub(y, f32_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(1.000000))), f32_add(y, f32_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(1.000000))));
  f32 f2=fn;
  f32 y2=f32_div(f32_struct_new(float16_new(-1.000000), float16_new(0.000000), float16_new(1.000000)), f32_struct_new(float16_new(1.000000), float16_new(0.250000), float16_new(1.000000)));
  f=fn;
  f32 d=zero_const;
  f32 c=zero_const;
  f32 t;

  for (int i=0; i<2; i++) {
    y=f32_sub(f32_div(f2, f32_add(f32_mul(d, f32_struct_new(float16_new(1.000000), float16_new(0.000000), float16_new(1.000000))), f32_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(1.000000)))), c);
    f32 y2=f32_add(f32_mul(d, f32_struct_new(float16_new(1.000000), float16_new(0.000000), float16_new(1.000000))), f32_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(1.000000)));
    t=f32_add(sum, y);
    c=f32_sub(f32_sub(t, sum), y);
    sum=t;
    d=f32_add(d, f32_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(1.000000)));
    f2=f32_mul(f32_mul(f2, fn), fn);
  }
  return f32_add(f32_mul(sum, f32_struct_new(float16_new(1.000000), float16_new(0.000000), float16_new(1.000000))), x);
}

f32 f32_fract(f32 f)
{
  return f32_sub(f, f32_floor(f));
}

f32 f32_pow(f32 a, f32 b)
{
  return   f32_exp(f32_mul(f32_log(a), b));
}

f32 f32_mod(f32 a, f32 b)
{
  return f32_sub(a, f32_mul(f32_floor(f32_div(a, b)), b));
}

f32 single_and(f32 a, f32 b)
{
  a=f32_add(a, f32_struct_new(float16_new(-20.000000), float16_new(0.048576), float16_new(1.000000)));
  b=f32_add(b, f32_struct_new(float16_new(-20.000000), float16_new(0.048576), float16_new(1.000000)));
  f32 p=lshift(f32_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(1.000000)), b);
  f32 n=f32_floor(f32_div(a, p));
  return f32_mul(p, f32_mod(n, f32_struct_new(float16_new(1.000000), float16_new(0.000000), float16_new(1.000000))));
}

vec4 pack_float_exact(f32 tst)
{
  vec4 bs;
  f32 f=tst;
  if (f.mant==-float16_new(1.000000)) {
    return     vec4_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(0.000000), float16_new(0.000000));
  }
  f32 sgn;
  if (f.sign>float16_new(0.000000))
    sgn=f32_struct_new(float16_new(7.000000), float16_new(0.000000), float16_new(1.000000));
  else
    sgn=f32_struct_new(float16_new(0.000000), float16_new(-1.000000), float16_new(1.000000));
  tst=f32_abs(tst);
  f=tst;
  f32 expo=f16_to_f32(f.exp);
  f32 manto=f16_to_f32(f.mant);
  expo=f32_add(expo, f32_struct_new(float16_new(6.000000), float16_new(0.984375), float16_new(1.000000)));
  f32 a;
  f32 b;
  f32 c;
  f32 bs32[4];
  manto=f32_mul(manto, f32_struct_new(float16_new(8.000000), float16_new(0.000000), float16_new(1.000000)));
  a=f32_floor(f32_mul(manto, f32_struct_new(float16_new(-1.000000), float16_new(0.000000), float16_new(1.000000))));
  b=f32_sub(f32_floor(f32_mul(manto, f32_struct_new(float16_new(7.000000), float16_new(0.000000), float16_new(1.000000)))), f32_mul(a, f32_struct_new(float16_new(8.000000), float16_new(0.000000), float16_new(1.000000))));
  c=f32_mul(f32_struct_new(float16_new(8.000000), float16_new(0.000000), float16_new(1.000000)), f32_sub(f32_sub(f32_mul(manto, f32_struct_new(float16_new(7.000000), float16_new(0.000000), float16_new(1.000000))), b), f32_mul(a, f32_struct_new(float16_new(8.000000), float16_new(0.000000), float16_new(1.000000)))));
  manto=f32_mul(manto, f32_struct_new(float16_new(7.000000), float16_new(0.000000), float16_new(1.000000)));
  manto=f32_floor(manto);
  bs32[2]=a;
  bs32[1]=b;
  bs32[0]=c;
  bs32[2]=f32_add(bs32[2], f32_mul(f32_mod(expo, f32_struct_new(float16_new(1.000000), float16_new(0.000000), float16_new(1.000000))), f32_struct_new(float16_new(7.000000), float16_new(0.000000), float16_new(1.000000))));
  bs32[3]=f32_mul(expo, f32_struct_new(float16_new(-1.000000), float16_new(0.000000), float16_new(1.000000)));
  bs32[3]=f32_add(f32_floor(bs32[3]), sgn);
  bs32[0]=f32_div(bs32[0], f32_struct_new(float16_new(7.000000), float16_new(0.992188), float16_new(1.000000)));
  bs32[1]=f32_div(bs32[1], f32_struct_new(float16_new(7.000000), float16_new(0.992188), float16_new(1.000000)));
  bs32[2]=f32_div(bs32[2], f32_struct_new(float16_new(7.000000), float16_new(0.992188), float16_new(1.000000)));
  bs32[3]=f32_div(bs32[3], f32_struct_new(float16_new(7.000000), float16_new(0.992188), float16_new(1.000000)));
  bs[0]=f32_to_f16(bs32[0]);
  bs[1]=f32_to_f16(bs32[1]);
  bs[2]=f32_to_f16(bs32[2]);
  bs[3]=f32_to_f16(bs32[3]);
  return bs;
}

vec4 pack_float(f32 tst)
{
  vec4 bs;
  f32 f=tst;
  if (f.mant==-float16_new(1.000000)) {
    return     vec4_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(0.000000), float16_new(0.000000));
  }
  float16 sign=f.sign;
  if (sign>float16_new(0.000000))
    sign=float16_new(0.000000);
  tst=f32_abs(tst);
  f=tst;
  float16 expo=f.exp;
  float16 manto=f.mant;
  expo=expo+float16_new(127.000000);
  float16 a;
  float16 b;
  float16 c;
  manto=manto*float16_new(256.000000);
  a=floor16(manto*float16_new(0.500000));
  b=floor16(manto*float16_new(128.000000))-a*float16_new(256.000000);
  c=floor16(float16_new(256.000000)*(manto*float16_new(128.000000)-b-a*float16_new(256.000000)));
  b=floor16(b);
  bs[2]=a;
  bs[1]=b;
  bs[0]=c;
  bs[2]=bs[2]+mod16(expo, float16_new(2.000000))*float16_new(128.000000);
  bs[3]=expo*float16_new(0.500000);
  bs[3]=floor16(bs[3])+sign*float16_new(128.000000);
  bs[0]=bs[0]/float16_new(255.000000);
  bs[1]=bs[1]/float16_new(255.000000);
  bs[2]=bs[2]/float16_new(255.000000);
  bs[3]=bs[3]/float16_new(255.000000);
  return bs;
}

f32 i16_to_f32(int i)
{
  return   f16_to_f32(i16_to_f16(i));
}

float16 v_Dot;
vec2 v_texCoord;
vec4 g_Color;
vec3 get_patch_point(float16 f, float16 fx, float16 fy)
{
  float16 c;
  float16 ds;
  ds=float16_new(0.000000);
  c=floor16(float16_new(4.000000)*float16_new(4.000000)*float16_new(3.000000)*f+fy*float16_new(4.000000)*float16_new(3.000000)+fx*float16_new(3.000000));
  float16 cy1=floor16(c/data_size)+float16_new(0.000100);
  float16 cx1=mod16(c, data_size)+float16_new(0.000100);
  float16 cy2=floor16((c+float16_new(1.000000))/data_size)+float16_new(0.000100);
  float16 cx2=mod16(c+float16_new(1.000000), data_size)+float16_new(0.000100);
  float16 cy3=floor16((c+float16_new(2.000000))/data_size)+float16_new(0.000100);
  float16 cx3=mod16(c+float16_new(2.000000), data_size)+float16_new(0.000100);
  cx1=cx1+ds;
  cy1=cy1+ds;
  cx2=cx2+ds;
  cy2=cy2+ds;
  cx3=cx3+ds;
  cy3=cy3+ds;
  cx1=cx1/data_size;
  cx2=cx2/data_size;
  cx3=cx3/data_size;
  cy1=cy1/data_size;
  cy2=cy2/data_size;
  cy3=cy3/data_size;
  return   vec3_struct_new(texture2D(sampler2d, vec2_struct_new(cx1, cy1))[3], texture2D(sampler2d, vec2_struct_new(cx2, cy2))[3], texture2D(sampler2d, vec2_struct_new(cx3, cy3))[3]);
}

float16 ptab(float16 i)
{
  if (abs16(i)<float16_new(0.010000))
    return float16_new(1.000000);
  else if (abs16(i-float16_new(1.000000))<float16_new(0.010000))
    return float16_new(3.000000);
  else if (abs16(i-float16_new(2.000000))<float16_new(0.010000))
    return float16_new(3.000000);
  else
    return float16_new(1.000000);
}

vec4 eval(float16 f, float16 u, float16 v)
{
  vec3 p=vec3_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(0.000000));
  float16 bi;
  float16 bj;
  vec3 c;
  float16 di=float16_new(0.000000);
  float16 dj=float16_new(0.000000);

  for (int i=0; i<4; i++) {
    dj=float16_new(0.000000);

    for (int j=0; j<4; j++) {
      bi=ptab(di)*pow16(u, di)*pow16(float16_new(1.000000)-u, float16_new(3.000000)-di);
      bj=ptab(dj)*pow16(v, dj)*pow16(float16_new(1.000000)-v, float16_new(3.000000)-dj);
      c=get_patch_point(f, di, dj);
      p[0]=p[0]+c[0]*bi*bj;
      p[1]=p[1]+c[1]*bi*bj;
      p[2]=p[2]+c[2]*bi*bj;
      dj=dj+float16_new(1.000000);
    }
    di=di+float16_new(1.000000);
  }
  return   vec4_struct_new(p[0], p[1], p[2], float16_new(1.000000));
}

vec4 normal(float16 f, float16 u, float16 v)
{
  vec3 p=vec3_struct_new(float16_new(0.000000), float16_new(0.000000), float16_new(0.000000));
  float16 bi;
  float16 bj;
  vec3 c;
  float16 di=float16_new(0.000000);
  float16 dj=float16_new(0.000000);
  float16 n;
  float16 u2;
  float16 v2;
  float16 u3;
  float16 v3;
  float16 vj;
  float16 ui;
  float16 s1;
  float16 s2;
  float16 n2;
  float16 ul;
  float16 vl;
  ul=u/(steps-float16_new(1.000000))*(steps+float16_new(1.000000));
  vl=v/(steps-float16_new(1.000000))*(steps+float16_new(1.000000));
  u=float16_new(0.020000)+float16_new(0.960000)*u;
  v=float16_new(0.020000)+float16_new(0.960000)*v;
  if (ul>float16_new(0.500000)) {
    ul=abs16(float16_new(1.000000)-ul);
  }
  if (vl>float16_new(0.500000)) {
    vl=abs16(float16_new(1.000000)-vl);
  }
  ul=min16(max16(ul, float16_new(0.000000)), float16_new(1.000000));
  vl=min16(max16(vl, float16_new(0.000000)), float16_new(1.000000));
  float16 ul2;
  float16 vl2;
  ul2=(float16_new(1.000000)-ul)*float16_new(0.400000);
  vl2=(float16_new(1.000000)-vl)*float16_new(0.400000);
  ul=pow16(ul2, float16_new(2.000000))*vl2;
  vl=pow16(vl2, float16_new(2.000000))*ul2;
  u=min16(max16(u, ul), float16_new(1.000000)-ul);
  v=min16(max16(v, vl), float16_new(1.000000)-vl);
  u2=u*u;
  u3=u*u*u;
  v2=v*v;
  v3=v*v*v;

  for (int i=0; i<4; i++) {
    dj=float16_new(0.000000);

    for (int j=0; j<4; j++) {
      ui=pow16(u, di);
      vj=pow16(v, dj);
      n=ui*vj;
      n2=(u3*v3-float16_new(3.000000)*u3*v2)+float16_new(3.000000)*u3*v;
      n2=(n2-u3-float16_new(3.000000)*u2*v3)+float16_new(9.000000)*u2*v2;
      n2=(n2-float16_new(9.000000)*u2*v)+float16_new(3.000000)*u2+float16_new(3.000000)*u*v3;
      n2=(((n2-float16_new(9.000000)*u*v2)+float16_new(9.000000)*u*v-float16_new(3.000000)*u-v3)+float16_new(3.000000)*v2-float16_new(3.000000)*v)+float16_new(1.000000);
      n=n*n2;
      s1=pow16(float16_new(1.000000)-v, dj);
      s2=pow16(float16_new(1.000000)-u, di);
      n=n/(s1*s2);
      c=get_patch_point(f, di, dj);
      p[0]=p[0]+c[0]*n;
      p[1]=p[1]+c[1]*n;
      p[2]=p[2]+c[2]*n;
      dj=dj+float16_new(1.000000);
    }
    di=di+float16_new(1.000000);
  }
  p=normalize3(p);
  return   vec4_struct_new(p[0], p[1], p[2], float16_new(1.000000));
}

void main()
{
  vec4 pos=eval(patch, vPosition[0], vPosition[1]);
  gl_Position=u_modelViewProjMatrix*pos;
  gl_PointSize=9.0;
  vec4 transNormal=u_normalMatrix*normal(patch, vPosition[0], vPosition[1]);
  float16 f=abs16(texture2D(sampler2d, vPosition)[3]);
  vec3 norm=vec3_struct_new(transNormal[0], transNormal[1], transNormal[2]);
  norm=normalize3(norm);
  g_Color=face_color;
  v_texCoord=vec2_struct_new(float16_new(0.000000), float16_new(0.000000));
  v_Dot=max16(dot16(norm, lightDir1), float16_new(0.000000));
}

