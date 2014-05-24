"use strict";

/*
  manipulator widget system, not just for grab, rotate, scale,
  but also extrude, inset, etc.
*/

var ManipFlags = {
};

var HandleShapes = {
  ARROW         : 0,
  HAMMER        : 1,
  ROTCIRCLE     : 2,
  SIMEPL_CIRCLE : 3
};

var _manip_shapes = [
  manip_arrow_shape
];

var _manip_cache = {};
var _mh_idgen = 1;

class ManipHandle {
  Vector3 v1, v2;
  Object id;
  Matrix4 matrix;
  Mesh mesh;
  View3DHandler view3d;
  int shape, _hid;
  
  constructor(Vector3 v1, Vector3 v2, Object id, int shape, view3d, Array<float> clr) {
    this.id = id;
    this._hid = _mh_idgen++;
    this.shape = shape;
    this.v1 = v1;
    this.v2 = v2;
    this.color = clr;
    this.matrix = new Matrix4();
    this.recalc = 1;
    
    //rotation circles will have to generate multiple lines
    this.lines = new GArray([[new Vector3(v1), new Vector3(v2)]]);
    this.mesh = undefined;
    this._objdummy = new ASObject();
    
    this.co = new Vector3(v1);
    this.normal = new Vector3(v1).sub(v2);
    this.normal.normalize();
    
    this.gen_matrix(view3d);
  }
  
  __hash__() {
    return "MH" + this._hid.toString;
  }
  
  gen_matrix(view3d) {
    this.view3d = view3d;
    
    static axis = new Vector3([0, 0, 1]);
    var n = new Vector3(this.normal);
    var c = new Vector3(this.co);
    
    var angle = Math.PI - Math.acos(axis.dot(n));
    if (angle == 0) return;
    
    n.cross(axis);
    n.normalize();
    
    var q = new Quat();
    q.axisAngleToQuat(n, angle);
    
    var mat = q.toMatrix();
    //mat.scale(-1, -1, -1);
    
    this.matrix = mat;
    this._objdummy.matrix = this.matrix;
  }
  
  gen_buffers(gl, view3d) {
    this.view3d = view3d;
    
    if (this.mesh == undefined)
      this.load_shape();
    
    if (this.mesh != undefined)
      this.mesh.regen_render();
  }
  
  on_draw(gl, view3d) {
    this.view3d = view3d;
    
    this._objdummy.data = this.mesh;
    
    this.gen_matrix(view3d);
    this.mesh.regen_render();
    view3d.transmat.push();
    view3d.transmat.multiply(this.matrix);
    view3d.draw_object_flat(gl, this._objdummy, this.color);
    view3d.transmat.pop();
  }
  
  load_shape() {
    if (this.shape in _manip_cache) {
      this.mesh = _manip_cache[this.shape];
      return;
    }
    
    var mesh = new Mesh();
    Mesh.from_b64(mesh, _manip_shapes[this.shape]);
    
    _manip_cache[this.shape] = mesh;
    this.mesh = mesh;
    mesh.gen_render_struct();
  }
  
  on_gl_lost(new_gl) {
    this.mesh = undefined;
    this.load_shape();
  }
}

//okay.  should modal tool ops drive the manipulator positions, or should
//the manipulator code drive modal tool ops? yeesh.  I think maybe the former
//is the way to go.

var _mh_idgen_2 = 1;
var _mp_first = true;

class Manipulator {
  Array<Array<ManipHandle>> handles; //line grab points
  Matrix4 matrix, projmat, _matrix;
  Manipulator parent;
  Object user_data;
  int flag, recalc, _hid;
  
  constructor(Array<Array<ManipHandle>> handles, on_click, on_tick) {
    this._hid = _mh_idgen_2++;
    this.handles = new GArray(handles);
    this.matrix = new Matrix4();
    this._matrix = new Matrix4(); //temp matrix
    this.projmat = undefined;
    this.recalc = 1;
    this.parent = undefined;
    this.user_data = undefined;
    
    //callback is called on mouse down.  presumably.
    //manipulator is passed to callback.
    this.on_click = on_click;
    this.on_tick = on_tick;
    this.handle_size = 65;
    this.cur_z = 0;
    this.camoff = new Vector3();
  }
  
  __hash__() {
    return "MP" + this._hid.toString;
  }
  
  end() {
    this.parent.remove(this);
  }
  
  gen_buffers(WebGLRenderingContext gl, view3d) {
    for (var h in this.handles) {
      h.gen_buffers();
    }
  }
 
  on_draw(WebGLRenderingContext gl, view3d) {
    if (this.recalc)
      this.gen_buffers(gl, view3d);
    
    var co = new Vector3();
    //co.multVecMatrix(this.matrix);
    var origco = new Vector3(co);
    
    var pmat = new Matrix4(view3d.drawmats.rendermat);
    pmat.multiply(this.matrix);
    
    var imat = new Matrix4(pmat);
    imat.invert();
    
    //at what z would a screen-aligned unit vector be size pixels long
    //figure out current screen size of unit vector at co
    var co1 = new Vector3(co);
    co1.multVecMatrix(pmat);
    
    var sco = new Vector3([0.1, 0, co1[2]]);
    sco.multVecMatrix(imat);
    sco.normalize();
    
    var co2 = new Vector3(co).add(sco);
    co2.multVecMatrix(pmat);
    
    var hsize = this.handle_size;
    var size = co1.vectorDistance(co2);
    var psize = hsize/(view3d.size[0]);

    //now scale w by desired pixel width weighted
    //by *existing* pixel width
    var w = co1.multVecMatrix(imat);
    w *= (psize/size)*2.0;
    
    //find screen z such that unit vector at this.matrix origin is this.handle_size pixels wide
    var x=co1[0], y=co1[1];
    var z = -(imat.$matrix.m44 + x*imat.$matrix.m14 + y*imat.$matrix.m24 - w) / imat.$matrix.m34;
    this.cur_z = z;
    
    if (_mp_first) {
      console.log("size", size, "psize", psize, size/psize, psize/size);
      console.log("z, ", z, "w, ", w, imat.$matrix.m34, imat.$matrix.m44);
      console.log(x, y, z, w);
      console.log("sco[2]", co1[2]);
      console.log("expr", imat.$matrix.m44, w);
    }
    
    //project, apply screen z, then unproject
    co.multVecMatrix(pmat);
    co[2] = z;
    co.multVecMatrix(imat);
    
    if (_mp_first) {
      console.log("co", co);
      _mp_first = false;
    }
    
    co.sub(origco);
    this.camoff.load(co);

    this._matrix.load(this.matrix);
    this._matrix.translate(co[0], co[1], co[2]);
    
    view3d.transmat.push()
    view3d.transmat.multiply(this._matrix);
    
    for (var h in this.handles) {
      h.on_draw(gl, view3d);
    }
    
    view3d.transmat.pop();
  }
  
  arrow(normal, id, clr=[1, 1, 1, 0.5]) {
    normal = new Vector3(normal);
    normal.normalize();
    
    var h = new ManipHandle(new Vector3(), normal, id, HandleShapes.ARROW, this.view3d, clr);
    this.handles.push(h);
  }
  
  /*returns true if handle hit*/
  do_select(MouseEvent event, view3d) : Boolean {
    this.view3d = view3d;
    var mpos = new Vector3([event.x, event.y, 0]);
    
    var limit = IsMobile ? 20 : 15;
    var min = undefined;
    var handle = undefined;
    var pmat = view3d.drawmats.rendermat;
    var imat = new Matrix4(pmat);
    
    imat.invert();
    
    var v1 = new Vector3(), v2 = new Vector3(), n = new Vector3();
    for (var h in this.handles) {
      for (var l in h.lines) {
        v1.load(l[0]);
        v2.load(l[1]);
        
        v1.multVecMatrix(this._matrix);
        v2.multVecMatrix(this._matrix);
        
        //set screen z so that v1/v2 (which are typicall unit vectors
        //or make up a unit circle) are h.handle_size pixels big
        //we calculated and cached this in draw.
        /*v1.multVecMatrix(pmat);
        v2.multVecMatrix(pmat);
        v1[2] += this.cur_z;
        v2[2] += this.cur_z;
        v1.multVecMatrix(imat);
        v2.multVecMatrix(imat);
        */
        //now do final projection
        this.view3d.project(v1);
        this.view3d.project(v2);
        
        var d = dist_to_line_v2(mpos, v1, v2);
        console.log("d", d, l, h.lines);
        console.log("v1", v1);
        console.log("v2", v2);
        
        if (d < limit && handle == undefined || d < min) {
          handle = h;
          min = d;
        }
      }
    }
    
    if (handle != undefined) {
      console.log("found handle: ", handle.id);
      if (this.on_click)
        this.on_click(this, handle.id);
      
      return true;
    }
    
    console.log("in manipulator.do_select", min, handle);
    return false;
  }
  
  on_gl_lost(WebGLRenderingContext new_gl) {
    //clear dead cache
    _manip_cache = {};
    
    for (var h in this.handles) {
      h.on_gl_lost(new_gl);
    }
  }
}

class ManipulatorManager {
  GArray stack = new GArray();
  View3DHandler view3d;
  Manipulator active;
  
  constructor(view3d) {
    this.view3d = view3d;
  }
  
  on_draw(gl, view3d) {
    gl.disable(gl.DEPTH_TEST);
    
    if (this.active != undefined) {
      this.active.on_draw(gl, view3d);
    }
    
    gl.enable(gl.DEPTH_TEST);
  }
  
  remove(mn) {
    if (mn == this.active) {
      this.pop();
    } else {
      this.stack.remove(mn);
    }
  }
  
  push(mn) {
    mn.parent = this;
    
    this.stack.push(this.active);
    this.active = mn;
  }
  
  pop() {
    var ret = this.active;
    this.active = this.stack.pop(-1);
  }
  
  do_select(MouseEvent event, View3DHandler view3d) : Boolean {
    return this.active != undefined ? this.active.do_select(event, view3d) : undefined;
  }
  
  create(do_push = true) {
    var mn = new Manipulator([]);
    mn.parent = this;
    if (do_push)
      this.push(mn);
    
    return mn;
  }
  
  on_tick() {
    if (this.active != undefined && this.active.on_tick != undefined)
      this.active.on_tick(this.active);
  }
  
  arrow(normal, id, clr, do_push=true) {
    normal = new Vector3(normal);
    normal.normalize();
    
    var h = new ManipHandle(new Vector3(), normal, id, HandleShapes.ARROW, this.view3d, clr);
    var mn = new Manipulator([h]);
    mn.parent = this;
    
    if (do_push)
      this.push(mn);
    
    return mn;
  }
}
