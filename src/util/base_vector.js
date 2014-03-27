"use strict";

#ifdef VLEN

function _zero_array(n) {
  var ret = new Array(n);
  for (var i=0; i<n; i++) 
    ret[i] = 0;
  
  return ret;
}
//
// VECTORNAME
//
class VECTORNAME extends Array {
  constructor(Array<float> vec) {
    static init = _zero_array(VLEN);
    
    if (init == undefined)
      init = _zero_array(VLEN);
    
    if (vec == undefined)
      vec = init;
      
    #unroll i=0<VLEN
    if (vec[i] == undefined) vec[i] = 0;
    #endroll
    
    if (typeof(vec) == "number" || typeof(vec[0]) != "number")
      throw new Error("Invalid argument to new VECTORNAME(vec)")
    
    this.length = VLEN;
    
    #unroll i=0<VLEN
    this[i] = vec[i];
    #endroll
  }

  toJSON() {
    var arr = new Array(this.length);
    
    var i = 0;
    for (var i=0; i<this.length; i++) {
      arr[i] = this[i];
    }
    
    return arr;
  }

  zero()
  {
    #unroll i=0<VLEN
    this[i] = 0.0;
    #endroll
    
    return this;
  }

  load(Array<float> v)
  {
    static init = _zero_array(VLEN);
    if (v == undefined) {
      console.trace();
      console.log("Warning: undefined passed to " + this.constructor.name + ".load()")
      v = init;
    }
    
    #unroll i=0<VLEN
    this[i] = v[i];
    #endroll
    
    return this;
  }

  loadXYZ()
  {
    #unroll i=0<VLEN
    this[i] = arguments[i];
    #endroll
    
    return this;
  }

  getAsArray() : Array<float>
  {
    var ret = [];
    #unroll i=0<VLEN
    ret[i] = this[i];
    #endroll;
    
    return ret;
  }

  min(VECTORNAME b)
  {
    #unroll i=0<VLEN
    this[i] = Math.min(this[i], b[i]);
    #endroll
    
    return this;
  }

  max(VECTORNAME b)
  {
    #unroll i=0<VLEN
    this[i] = Math.max(this[i], b[i]);
    #endroll
    
    return this;
  }

  floor(VECTORNAME b=this)
  {
    #unroll i=0<VLEN
    this[i] = Math.floor(this[i], b[i]);
    #endroll
    
    return this;
  }

  ceil(VECTORNAME b=this)
  {
    #unroll i=0<VLEN
    this[i] = Math.ceil(this[i], b[i]);
    #endroll
    
    return this;
  }

  round(VECTORNAME b=this)
  {
    #unroll i=0<VLEN
    this[i] = Math.round(this[i], b[i]);
    #endroll
    
    return this;
  }

  getAsFloat32Array()
  {
    return new Float32Array(this.getAsArray());
  }

  vectorLength()
  {
    return Math.sqrt(
    #unroll i=0<VLENM1
      this[i]*this[i] +
    #endroll
      this[VLENM1]*this[VLENM1]);
  }

  normalize()
  {
    var len = Math.sqrt(
    #unroll i=0<VLENM1
      this[i]*this[i] +
    #endroll
      this[VLENM1]*this[VLENM1]);
    
    if (len > FLT_EPSILON) this.mulScalar(1.0/len);
    
    return len;
  }

  negate()
  {
    #unroll i=0<VLEN
    this[i] = -this[i];
    #endroll
    
    return this;
  }

  fast_normalize()
  {
    var d = 
    #unroll i=0<VLENM1
    this[i]*this[i] + 
    #endroll
    this[VLENM1]*this[VLENM1];
    
    //var n = d > 1.0 ? d*0.5 : d*2;
    //var n2=n*n, n4=n2*n2, n8=n4*n4;
    //var n6=n4*n2;
    
    var len = Math.sqrt(d); //n*n*n*n + 6*n*n*d + d*d;
    if (len <= FLT_EPSILON*5) 
      return 0;
      
    //var div = 4*n*(n*n + d);
    //len = len / div;
    
    len = 1.0/len;
    #unroll i=0<VLEN
    this[i] *= len;
    #endroll
    
    return len;
  }

  divide(VECTORNAME v)
  {
      #unroll i=0<VLEN
      this[i] /= v[i]; 
      #endroll
      
      return this;
  }

  divideScalar(float divisor)
  {
      #unroll i=0<VLEN
      this[i] /= divisor; 
      #endroll
      
      return this;
  }

  divScalar(float divisor)
  {
      #unroll i=0<VLEN
      this[i] /= divisor; 
      #endroll
      
      return this;
  }

  mulScalar(float scalar)
  {
      #unroll i=0<VLEN
      this[i] *= scalar; 
      #endroll
      
      return this;
  }

  mul(VECTORNAME v)
  {
      #unroll i=0<VLEN
      this[i] *= v[i];
      #endroll
      
      return this;
  }

  vectorDistance(VECTORNAME v2) {
    static vec = new VECTORNAME();
    
    vec.load(this);
    vec.sub(v2);
    
    return vec.vectorLength();
  }

  vectorDotDistance(VECTORNAME v2) {
    static vec = new VECTORNAME();
    
    vec.load(this);
    vec.sub(v2);
    
    return vec.dot(vec);
  }

  sub(VECTORNAME v)
  {
    #unroll i=0<VLEN
    this[i] -= v[i];
    #endroll
    
    return this;
  }

  add(VECTORNAME v)
  {
    #unroll i=0<VLEN
    this[i] += v[i];
    #endroll
      
    return this;
  }

  static_add(VECTORNAME v)
  {
    static add = new VECTORNAME();
    
    #unroll i=0<VLEN
    add[i] =  this[i] + v[i];
    #endroll
    
    return add;
  }

  static_sub(VECTORNAME v)
  {
    static _static_sub = new VECTORNAME();
    
    #unroll i=0<VLEN
    _static_sub[i] =  this[i] - v[i];
    #endroll;
    
    return _static_sub;
  }

  static_mul(VECTORNAME v)
  {
    static _static_mul = new VECTORNAME();
    
    #unroll i=0<VLEN
    _static_mul[i] =  this[i] * v[i];
    #endroll
    
    return _static_mul;
  }

  static_divide(VECTORNAME v)
  {
      static _static_divide = new VECTORNAME();
      
      #unroll i=0<VLEN
      _static_divide[i] =  this[i] / v[i];
      #endroll
      
      return _static_divide;
  }

  static_addScalar(float s)
  {
      static _static_addScalar = new VECTORNAME();
      
      #unroll i=0<VLEN
      _static_addScalar[i] =  this[i] + s;
      #endroll
      
      return _static_addScalar;
  }

  static_subScalar(float s)
  {
      static _static_subScalar = new VECTORNAME();
      
      #unroll i=0<VLEN
      _static_subScalar[i] =  this[i] - s;
      #endroll      
      
      return _static_subScalar;
  }

  static_mulScalar(float s)
  {
      static _static_mulScalar = new VECTORNAME();
      
      #unroll i=0<VLEN
      _static_mulScalar[i] =  this[i] * s;
      #endroll
      
      return _static_mulScalar;
  }

  _static_divideScalar(float s)
  {
      static _static_divideScalar = new VECTORNAME();
      
      #unroll i=0<VLEN
      _static_divideScalar[i] =  this[i] / s;
      #endroll
      
      return _static_divideScalar;
  }

  dot(VECTORNAME v)
  {
      return
      #unroll i=0<VLENM1
      this[i]*this[i]+
      #endroll
      this[VLENM1]*this[VLENM1];
  }

  normalizedDot(VECTORNAME v)
  {
    static _v3nd_n1 = new VECTORNAME()
    static _v3nd_n2 = new VECTORNAME()
    _v3nd_n1.load(this);
    _v3nd_n2.load(v);
    
    _v3nd_n1.normalize();
    _v3nd_n2.normalzie();
    
    return _v3nd_n1.dot(_v3nd_n2);
  }

  static normalizedDot4(VECTORNAME v1, VECTORNAME v2, VECTORNAME v3, VECTORNAME v4)
  {
    static _v3nd4_n1 = new VECTORNAME();
    static _v3nd4_n2 = new VECTORNAME();
    
    _v3nd4_n1.load(v2).sub(v1).normalize();
    _v3nd4_n2.load(v4).sub(v3).normalize();
    
    return _v3nd4_n1.dot(_v3nd4_n2);
  }

  preNormalizedAngle(VECTORNAME v2)
  {
    /* this is the same as acos(dot_v3v3(this, v2)), but more accurate */
    if (this.dot(v2) < 0.0) {
      var vec = new VECTORNAME();

      #unroll i=0<VLEN
      vec[i] = -v2[i];
      #endroll
      
      return Math.pi - 2.0 * saasin(vec.vectorDistance(this) / 2.0);
    }
    else
      return 2.0 * saasin(v2.vectorDistance(this) / 2.0);
  }

  combine(VECTORNAME v, float ascl, float bscl)
  {
      #unroll i=0<VLEN
      this[i] = (ascl * this[i]) + (bscl * v[i]);
      #endroll
  }

  interp(VECTORNAME b, Number t) {
    #unroll i=0<VLEN
    this[i] += (b[i]-this[i])*t;
    #endroll
  }

  toString() : String
  {
    return "["+
    #unroll i=0<VLEN
      #if i>0
      ","+
      #endif
      this[i]+
    #endroll
    "]";
  }
  
  VECTOR_EXTRA_METHODS
}
#endif
