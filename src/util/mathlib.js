"use strict";

#include "src/core/utildefine.js"

var feps = 2.22e-16;

var COLINEAR = 1;
var LINECROSS = 2;

var _cross_vec1 = new Vector3();
var _cross_vec2 = new Vector3();

var FLOAT_MIN = -1e21;
var FLOAT_MAX = 1e22

/*a UI-friendly Matrix4 wrapper, that 
  likes to pretend it's a simple collection
  of [location, rotation-euler, size] 
  parameters*/

var Matrix4UI = Matrix4

class Matrix4UI extends Matrix4 {
  constructor(loc, rot=undefined, size=undefined) {
    super();

    if (loc instanceof Matrix4) {
      this.load(loc);
      return;
    }
    
    if (rot == undefined)
      rot = [0, 0, 0];
      
    if (size == undefined)
      size = [1.0, 1.0, 1.0];
    
    this.makeIdentity();
    this.calc(loc, rot, size);
  }
  
  calc(loc, rot, size) {
    this.rotate(rot[0], rot[1], rot[2]);
    this.scale(size[0], size[1], size[2]);
    this.translate(loc[0], loc[1], loc[2]);
  }
  
  get loc() {
    var t = new Vector3();
    this.decompose(t);
    
    return t;
  }
  
  set loc(loc) {
    var l = new Vector3(), r = new Vector3(), s = new Vector3();
    
    this.decompose(l, r, s);
    this.calc(loc, r, s);
  }
  
  get rot() {
    var t = new Vector3();
    this.decompose(undefined, t);
    return t;
  }
  
  set rot(rot) {
    var l = new Vector3(), r = new Vector3(), s = new Vector3();
    
    this.decompose(l, r, s);
    this.calc(l, rot, s);
  }
  
  get size() {
    var t = new Vector3()
    this.decompose(undefined, undefined, t);
    
    return t;
  }
  
  set size(size) {
    var l = new Vector3(), r = new Vector3(), s = new Vector3();
    
    this.decompose(l, r, s);
    this.calc(l, r, size);
  }
}

//check if we're on a 16-bit floating point system,
//which is thoeretically possible with mobile
//devices.  note: this is untested
if (FLOAT_MIN != FLOAT_MIN || FLOAT_MAX != FLOAT_MAX) {
  //16-bit case
  FLOAT_MIN = 1e-5;
  FLOAT_MAX = 1e6;
  console.log("Floating-point 16-bit system detected!");
}

var _static_grp_points4 = new Array(4);
var _static_grp_points8 = new Array(8);
function get_rect_points(p, size)
{
  var cs;
  
  if (p.length == 2) {
    cs = _static_grp_points4;
    
    cs[0] = p;
    cs[1] = [p[0]+size[0], p[1]]
    cs[2] = [p[0]+size[0], p[1]+size[1]]
    cs[3] = [p[0], p[1]+size[1]]
  } else if (p.length == 3) {
    cs = _static_grp_points8;
    
    cs[0] = p;
    cs[1] = [p[0]+size[0], p[1], p[2] ];
    cs[2] = [p[0]+size[0], p[1]+size[1], p[2] ];
    cs[3] = [p[0], p[1]+size[0], p[2] ];
    
    cs[4] = [p[0], p[1], p[2]+size[2] ];
    cs[5] = [p[0]+size[0], p[1], p[2]+size[2] ];
    cs[6] = [p[0]+size[0], p[1]+size[1], p[2]+size[2] ];
    cs[7] = [p[0], p[1]+size[0], p[2]+size[2] ];      
  } else {
    throw "get_rect_points has no implementation for " + p.length + "-dimensional data";
  }
  
  return cs;
}

function get_rect_lines(p, size)
{
  var ps = get_rect_points(p, size);
  
  if (p.length == 2) {
    return [[ps[0], ps[1]], [ps[1], ps[2]], [ps[2], ps[3]], [ps[3], ps[0]]];
  } else if (p.length == 3) {
    var l1 = [[ps[0], ps[1]], [ps[1], ps[2]], [ps[2], ps[3]], [ps[3], ps[0]]]
    var l2 = [[ps[4], ps[5]], [ps[5], ps[6]], [ps[6], ps[7]], [ps[7], ps[4]]]
    
    l1.concat(l2);
    
    l1.push([ps[0], ps[4]])
    l1.push([ps[1], ps[5]])
    l1.push([ps[2], ps[6]])
    l1.push([ps[3], ps[7]])
    
    return l1;
  } else {
    throw "get_rect_points has no implementation for " + p.length + "-dimensional data";
  }
}

function simple_tri_aabb_isect(v1, v2, v3, min, max) {
  static vs = [0, 0, 0];
  
  vs[0] = v1; vs[1] = v2; vs[2] = v3;
  for (var i=0; i<3; i++) {
    var isect = true;
    
    for (var j=0; j<3; j++) {
      if (vs[j][i] < min[i] || vs[j][i] >= max[i])
        isect = false;
    }
    
    if (isect)
      return true;
  }
  
  return false;
}

class MinMax {
  constructor(int totaxis=1) {
    this.totaxis = totaxis;
    
    //we handle the empty set case by separating the 
    //minmax arrays from the publicly available interface ,
    //such that the minmax of the empty set will always
    //be [0, 0];
    
    if (totaxis != 1) {
      this._min = new Array(totaxis);
      this._max = new Array(totaxis);
      this.min = new Array(totaxis);
      this.max = new Array(totaxis);
    } else {
      this.min = this.max = 0;
      this._min = FLOAT_MAX;
      this._max = FLOAT_MIN;
    }
    
    this.reset();
    
    this._static_mr_co = new Array(this.totaxis);
    this._static_mr_cs = new Array(this.totaxis*this.totaxis);
  }
  
  load(MinMax mm) {
    if (this.totaxis == 1) {
      this.min = mm.min; this.max = mm.max;
      this._min = mm.min; this._max = mm.max;
    } else {
      this.min = new Vector3(mm.min);
      this.max = new Vector3(mm.max);
      this._min = new Vector3(mm._min);
      this._max = new Vector3(mm._max);
    }
  }
  
  reset() {
    var totaxis = this.totaxis;
    
    if (totaxis == 1) {
      this.min = this.max = 0;
      this._min = FLOAT_MAX;
      this._max = FLOAT_MIN;
    } else {
      for (var i=0; i<totaxis; i++) {
          this._min[i] = FLOAT_MAX;
          this._max[i] = FLOAT_MIN;
          this.min[i] = 0;
          this.max[i] = 0;
      }
    }
  }
  
  minmax_rect(Array<float> p, Array<float> size) {
    var totaxis = this.totaxis;
    
    var cs = this._static_mr_cs;
    
    if (totaxis == 2) {
      cs[0] = p;
      cs[1] = [p[0]+size[0], p[1]]
      cs[2] = [p[0]+size[0], p[1]+size[1]]
      cs[3] = [p[0], p[1]+size[1]]
    } else if (totaxis = 3) {
      cs[0] = p;
      cs[1] = [p[0]+size[0], p[1], p[2] ];
      cs[2] = [p[0]+size[0], p[1]+size[1], p[2] ];
      cs[3] = [p[0], p[1]+size[0], p[2] ];
      
      cs[4] = [p[0], p[1], p[2]+size[2] ];
      cs[5] = [p[0]+size[0], p[1], p[2]+size[2] ];
      cs[6] = [p[0]+size[0], p[1]+size[1], p[2]+size[2] ];
      cs[7] = [p[0], p[1]+size[0], p[2]+size[2] ];      
    } else {
      throw "Minmax.minmax_rect has no implementation for " + totaxis + "-dimensional data";
    }
    
    for (var i=0; i<cs.length; i++) {
      this.minmax(cs[i]);
    }
  }
  
  minmax(Array<float> p) {
    var totaxis = this.totaxis
    
    if (totaxis == 1) {
      this._min = this.min = Math.min(this._min, p);
      this._max = this.max = Math.max(this._max, p);
    } else {
      for (var i=0; i<totaxis; i++) {
        this._min[i] = this.min[i] = Math.min(this._min[i], p[i]);
        this._max[i] = this.max[i] = Math.max(this._max[i], p[i]);
      }
    }
  }
  
  static fromSTRUCT(reader) {
    var ret = new MinMax();
    
    reader(ret);
    
    return ret;
  }
}

MinMax.STRUCT = """
  MinMax {
    min     : vec3;
    max     : vec3;
    _min    : vec3;
    _max    : vec3;
    totaxis : int;
  }
""";

function winding(a, b, c) {
    for (var i=0; i<a.length; i++) {
      _cross_vec1[i] = b[i] - a[i];
      _cross_vec2[i] = c[i] - a[i];
    }
    
    if (a.length == 2) {
      _cross_vec1[2] = 0.0;
      _cross_vec2[2] = 0.0;
    }
    
    _cross_vec1.cross(_cross_vec2);
    
    return _cross_vec1[2] > 0.0;
}

//this specifically returns true in the case where two rectangles
//share common borders
function inrect_2d(p, pos, size) {
  if (p == undefined || pos == undefined || size == undefined) {
    console.trace();
    console.log("Bad paramters to inrect_2d()")
    console.log("p: ", p, ", pos: ", pos, ", size: ", size);
    return false;
  }
  return p[0] >= pos[0] && p[0] <= pos[0]+size[0] && p[1] >= pos[1] && p[1] <= pos[1]+size[1];
}

function aabb_isect_line_2d(v1, v2, min, max) {
  static smin = new Vector2(), smax = new Vector2();
  static ssize = new Vector2();
  
  for (var i=0; i<2; i++) {
    smin[i] = Math.min(min[i], v1[i]);
    smax[i] = Math.max(max[i], v2[i]);
  }
  
  //convert to the pos, size form aabb_isect_2d can understand
  smax.sub(smin);
  ssize.load(max).sub(min);
  
  if (!aabb_isect_2d(smin, smax, min, ssize))
    return false;
  
  for (var i=0; i<4; i++) {
    if (inrect_2d(v1, min, ssize)) return true;
    if (inrect_2d(v2, min, ssize)) return true;
  }
  
  static sv1 = new Vector2();
  static sv2 = new Vector2();
  static ps = [new Vector2(), new Vector2(), new Vector2()];
  
  ps[0] = min;
  ps[1][0] = min[0]; ps[1][1] = max[1];
  ps[2] = max;
  ps[3][0] = max[0]; ps[3][1] = min[1];
  
  static l1 = [0, 0], l2 = [0, 0];
  l1[0] = v1; l1[1] = v2;
  
  for (var i=0; i<4; i++) {
    var a = ps[i], b = ps[(i+1)%4];
    
    l2[0] = a;
    l2[1] = b;
    
    if (line_line_cross(l1, l2)) return true;
  }
  
  return false;
}

function aabb_isect_2d(pos1, size1, pos2, size2) {
  var ret = 0;
  
  for (var i=0; i<2; i++) {
    var a = pos1[i];
    var b = pos1[i]+size1[i];
    var c = pos2[i];
    var d = pos2[i]+size2[i];
    
    if (b >= c && a <= d) ret += 1;
  }
  
  //console.log(ret, ret==2);
  return ret == 2;
}

function expand_rect2d(Array<float> pos, Array<float> size, Array<float> margin) {
  pos[0] -= Math.floor(margin[0]);
  pos[1] -= Math.floor(margin[1]);
  size[0] += Math.floor(margin[0]*2.0);
  size[1] += Math.floor(margin[1]*2.0);
}

function expand_line(l, margin) {
    var c = new Vector3();
    c.add(l[0]);
    c.add(l[1]);
    c.mulScalar(0.5);
    
    l[0].sub(c);
    l[1].sub(c);
    
    var l1 = l[0].vectorLength();
    var l2 = l[1].vectorLength();
    
    l[0].normalize();
    l[1].normalize();
    
    l[0].mulScalar(margin + l1);
    l[1].mulScalar(margin + l2);
    
    l[0].add(c);
    l[1].add(c);
    
    return l;
}

function colinear(a, b, c) {
    for (var i=0; i<3; i++) {
      _cross_vec1[i] = b[i] - a[i];
      _cross_vec2[i] = c[i] - a[i];
    }
    
    var limit = 2.2e-16;
    
    if (a.vectorDistance(b) < feps*100 && a.vectorDistance(c) < feps*100)
    {
        return true;
    }
    
    if (_cross_vec1.dot(_cross_vec1) < limit ||
        _cross_vec2.dot(_cross_vec2) < limit)
        return true;
        
   // _cross_vec1.normalize();
   // _cross_vec2.normalize();
    _cross_vec1.cross(_cross_vec2);
    
    return _cross_vec1.dot(_cross_vec1) < limit;
}

var _llc_l1 = [new Vector3(), new Vector3()]
var _llc_l2 = [new Vector3(), new Vector3()]

function line_line_cross(l1, l2) {
    //if (margin == undefined) margin = 0;
    
    /*var l1 = [new Vector3(l1[0]), new Vector3(l1[1])];
    var l2 = [new Vector3(l2[0]), new Vector3(l2[1])];
    var l1 = expand_line(l1, margin);
    var l2 = expand_line(l2, margin);*/
    
    //if (colinear(l1[0], l1[1], l2[0])) return true;
    //if (colinear(l1[0], l1[1], l2[1])) {
    //  return true;
    //}
    // /*
    
    var limit = feps*1000;
    
    if (Math.abs(l1[0].vectorDistance(l2[0])+l1[1].vectorDistance(l2[0])-
        l1[0].vectorDistance(l1[1])) < limit)
    {
      return true;
    }
    if (Math.abs(l1[0].vectorDistance(l2[1])+l1[1].vectorDistance(l2[1])-
        l1[0].vectorDistance(l1[1])) < limit)
    {
      return true;
    }
    if (Math.abs(l2[0].vectorDistance(l1[0])+l2[1].vectorDistance(l1[0])-
        l2[0].vectorDistance(l2[1])) < limit)
    {
      return true;
    }
    if (Math.abs(l2[0].vectorDistance(l1[1])+l2[1].vectorDistance(l1[1])-
        l2[0].vectorDistance(l2[1])) < limit)
    {
      return true;
    }
    // */
    //feps*100
    //if (colinear(l2[0], l2[1], l1[0])) return true;
    //if (colinear(l2[0], l2[1], l1[1])) return true;
    
    var a = l1[0]; var b = l1[1];
    var c = l2[0]; var d = l2[1];
    
    var w1 = winding(a, b, c);
    var w2 = winding(c, a, d);
    
    var w3 = winding(a, b, d);
    var w4 = winding(c, b, d);
    
    return (w1 == w2) && (w3 == w4) && (w1 != w3);
}

function point_in_tri(p, v1, v2, v3) {
    var w1 = winding(p, v1, v2);
    var w2 = winding(p, v2, v3);
    var w3 = winding(p, v3, v1);
    
    return w1 == w2 && w2 == w3;
}

function convex_quad(v1, v2, v3, v4) {
    return line_line_cross([v1, v3], [v2, v4]);
}

function normal_tri(v1, v2, v3) {
  static e1 = new Vector3(), e2 = new Vector3(), e3 = new Vector3();
  
   /*
  e1.load(v2).sub(v1);
  e2.load(v3).sub(v1);
  e1.cross(e2);
  e1.normalize();
  
  return e1;
  // */
  
  /*the use of these macros is actually faster.
    I've tested it.  argh!*/
  // /*
  VSUB(e1, v2, v1);
  VSUB(e2, v3, v1);
  VCROSS(e3, e1, e2);
  VNORMALIZE(e3);
  
  return e3;
  // */
}

function normal_quad(v1, v2, v3, v4) {
  var n = normal_tri(v1, v2, v3)
  static n2 = new Vector3();
  
  VLOAD(n2, n);
  n = normal_tri(v1, v3, v4);
  VADD(n2, n2, n);
  VNORMALIZE(n2);
  
  return n2;
}

var _li_vi = new Vector3()
function line_isect(v1, v2, v3, v4, calc_t) {  //calc_t is optional, defaults to false
  if (calc_t == undefined) {
    calc_t = false;
  }
  
  //code may be copyright tainted; replace
  var div = (v2[0] - v1[0]) * (v4[1] - v3[1]) - (v2[1] - v1[1]) * (v4[0] - v3[0]);
  if (div == 0.0) return [new Vector3(), COLINEAR, 0.0];
  
  var vi = _li_vi;
  vi[0] = 0; vi[1] = 0; vi[2] = 0;    
  
  vi[0] = ((v3[0] - v4[0]) * (v1[0] * v2[1] - v1[1] * v2[0]) - (v1[0] - v2[0]) * (v3[0] * v4[1] - v3[1] * v4[0])) / div;
  vi[1] = ((v3[1] - v4[1]) * (v1[0] * v2[1] - v1[1] * v2[0]) - (v1[1] - v2[1]) * (v3[0] * v4[1] - v3[1] * v4[0])) / div;
  
  if (calc_t || v1.length == 3) {
    var n1 = new Vector2(v2).sub(v1);
    var n2 = new Vector2(vi).sub(v1);
    
    var t = n2.vectorLength()/n1.vectorLength();
    
    n1.normalize(); n2.normalize();
    if (n1.dot(n2) < 0.0) {
      t = -t;
    }
    
    if (v1.length == 3) {
      vi[2] = v1[2] + (v2[2] - v1[2])*t;
    }
    
    return [vi, LINECROSS, t];
  }
  
  return [vi, LINECROSS];
}

var dtl_v3 = new Vector3()
var dtl_v4 = new Vector3()
var dtl_v5 = new Vector3()
function dist_to_line_v2(p, v1, v2)
{
  var v3 = dtl_v3, v4 = dtl_v4;
  var v5 = dtl_v5;
  
  v3.load(v1); v4.load(v2);
  
  v4.sub(v3);
  v5[0] = -v4[1];
  v5[1] = v4[0];
  
  v3 = p;
  v4.load(v5);
  v4.add(v3);
  
  var ret = line_isect(v1, v2, v3, v4);
  //console.log(ret)
  
  if (ret[1] == COLINEAR) {
    var d1 = p.vectorDistance(v1);
    var d2 = p.vectorDistance(v2);
    
    return Math.min(d1, d2);
  } else {
    var t1 = ret[0].vectorDistance(v1);
    var t2 = ret[0].vectorDistance(v2);
    var t3 = v1.vectorDistance(v2);
    
    if (t1 > t3 || t2 > t3) {
      var d1 = p.vectorDistance(v1);
      var d2 = p.vectorDistance(v2);
      
      return Math.min(d1, d2);
    } else {
      return p.vectorDistance(ret[0]);
    }
  }
}

function closest_point_on_line(p, v1, v2)
{
  var v3 = dtl_v3, v4 = dtl_v4;
  var v5 = dtl_v5;
  
  v3.load(v1); v4.load(v2);
  
  v4.sub(v3);
  v5[0] = -v4[1];
  v5[1] = v4[0];
  
  v3 = p;
  v4.load(v5);
  v4.add(v3);
  
  var ret = line_isect(v1, v2, v3, v4);
  if (ret[1] == COLINEAR) {
      var v3 = dtl_v3; v4 = dtl_v4;
      var v5 = dtl_v5;
      
      p = new Vector3(p);
      v3.load(v1); v4.load(v2);
      
      v4.sub(v3);
      p.sub(v4)
      
      v5[0] = -v4[1];
      v5[1] = v4[0];
      
      v3 = p;
      v4.load(v5);
      v4.add(v3);
      ret = line_isect(v1, v2, v3, v4);
  }
  return [new Vector3(ret[0]), v1.vectorDistance(ret[0])];
}

//returns the circumcircle of the triangle defined by points a, b, and c.
var _gtc_e1 = new Vector3();
var _gtc_e2 = new Vector3();
var _gtc_e3 = new Vector3();
var _gtc_p1 = new Vector3();
var _gtc_p2 = new Vector3();
var _gtc_v1 = new Vector3();
var _gtc_v2 = new Vector3();

var _gtc_p12 = new Vector3()
var _gtc_p22 = new Vector3()

function get_tri_circ(a, b, c) {
    var e1 = _gtc_e1;
    var e2 = _gtc_e2;
    var e3 = _gtc_e3;
    
    for (var i=0; i<3; i++) {
        e1[i] = b[i] - a[i];
        e2[i] = c[i] - b[i];
        e3[i] = a[i] - c[i];
    }
    
    var p1 = _gtc_p1;
    var p2 = _gtc_p2;
    
    for (var i=0; i<3; i++) {
      p1[i] = (a[i] + b[i])*0.5;
      p2[i] = (c[i] + b[i])*0.5; //<- this may be wrong, use this instead?-> (c[i] + a[i])*0.5;
    }
    
    e1.normalize();
    
    var v1 = _gtc_v1;
    var v2 = _gtc_v2;
    
    v1[0] = -e1[1]; v1[1] = e1[0]; v1[2] = e1[2];
    v2[0] = -e2[1]; v2[1] = e2[0]; v2[2] = e2[2];
    
    v1.normalize();
    v2.normalize();
    
    var cent;
    var type;
    
    for (i=0; i<3; i++) {
      _gtc_p12[i] = p1[i] + v1[i];
      _gtc_p22[i] = p2[i] + v2[i];
    }

    var ret = line_isect(p1, _gtc_p12, p2, _gtc_p22)
    cent = ret[0]; type = ret[1];
    
    e1.load(a); e2.load(b); e3.load(c);
    var r = e1.sub(cent).vectorLength()
    if (r < feps)
        r = e2.sub(cent).vectorLength()
    if (r < feps)
        r = e3.sub(cent).vectorLength()
        
    return [cent, r];
}

function gen_circle(m, origin, r, stfeps) {
  var pi = Math.PI;
  
  var f = -pi/2;
  var df = (pi*2)/stfeps;
  
  var verts = new GArray();
  for (var i =0; i<stfeps; i++) {
    var x = origin[0] + r*Math.sin(f);
    var y = origin[1] + r*Math.cos(f);
    var v = m.make_vert(new Vector3([x, y, origin[2]]));
    
    verts.push(v);
    f += df;
  }
  
  for (var i =0; i<verts.length; i++) {
    var v1 = verts[i];
    var v2 = verts[(i+1)%verts.length];
    m.make_edge(v1, v2)
  }
  
  return verts;
}

function makeCircleMesh(gl, radius, stfeps) {
  var mesh = new Mesh();
  
  var verts1 = gen_circle(mesh, new Vector3(), radius, stfeps);
  var verts2 = gen_circle(mesh, new Vector3(), radius/1.75, stfeps);
  mesh.make_face_complex(new GArray([verts1, verts2]));
  
  //mesh.make_face(verts1);
  
  return mesh;
}

function minmax_verts(verts) {
  var min = new Vector3([1e12, 1e12, 1e12]);
  var max = new Vector3([-1e12, -1e12, -1e12]);
  
  for (var v of verts) {
    for (var i=0; i<3; i++) {
      min[i] = Math.min(min[i], v.co[i]);
      max[i] = Math.max(max[i], v.co[i]);
    }
  }
  
  return [min, max];
}

function unproject(vec, ipers, iview) {
  var newvec = new Vector3(vec);
  
  newvec.multVecMatrix(ipers);
  newvec.multVecMatrix(iview); 
  
  return newvec;
}

function project(vec, pers, view) {
  var newvec = new Vector3(vec);
  
  newvec.multVecMatrix(pers);
  newvec.multVecMatrix(view); 
  
  return newvec;
}

var _sh_minv = new Vector3()
var _sh_maxv = new Vector3()
var _sh_start = []
var _sh_end = []
function spatialhash(init, cellsize) { //=new GArray(), cellsize=0.25)
  if (cellsize == undefined)
    cellsize = 0.25;
    
  this.cellsize = cellsize;
  this.shash = {};
  this.items = {};
  
  this.length = 0;
  
  this.hashlookup = function(x, y, z, create) {
    if (create == undefined) create = false;
    
    var h = this.hash(x, y, z)
    
    var b = this.shash[h];
    if (b == undefined) {
      if (!create) return null;
      
      var ret = {};
      this.shash[h] = ret;
      
      return ret;
    } else {
      return b;
    }
  }
  
  this.hash = function(x, y, z) {
    return z*125000000 + y*250000 + x; //x.toString()+"|"+y.toString()+"|"+z.toString();
  }
  
  this._op = function (item, mode) {
    var csize = this.cellsize;
    
    var minv = _sh_minv; minv.zero();
    var maxv = _sh_maxv; maxv.zero();
    
    if (item.type == MeshTypes.EDGE) {
      for (var i=0; i<3; i++) {
        minv[i] = Math.min(item.v1.co[i], item.v2.co[i]);
        maxv[i] = Math.max(item.v1.co[i], item.v2.co[i]);
      }
    } else if (item.type == MeshTypes.FACE) {
      //this class is only supposed to h&&le triangles, so just use first boundary loop
      var firstl = item.looplists[0].loop;
      var l = firstl;
      
      do {
        for (var i=0; i<3; i++) {
          minv[i] = Math.min(minv[i], l.v.co[i]);
          maxv[i] = Math.max(maxv[i], l.v.co[i]);
        }
        
        l = l.next;
      } while (l != firstl);
    } else if (item.type == MeshTypes.VERT) {
      minv.load(item.co);
      maxv.load(item.co);
    } else {
      console.trace()
      throw "Invalid type for spatialhash";
    }

    var start = _sh_start
    var end = _sh_end
    
    for (var i=0; i<3; i++) {
      start[i] = Math.floor(minv[i]/csize)
      end[i] = Math.floor(maxv[i]/csize)
    }

    for (var x=start[0]; x<=end[0]; x++) {
      for (var y=start[1]; y<=end[1]; y++) {
        for (var z=start[2]; z<=end[2]; z++) {
          var bset = this.hashlookup(x, y, z, true);
          
          if (mode == "a") {
            bset[item.__hash__()] = item;
          } else if (mode == "r"){ 
            delete bset[item.__hash__()];
          }
        }
      }
    }
  }
                      
  this.add = function(item) {
      this._op(item, "a")
      
      if (this.items[item.__hash__()] == undefined) {
        this.items[item.__hash__()] = item;
        this.length++;
      }
  }
     
  this.remove = function(item) {
      this._op(item, "r")
      
      delete this.items[item.__hash__()];
      this.length--;
  }
  
  this.__iterator__ = function() {
    return new obj_value_iter(this.items);
  }
  
  this.query_radius = function(co, radius) {
    var min = new Vector3(co).sub(new Vector3(radius, radius, radius));
    var max = new Vector3(co).add(new Vector3(radius, radius, radius));
    
    return this.query(min, max);
  }
  
  this.query = function(start, end) {
      var csize = this.cellsize;
      var minv = _sh_minv.zero();
      var maxv = _sh_maxv.zero();
      
      for (var i=0; i<3; i++) {
          minv[i] = Math.min(start[i], end[i]);
          maxv[i] = Math.max(start[i], end[i]);
      }
      
      var start = _sh_start
      var end = _sh_end
      
      for (var i=0; i<3; i++) {
        start[i] = Math.floor(minv[i]/csize)
        end[i] = Math.floor(maxv[i]/csize)
      }
      
      var ret = new set()

      for (var x=start[0]; x<=end[0]; x++) {
        for (var y=start[1]; y<=end[1]; y++) {
          for (var z=start[2]; z<=end[2]; z++) {
            var bset = this.hashlookup(x, y, z, false);

            if (bset != null) {
              for (var r of new obj_value_iter(bset)) {
                 ret.add(r);
              }
            }
          }
        }
      }
      
      return ret;
  }
  
  this.union = function(b) {
      var newh = new spatialhash();
      newh.cellsize = Math.min(this.cellsize, b.cellsize);
      
      for (var item of this) {
          newh.add(item)
      }
      
      for (var item of b) {
          newh.add(item)
      }
      
      return newh;
  }
  
  this.has = function(b) {
    return this.items[b.__hash__()] != undefined;
  }

  if (init != undefined) {
    for (var item of init) {
      this.add(item);
    }
  }
}

var static_cent_gbw = new Vector3();
function get_boundary_winding(points) {
  var cent = static_cent_gbw.zero();
  
  if (points.length == 0)
    return false; /*if no points, just return an arbitrary winding*/
    
  for (var i=0; i<points.length; i++) {
      cent.add(points[i]);
  }
  
  cent.divideScalar(points.length);
  
  var w = 0, totw=0;
  for (var i=0; i<points.length; i++) {
    var v1 = points[i];
    var v2 = points[(i+1) % points.length];
    
    if (!colinear(v1, v2, cent)) {
      w += winding(v1, v2, cent);
      totw += 1;
    }
  }
  
  if (totw > 0)
    w /= totw;
  
  return Math.round(w) == 1;
}

/*
  if (convex_quad(v1.co, v2.co, v3.co, v4.co)) {
    //make_tri_safe(m, v1, v2, v3);
    //make_tri_safe(m, v1, v3, v4);
  } else if (convex_quad(v1.co, v2.co, v4.co, v3.co)) {
    //make_tri_safe(m, v1, v2, v4);
    //make_tri_safe(m, v1, v4, v3);
  } else if (convex_quad(v2.co, v1.co, v3.co, v4.co)) {
    //make_tri_safe(m, v2, v1, v3);
    //make_tri_safe(m, v2, v3, v4);
  } else if (convex_quad(v2.co, v1.co, v4.co, v3.co)) {
    //make_tri_safe(m, v2, v1, v4);
   // make_tri_safe(m, v2, v4, v3);
  }
*/

/*2 dimensional operation class; note that this is too slow
  for use on large, real-time operations like tesselation of
  complex polygons*/
class PlaneOps {
  constructor(normal) {
    var no = normal;
    this.axis = [0, 0, 0];
    
    this.reset_axis(normal);
  }
  
  reset_axis(no) {
    var ax, ay, az;
    var nx=Math.abs(no[0]), ny=Math.abs(no[1]), nz=Math.abs(no[2]);
    
    if (nz > nx && nz > ny) {
      ax = 0; ay = 1; az = 2;
    } else if (nx > ny && nx > nz) {
      ax = 2; ay = 1; az = 0;
    } else {
      ax = 0; ay = 2; az = 1;
    }
    
    this.axis = [ax, ay, az];
  }
  
  convex_quad(v1, v2, v3, v4) {
    var ax = this.axis;
    
    v1 = new Vector3([v1[ax[0]], v1[ax[1]], v1[ax[2]]]);
    v2 = new Vector3([v2[ax[0]], v2[ax[1]], v2[ax[2]]]);
    v3 = new Vector3([v3[ax[0]], v3[ax[1]], v3[ax[2]]]);
    v4 = new Vector3([v4[ax[0]], v4[ax[1]], v4[ax[2]]]);
    
    return convex_quad(v1, v2, v3, v4);
  }
  
  line_isect(Array<float> v1, Array<float> v2, 
             Array<float> v3, Array<float> v4) : Array<float> 
  {
    var ax = this.axis;
    var orig1=v1, orig2=v2;
    
    v1 = new Vector3([v1[ax[0]], v1[ax[1]], v1[ax[2]]]);
    v2 = new Vector3([v2[ax[0]], v2[ax[1]], v2[ax[2]]]);
    v3 = new Vector3([v3[ax[0]], v3[ax[1]], v3[ax[2]]]);
    v4 = new Vector3([v4[ax[0]], v4[ax[1]], v4[ax[2]]]);
    
    var ret = line_isect(v1, v2, v3, v4, true);
    var vi = ret[0];
    
    if (ret[1] == LINECROSS) {
      ret[0].load(orig2).sub(orig1).mulScalar(ret[2]).add(orig1);
    }
    
    return ret;
  }
  
  line_line_cross(l1, l2) {
    var ax = this.axis;
    
    var v1=l1[0], v2=l1[1], v3=l2[0], v4=l2[1];
    v1 = new Vector3([v1[ax[0]], v1[ax[1]], 0.0]);
    v2 = new Vector3([v2[ax[0]], v2[ax[1]], 0.0]);
    v3 = new Vector3([v3[ax[0]], v3[ax[1]], 0.0]);
    v4 = new Vector3([v4[ax[0]], v4[ax[1]], 0.0]);
    
    return line_line_cross([v1, v2], [v3, v4]);
  }
  
  winding(v1, v2, v3) {
    var ax = this.axis
    
    if (v1 == undefined)
      console.trace();
      
    v1 = new Vector3([v1[ax[0]], v1[ax[1]], 0.0]);
    v2 = new Vector3([v2[ax[0]], v2[ax[1]], 0.0]);
    v3 = new Vector3([v3[ax[0]], v3[ax[1]], 0.0]);
    
    return winding(v1, v2, v3);
  }

  colinear(v1, v2, v3) {
    var ax = this.axis
    
    v1 = new Vector3([v1[ax[0]], v1[ax[1]], 0.0]);
    v2 = new Vector3([v2[ax[0]], v2[ax[1]], 0.0]);
    v3 = new Vector3([v3[ax[0]], v3[ax[1]], 0.0]);
    
    return colinear(v1, v2, v3);
  }
  
  get_boundary_winding(points) {
    var ax = this.axis
    var cent = new Vector3();
    
    if (points.length == 0)
      return false; /*if no points, just return an arbitrary winding*/
      
    for (var i=0; i<points.length; i++) {
        cent.add(points[i]);
    }
    
    cent.divideScalar(points.length);
    
    var w = 0, totw=0;
    for (var i=0; i<points.length; i++) {
      var v1 = points[i];
      var v2 = points[(i+1) % points.length];
      
      if (!this.colinear(v1, v2, cent)) {
        w += this.winding(v1, v2, cent);
        totw += 1;
      }
    }
    
    if (totw > 0)
      w /= totw;
    
    return Math.round(w) == 1;
  }
}

var _isrp_ret = new Vector3();
function isect_ray_plane(planeorigin, planenormal, rayorigin, raynormal)
{
  var p = planeorigin, n = planenormal;
  var r = rayorigin, v = raynormal;
  var d = p.vectorLength();
  
  var t = -(r.dot(n) - p.dot(n)) / v.dot(n);
  
  _isrp_ret.load(v);
  _isrp_ret.mulScalar(t);
  _isrp_ret.add(r);
  
  return _isrp_ret;
}

function mesh_find_tangent(mesh, viewvec, offvec, projmat, verts) //verts is optional
{
  if (verts == undefined) 
    verts = mesh.verts.selected;
  
  var vset = new set();
  var eset = new set();
  
  for (var v of verts) {
    vset.add(v);
  }
  
  for (var v of vset) {
    for (var e of v.edges) {
      if (vset.has(e.other_vert(v))) {
        eset.add(e);
      }
    }
  }
  
  if (eset.length == 0) {
    return new Vector3(offvec);
  }
  
  var tanav = new Vector3();
  var evec = new Vector3();
  var tan = new Vector3();
  var co2 = new Vector3();
  
  for (var e of eset) {
    evec.load(e.v1.co).multVecMatrix(projmat);
    co2.load(e.v2.co).multVecMatrix(projmat);
    evec.sub(co2);
    
    evec.normalize();
    
    tan[0] = evec[1];
    tan[1] = -evec[0];
    tan[2] = 0.0;
    
    if (tan.dot(offvec) < 0.0)
      tan.mulScalar(-1.0);
    
    tanav.add(tan);
  }
  
  tanav.normalize();
  
  return tanav;
}

class Mat4Stack {
  constructor() {
    this.stack = []
    this.matrix = new Matrix4();
    this.matrix.makeIdentity();
    this.update_func = undefined;
  }

  set_internal_matrix(Matrix4 mat, update_func) {
    this.update_func = update_func;
    this.matrix = mat;
  }

  reset(Matrix4 mat) {
    this.matrix.load(mat);
    this.stack = [];
    
    if (this.update_func != undefined)
      this.update_func();
  }

  load(Matrix4 mat) {
    this.matrix.load(mat);
    if (this.update_func != undefined)
      this.update_func();
  }

  multiply(Matrix4 mat) {
    this.matrix.multiply(mat);
    if (this.update_func != undefined)
      this.update_func();
  }

  identity() {
    this.matrix.loadIdentity();
    if (this.update_func != undefined)
      this.update_func();
  }

  //mat2 is optional
  push(mat2) {
    this.stack.push(new Matrix4(this.matrix));
    
    if (mat2 != undefined) {
      this.matrix.load(mat2);
      
      if (this.update_func != undefined)
        this.update_func();
    }
  }

  pop() {
    var mat = this.stack.pop(this.stack.length-1);
    this.matrix.load(mat);
    
    if (this.update_func != undefined)
      this.update_func();
    
    return mat;
  }
}

//little subsystem to create Vector3's backed
//with typed array views.  possibly stupid.
class WrapperVecPool {
  constructor(nsize, psize=512, nsize=3) {
    this.pools = [];
    this.cur = 0;
    this.psize = psize;
    this.bytesize = 4;
    this.nsize = nsize;
    
    this.new_pool();
  }
  
  new_pool() {
    var pool = new Float32Array(this.psize*this.nsize);
    this.pools.push(pool);
    this.cur = 0;
  }
  
  get() {
    if (this.cur >= this.psize)
      this.new_pool();
    
    var pool = this.pools[this.pools.length-1];
    var n = this.nsize;
    var cur = this.cur;
    var bs = this.bytesize;
    
    var view = new Float32Array(pool.buffer, Math.floor(cur*n*bs), n);
    this.cur++;
    
    return new WVector3(view);
  }
}

var test_vpool = new WrapperVecPool();

class WVector3 extends Vector3 {
  constructor(view, arg=undefined) {
    super(arg);
    this.view = view;
  }
  
  get 0() {
    return this.view[0];
  }
  set 0(n) {
    this.view[0] = n;
  }
  get 1() {
    return this.view[1];
  }
  set 1(n) {
    this.view[1] = n;
  }
  get 2() {
    return this.view[2];
  }
  set 2(n) {
    this.view[2] = n;
  }
}

var cos = Math.cos;
var sin = Math.sin;

function rot2d(vec, A, axis=0) {
  var x = vec[0];
  var y = vec[1];
  
  if (axis == 1) {
    vec[0] = x * cos(A) + y*sin(A);
    vec[1] = y * cos(A) - x*sin(A);
  } else {
    vec[0] = x * cos(A) - y*sin(A);
    vec[1] = y * cos(A) + x*sin(A);
  }
  
  return vec;
}
