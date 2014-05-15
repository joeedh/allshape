var $_mh;


#ifdef NOCACHE
#define CACHEARR2(a, b) [a, b]
#define CACHEARR3(a, b, c) [a, b, c]
#define CACHEARR4(a, b, c, d) [a, b, c, d]
#else
#define CACHEARR2(a, b) (($_mh = objcache.array(2)), ($_mh[0] = (a)), ($_mh[1] = (b)), $_mh)
#define CACHEARR3(a, b, c) (($_mh = objcache.array(2)), ($_mh[0] = (a)), ($_mh[1] = (b)), ($_mh[2] = (c)), $_mh)
#define CACHEARR4(a, b, c, d) (($_mh = objcache.array(2)), ($_mh[0] = (a)), ($_mh[1] = (b)), ($_mh[2] = (c)), ($_mh[3] = (d)), $_mh)
#endif

var $_swapt;
#define SWAP(a, b) ($_swapt = a, a = b, b = $_swapt)

//high-performance math macros

#define VCROSS(r, a, b)\
  r[0] = a[1] * b[2] - a[2] * b[1];\
  r[1] = a[2] * b[0] - a[0] * b[2];\
  r[2] = a[0] * b[1] - a[1] * b[0];

#define VSUB(r, a, b)\
  r[0] = a[0] - b[0];\
  r[1] = a[1] - b[1];\
  r[2] = a[2] - b[2]
  
#define VADD(r, a, b)\
  r[0] = a[0] + b[0];\
  r[1] = a[1] + b[1];\
  r[2] = a[2] + b[2]

#define VDOT(a, b) (a[0]*b[0] + a[1]*b[1] + a[2]*b[2])

#define VNORMALIZE(a)\
  var _len = Math.sqrt(VDOT(a, a));\
  if (_len > 0.00001) _len = 1.0 / _len;\
  a[0] *= _len; a[1] *= _len; a[2] *= _len\

#define VLOAD(a, b) a[0] = b[0]; a[1] = b[1]; a[2] = b[2]

#define VZERO(a) a[0] = a[1] = a[2] = 0.0

#define VMULF(a, f)\
  a[0] *= f; a[1] *= f; a[2] *= f;
