#if 0
"use strict";

var M_SQRT2 = Math.sqrt(2.0);
var FLT_EPSILON = 2.22e-16;

function saacos(float fac)
{
	if (fac <= -1.0) return Math.pi;
	else if (fac >=  1.0) return 0.0;
	else return Math.acos(fac);
}

function saasin(float fac)
{
	if (fac <= -1.0) return -Math.pi / 2.0;
	else if (fac >=  1.0) return  Math.pi / 2.0;
	else return Math.asin(fac);
}

/******************* Vector2 ******************/

#define VLEN 2
#define VLENM1 1

#define VECTORNAME Vector2
#define VECTOR_EXTRA_METHODS \
  multVecMatrix(Matrix4 mat) {\
    var v3 = _v2_static_mvm_co;\
    v3.load(self);\
    v3[2] = 0.0;\
    v3.multVecMatrix(mat);\
    this[0] = v3[0];\
    this[1] = v3[1];\
    return this;\
  }

#include "src/util/base_vector.js"

#undef VLEN
#undef VLENM1
#undef VECTORNAME
#undef VECTOR_EXTRA_METHODS

var _temp_xyz_vecs = []
for (var i=0; i<32; i++) {
  _temp_xyz_vecs.push(null);
}

var _temp_xyz_cur = 0;

/******************* Vector3 ******************/
#define VLEN 3
#define VLENM1 2
#define VECTORNAME Vector3
#define VECTOR_EXTRA_METHODS \
  cross(Vector3 v) { \
    static Vector3 tmp = new Vector3();\
    tmp[0] = this[1] * v[2] - this[2] * v[1];\
    tmp[1] = this[2] * v[0] - this[0] * v[2];\
    tmp[2] = this[0] * v[1] - this[1] * v[0];\
    this[0] = tmp[0]; this[1] = tmp[1]; this[2] = tmp[2];\
    return this;\
  }\
  static temp_xyz(float x, float y, float z)\
  {\
    global _temp_xyz_vecs;\
    global _temp_xyz_cur;\
    var vec = _temp_xyz_vecs[_temp_xyz_cur];\
    if (vec == null) {\
      vec = new Vector3();\
      _temp_xyz_vecs[_temp_xyz_cur] = vec;\
    }\
    _temp_xyz_cur = (_temp_xyz_cur+1) % _temp_xyz_vecs.length;\
    vec.loadXYZ(x, y, z);\
    return vec;\
  }\
  mulVecQuat(Vector4 q) {\
    var t0 = -this[1] * this[0] - this[2] * this[1] - this[3] * this[2];\
    var t1 = this[0] * this[0] + this[2] * this[2] - this[3] * this[1];\
    var t2 = this[0] * this[1] + this[3] * this[0] - this[1] * this[2];\
    this[2] = this[0] * this[2] + this[1] * this[1] - this[2] * this[0];\
    this[0] = t1;\
    this[1] = t2;\
    t1 = t0 * -this[1] + this[0] * this[0] - this[1] * this[3] + this[2] * this[2];\
    t2 = t0 * -this[2] + this[1] * this[0] - this[2] * this[1] + this[0] * this[3];\
    this[2] = t0 * -this[3] + this[2] * this[0] - this[0] * this[2] + this[1] * this[1];\
    this[0] = t1;\
    this[1] = t2;\
  }\
  multVecMatrix(Matrix4 matrix) {\
      var x = this[0];\
      var y = this[1];\
      var z = this[2];\
      this[0] = matrix.$matrix.m41 + x * matrix.$matrix.m11 + y * matrix.$matrix.m21 + z * matrix.$matrix.m31;\
      this[1] = matrix.$matrix.m42 + x * matrix.$matrix.m12 + y * matrix.$matrix.m22 + z * matrix.$matrix.m32;\
      this[2] = matrix.$matrix.m43 + x * matrix.$matrix.m13 + y * matrix.$matrix.m23 + z * matrix.$matrix.m33;\
      var w = matrix.$matrix.m44 + x * matrix.$matrix.m14 + y * matrix.$matrix.m24 + z * matrix.$matrix.m34;\
      if (w != 1 && w != 0 && matrix.isPersp) {\
          this[0] /= w;\
          this[1] /= w;\
          this[2] /= w;\
      }\
  }

#include "src/util/base_vector.js"

#undef VLEN
#undef VLENM1
#undef VECTOR_EXTRA_METHODS
#undef VECTORNAME


/******************* Vector4 ******************/
#define VLEN 4
#define VLENM1 3
#define VECTORNAME Vector4
#define VECTOR_EXTRA_METHODS\
  multVecMatrix(mat) {\
    var x = this[0];\
    var y = this[1];\
    var z = this[2];\
    var w = this[3];\
    this[0] = matrix.$matrix.m41 + x * matrix.$matrix.m11 + y * matrix.$matrix.m21 + z * matrix.$matrix.m31 + w*matrix.$matrix.m41;\
    this[1] = matrix.$matrix.m42 + x * matrix.$matrix.m12 + y * matrix.$matrix.m22 + z * matrix.$matrix.m32 + w*matrix.$matrix.m42;\
    this[2] = matrix.$matrix.m43 + x * matrix.$matrix.m13 + y * matrix.$matrix.m23 + z * matrix.$matrix.m33 + w*matrix.$matrix.m43;\
    this[3] = w*matrix.$matrix.m44 + x * matrix.$matrix.m14 + y * matrix.$matrix.m24 + z * matrix.$matrix.m34;\
  }\
  cross(Vector4 v) {\
    this[0] =  this[1] * v[2] - this[2] * v[1];\
    this[1] = -this[0] * v[2] + this[2] * v[0];\
    this[2] =  this[0] * v[1] - this[1] * v[0];\
  }
  //what do I do with the fourth component?\

#include "src/util/base_vector.js"

#undef VLEN
#undef VECTORNAME
#undef VECTOR_EXTRA_METHODS

#endif