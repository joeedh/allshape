"use strict";

#include "src/core/utildefine.js"

//we keep track of any canvases with non-GC managed data, 
//(gl objects, TriListAlloc, TA_Alloc, etc) to avoid reference leaks
//g_app_state.reset calls .destroy() on all canvases inside this list.
//(then resets it back to {}).
var active_canvases = {};

var _canvas_draw_id = 1;

//disable use of theoretically faster typed array allocator,
//for now.

//#ifdef NOCACHE

#define F32ALLOC(verts) new Float32Array(verts);
#define F32FREE(verts) verts = undefined;

/*#else
#define F32ALLOC(verts123) f32_alloc.from_array(verts123);
#define F32FREE(verts123) if (verts123 != undefined) { f32_alloc.free(verts123); verts123 = undefined;}
#endif
*/

// 
//

//stupid statics
var _trilist_n0 = new Vector3(); var _trilist_n1 = new Vector3()
var _trilist_n2 = new Vector3(); var _trilist_n3 = new Vector3()
var _trilist_v1 = new Vector3(); var _trilist_v2 = new Vector3()
var _trilist_v3 = new Vector3(); var _trilist_v4 = new Vector3()
var _trilist_c1 = new Vector4(); var _trilist_c2 = new Vector4()
var _trilist_c3 = new Vector4(); var _trilist_c4 = new Vector4()
var _trilist_v5 = new Vector3(); var _trilist_v6 = new Vector3();
var _trilist_v7 = new Vector3(); var _trilist_v8 = new Vector3();
var _trilist_v9 = new Vector3();

#define TRILIST_CACHE_SIZE 8192

/*I hate garbage collected languages.  Bleh!  This class
  is necessary to avoid object allocations within draw frames.
  evil!*/
class TriListAlloc {
  constructor() {
    this.freelist = [];
    this.freecount = 0;
    this.usedcount = 0;
  }
  
  alloc(UICanvas canvas, Boolean use_small_icons=false) : TriList {
    #ifdef NOCACHE
    return new TriList(canvas, use_small_icons);
    #endif
    
    if (this.freecount == 0) {
      console.log("making new trilist object", this.usedcount, this.freecount, this.freelist.length);
      
      //ensure a saturated cache
      if (this.usedcount == 0) {
        for (var i=0; i<TRILIST_CACHE_SIZE; i++) {
          var tl = new TriList(canvas, use_small_icons);
          tl.cache_destroy();
          this.freelist.push(tl);
          this.freecount++;
        }
        
        console.log("------------>|", this.freelist.length, this.freecount, this.usedcount);
      }
      
      this.usedcount++;
      return new TriList(canvas, use_small_icons);
    } else {
      //console.log("using cached trilist", this.freecount, this.freelist.length);
      var ret = this.freelist.pop();
      
      ret.cache_init(canvas, use_small_icons);
      
      this.freecount--;
      this.usedcount++;
      
      return ret;
    }
  }
  
  free(TriList trilist) {
    this.usedcount--;
    
    #ifdef NOCACHE
    trilist.cache_destroy();
    return;
    #endif
    
    //abandon trilist to the GC
    if (this.freecount >= TRILIST_CACHE_SIZE) 
      return;
    
    trilist.cache_destroy();
    
    this.freelist.push(trilist);
    this.freecount++;
  }
}

var _talloc = new TriListAlloc();

class TriList {
  cache_destroy() {
    this._free_typed();
    
    this.verts.length = 0;
    this.texcos.length = 0;
    this.colors.length = 0;
    this.tottri = 0;
    
    //this.canvas = undefined;
    //this.iconsheet = undefined;
    //this.viewport = undefined;
    
    this._dead = true;
  }
  
  _free_typed() {
    //f32free sets vertbuf/colorbuf/texbuf to undefined
    F32FREE(this.vertbuf);
    F32FREE(this.colorbuf);
    F32FREE(this.texbuf);
  }
  
  cache_init(UICanvas canvas, Boolean use_small_icons=false) {
    this._dead = false;
    this.global_matrix = canvas.global_matrix;
    this.use_tex = 1;
    this.tex = 0 : WebGLTexture;
    this.iconsheet = use_small_icons ? g_app_state.raster.iconsheet16 : g_app_state.raster.iconsheet;
    this.small_icons = use_small_icons;
    
    this.verts.length = 0;
    this.colors.length = 0;
    this.texcos.length = 0;
    
    this.recalc = 1
    this.tottri = 0;
    this.canvas = canvas
    this.spos = undefined : Array<float>;
    this.ssize = undefined : Array<float>;
    this.gl_spos = undefined : Array<float>;
    this.gl_ssize = undefined : Array<float>;
    this.viewport = canvas != undefined ? canvas.viewport : undefined;
  }
  
  constructor(UICanvas canvas, Boolean use_small_icons=false) {
    this._id = _canvas_draw_id++;
    
    this.global_matrix = canvas.global_matrix;
    this.verts = [];
    this.colors = [];
    this.texcos = [];
    
    this._dead = false;
    
    this.vertbuf = undefined;
    this.colorbuf = undefined;
    this.texbuf = undefined;
    
    this.use_tex = 1;
    this.tex = 0 : WebGLTexture;
    this.iconsheet = use_small_icons ? g_app_state.raster.iconsheet16 : g_app_state.raster.iconsheet;
    this.small_icons = use_small_icons;
    
    this.recalc = 1
    this.tottri = 0;
    this.canvas = canvas
    this.spos = undefined : Array<float>;
    this.ssize = undefined : Array<float>;
    this.gl_spos = undefined : Array<float>;
    this.gl_ssize = undefined : Array<float>;
    this.viewport = canvas != undefined ? canvas.viewport : undefined;
  }

  add_tri(Array<float> v1, Array<float> v2, Array<float> v3, 
          Array<float> c1, Array<float> c2, Array<float> c3,
          Array<float> t1, Array<float> t2, Array<float> t3) 
  {
    var vs = this.verts;
    this.tottri++;
    
    static v12 =  new Vector3();
    static v22 =  new Vector3();
    static v32 =  new Vector3();
    
    v12.loadxy(v1); v22.loadxy(v2); v32.loadxy(v3);
    v1 = v12; v2 = v22; v3 = v32;
    
    this.transform(v1); this.transform(v2); this.transform(v3);
    
    vs.push(v1[0]); vs.push(v1[1]); vs.push(v1[2]); 
    vs.push(v2[0]); vs.push(v2[1]); vs.push(v2[2]); 
    vs.push(v3[0]); vs.push(v3[1]); vs.push(v3[2]);
    
    var cs = this.colors
    
    if (c2 == undefined) {
      c2 = c1;
      c3 = c1;
    }
    
    cs.push(c1[0]); cs.push(c1[1]); cs.push(c1[2]); cs.push(c1[3]);
    cs.push(c2[0]); cs.push(c2[1]); cs.push(c2[2]); cs.push(c2[3]);
    cs.push(c3[0]); cs.push(c3[1]); cs.push(c3[2]); cs.push(c3[3]);
    
    if (this.use_tex) {
      if (t1 == undefined) {
        static negone = [-1, -1];
        t1 = t2 = t3 = negone;
      }
      
      var ts = this.texcos
      ts.push(t1[0]); ts.push(t1[1]); ts.push(t2[0]); ts.push(t2[1]);
      ts.push(t3[0]); ts.push(t3[1])
    }
  }
  
  add_quad(Vector3 v1, Vector3 v2, Vector3 v3, Vector3 v4,
                           Array<float> c1,Array<float> c2,Array<float> c3,
                           Array<float> c4,Array<float> t1,Array<float> t2,
                           Array<float> t3,Array<float> t4)
  {
    this.add_tri(v1, v2, v3, c1, c2, c3, t1, t2, t3);
    this.add_tri(v1, v3, v4, c1, c3, c4, t1, t3, t4);
  }
  
  icon_quad(int icon, Vector3 pos, float alpha=1.0)
  {
    static tcos = new Array(0);
    static clr = [1.0, 1.0, 1.0, 1.0];
    clr[3] = alpha;
    
    var cw = this.iconsheet.cellsize[0], ch = this.iconsheet.cellsize[1];
    
    var v1 = new Vector3([pos[0], pos[1], 0.0]);
    var v2 = new Vector3([pos[0], pos[1]+ch, 0.0]);
    var v3 = new Vector3([pos[0]+cw, pos[1]+ch, 0.0]);
    var v4 = new Vector3([pos[0]+cw, pos[1], 0.0]);
    
    tcos.length = 0;
    this.iconsheet.gen_tile(icon, tcos);
    
    var t1 = new Vector3([tcos[0], tcos[1], 0]);
    var t2 = new Vector3([tcos[2], tcos[3], 0]);
    var t3 = new Vector3([tcos[4], tcos[5], 0]);
    var t4 = new Vector3([tcos[6], tcos[7], 0]);
    var t5 = new Vector3([tcos[8], tcos[9], 0]);
    var t6 = new Vector3([tcos[10], tcos[11], 0]);
    
    this.add_tri(v1, v2, v3, clr, clr, clr, t1, t2, t3);
    this.add_tri(v1, v3, v4, clr, clr, clr, t4, t5, t6);
  }
  
  transform(v) {
    static transvec = new Vector3();
    
    transvec[0] = v[0];
    transvec[1] = v[1];
    transvec[2] = 0.0;
    
    transvec.multVecMatrix(this.canvas.transmat);
    
    v[0] = (transvec[0]/this.viewport[1][0])*2.0 - 1.0;
    v[1] = (transvec[1]/this.viewport[1][1])*2.0 - 1.0;
  }
  
  line(v1, v2, c1, c2=undefined, width=undefined) { //c2 and width are optional
    if (c2 == undefined) {
      c2 = c1;
    }
    
    if (v1.length == 2) v1.push(0);
    if (v2.length == 2) v2.push(0);
    
    this.line_strip(CACHEARR2(CACHEARR2(v1, v2), CACHEARR2(c1, c2)), undefined, width);
    //this.line_strip(objcache.getarr(objcache.getarr(v1, v2), objcache.getarr(c1, c2)), undefined, width);
  }
  
  line_strip(lines, colors, texcos=undefined, width=2.0, half=false) {
    static black = new Vector4([0.0, 0.0, 0.0, 1.0]);
    
    static v0 = new Vector3(), v1 = new Vector3(), v2 = new Vector3();
    static v3 = new Vector3(), v4 = new Vector3(), n0 = new Vector3();
    static n1 = new Vector3(), n2 = new Vector3(), c3 = new Vector3();
    static c4 = new Vector3();

    for (var i =0; i<lines.length; i++) {
      var lc1 = colors[i][0], lc2 = colors[i][1];
      
      //if (lines[i][0].length == 2) lines[i][0].push(0);
      //if (lines[i][1].length == 2) lines[i][1].push(0);
      if (lc1 == undefined) lc1 = black;
      if (lc2 == undefined) lc2 = black;
      
      var z = 0.0;

      v1.loadxy(lines[i][0])
      v2.loadxy(lines[i][1])
      
      n0.zero(); n1.zero(); n2.zero();
      
      v1.loadxy(lines[i][1]);
      v1.sub(lines[i][0]);
      v1.normalize();
      
      n1[0] = v1[1];
      n1[1] = -v1[0];
      n1[2] = z;
      n1.normalize()
      
      if (i > 0) {
        v0.loadxy(lines[i-1][1]);
        v0.sub(lines[i-1][0])
        v0.normalize();
        
        n0[0] = v0[1];
        n0[1] = -v0[0];
        n0[2] = z;
        n0.normalize()
      } else {
        n0.load(n1);
      }
      
      v1.loadxy(lines[i][1]);
      v1.sub(lines[i][0])
      
      if (i < lines.length-1) {
        v3.loadxy(lines[i+1][1]);
        v3.sub(lines[i+1][0]);
        v3.normalize();
        
        n2[0] = v3[1];
        n2[1] = -v3[0];
        n2[2] = z;
        n2.normalize()
      } else {
        n2.load(n1);
      }
      
      /*
      n0.normalize();
      n1.normalize();
      n2.normalize();
      
      n0.mulScalar(0.5);
      n1.mulScalar(0.5);
      n2.mulScalar(0.5);
      */
      
      n2.add(n1).normalize();
      n1.add(n0).normalize();
      
      n1.mulScalar(width*0.5);
      n2.mulScalar(width*0.5);
      
      v0.loadxy(lines[i][0]);
      v1.loadxy(lines[i][1]);
      
      v2.loadxy(lines[i][1]);
      v2.add(n1);
      v3.loadxy(lines[i][0]);
      v3.add(n2);
      
      var c1 = _trilist_c1.load(lc1); var c2 = _trilist_c2.load(lc2);
      var c3 = _trilist_c3.load(lc2); var c4 = _trilist_c4.load(lc1);
      
      c3[3] = 0.0; c4[3] = 0.0;
      n1.mulScalar(2.0);
      n2.mulScalar(2.0);
      
      if (this.use_tex && texcos) { 
        if (!half)
          this.add_quad(v0, v1, v2, v3, c1, c2, c3, c4, texcos[i][0], 
                      texcos[i][1], texcos[i][0], texcos[i][1]);
          this.add_quad(v1, v0, v3.sub(n1), v2.sub(n2), c2, c1, c3, c4, texcos[i][0], 
                      texcos[i][1], texcos[i][0], texcos[i][1]);
      } else {
        if (!half)
         this.add_quad(v0, v1, v2, v3, c1, c2, c3, c4);
        this.add_quad(v1, v0, v3.sub(n2), v2.sub(n1), c2, c1, c3, c4);
      }
      
    }
  }
  
  destroy(Boolean only_gl=false) {
    var gl = g_app_state.gl;
    
    if (this.vbuf) {
      gl.deleteBuffer(this.vbuf);
      gl.deleteBuffer(this.cbuf);
    }
    
    if (this.tbuf) {
      gl.deleteBuffer(this.tbuf);
    }  
    
    
    this.vbuf = this.cbuf = this.tbuf = undefined;
    this.recalc = 1;
    
    this._free_typed();
    
    if (!only_gl) {
      this._dead = true;
      _talloc.free(this);
    }
  }
  
  gen_buffers(gl) {
    if (this.verts.length == 0)
      return;
      
    this.destroy(true);
    this._free_typed();
    
    this._dead = false;
    
    this.vertbuf = F32ALLOC(this.verts); //new Float32Array(this.verts)
    this.colorbuf = F32ALLOC(this.colors); //new Float32Array(this.colors)
    if (this.use_tex)
      this.texbuf = F32ALLOC(this.texcos); //new Float32Array(this.texcos);
    
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    
    if (this.use_tex)
      gl.enableVertexAttribArray(2);
    else
      gl.disableVertexAttribArray(2);
          
    var vbuf = gl.createBuffer();    
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertbuf, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);

    var cbuf = gl.createBuffer();    
    gl.bindBuffer(gl.ARRAY_BUFFER, cbuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.colorbuf, gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, cbuf);

    if (this.use_tex) {
      var tbuf = gl.createBuffer();    
      gl.bindBuffer(gl.ARRAY_BUFFER, tbuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.texbuf, gl.STATIC_DRAW);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, tbuf);
      this.tbuf = tbuf
    }    
    this.vbuf = vbuf;
    this.cbuf = cbuf;
    
    gl.disableVertexAttribArray(1);
    gl.disableVertexAttribArray(2);

    this.recalc = 0;
  }
  
  on_draw(gl) {
    if (!this.iconsheet.ready)
      return;
    
    //if (this._dead)
    //  return;
    
    if (this.verts.length == 0)
      return;
    
    if (this.recalc || (this.tdrawbuf != undefined && this.tdrawbuf.is_dead)) {
      this.gen_buffers(gl);
    }
    
    if (this.ssize != undefined) {
      gl.enable(gl.SCISSOR_TEST);
      g_app_state.raster.push_scissor(this.spos, this.ssize);
    }
    
    gl.disable(gl.DEPTH_TEST);
    
    gl.enable(gl.BLEND);
    gl_blend_func(gl);
    
    //gl.blendEquation(gl.BLEND_EQUATION);
    //gl.blendEquationSeparate(gl.BLEND_EQUATION, gl.BLEND_EQUATION);
    
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.disableVertexAttribArray(3);
    gl.disableVertexAttribArray(4);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuf);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuf);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.cbuf);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cbuf);

    if (this.use_tex) {
      gl.enableVertexAttribArray(2);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.tbuf);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.tbuf);
    } else {
      gl.disableVertexAttribArray(2);
    } 
    
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.iconsheet.tex);

    gl.useProgram(gl.basic2d.program);
    
    this.global_matrix.setUniform(gl, gl.basic2d.uniformloc(gl, "mat"));
    gl.uniform1i(gl.basic2d.uniformloc(gl, "iconsampler"), 4);
    
    //console.log(this.verts);
    //console.log(this.tottri*3, this.verts.length/3, this.colors.length/4, this.verts[0], this.verts[1], this.verts[2])
    gl.drawArrays(gl.TRIANGLES, 0,this.tottri*3);
    
    gl.disableVertexAttribArray(1);
    gl.disableVertexAttribArray(2);
    
    gl.enable(gl.DEPTH_TEST);
    
    if (this.ssize != undefined) {
      g_app_state.raster.pop_scissor();
    }
  }
}

/*
var MAX_TRILIST_CACHE = 512;
var _trilist_frame_counter = 0;
var _trilist_template = {obj : new TriList(undefined, undefined), cachesize : MAX_TRILIST_CACHE};

function _reset_trilist_frame_counter() {
  _trilist_frame_counter = 0;
}

function _new_trilist(UICanvas canvas) {
  if (_trilist_frame_counter = 0 >= MAX_TRILIST_CACHE) {
    return new TriList(canvas);
  } else {
    var list = objcache.fetch(_trilist_template)
    TriList.call(list, canvas);
  }
}

function _save_trilist(TriList trilist) {
  if (objcache.is_cache_obj(trilist)) {
    objcache.cache_remove(trilist);
  }
}
*/

class TextDraw {
  constructor(pos, text, color, spos, ssize, viewport, size, scale, global_matrix, rot=0) {
    this._id = _canvas_draw_id++;
    
    this.rot = rot;
    this.global_matrix = global_matrix;
    this.text = text;
    this.pos = [pos[0], pos[1], pos[2]];
    this.color = color;
    this.tdrawbuf = undefined : TextDrawBuffer;
    this.spos = spos;
    this.ssize = ssize;
    this.asp = viewport[1][1] / viewport[1][0];
    this.viewport = viewport;
    this.scale = [scale[0], scale[1], 0];
    this.size = size;
    this.raster = g_app_state.raster;
    
    var mat = new Matrix4();
    mat.translate(this.pos[0], this.pos[1], 0.0);
    
    //denormalize to avoid squashed rotations
    mat.scale(1, 1.0/this.asp, 1);
    
    mat.rotate(0, 0, rot);
    mat.scale(this.scale);
    
    //norrmalize again
    mat.scale(1, this.asp, 1);
    
    this.mat = mat;
  }
  
  destroy() {
    /*don't destroy the gl buffers here, since I'm
      now caching them*/
    /*
    if (this.tdrawbuf != undefined)
      this.tdrawbuf.destroy();
    this.tdrawbuf = undefined;
    */
  }
  
  toString() : String {
    return "TD" + this._id;
  }
  
  gen_buffers(gl) {
    this.tdrawbuf = this.raster.get_font(this.size).gen_text_buffers(gl, this.text, this.color, this.viewport);
    return this.tdrawbuf;
  }
  
  on_draw(gl) {
    static identitymat = new Matrix4();
     
    gl.disableVertexAttribArray(4);
    if (this.tdrawbuf == undefined)
      this.gen_buffers(gl);
    
    var spos, ssize;  
    if (this.ssize != undefined) {
      spos = CACHEARR3(this.spos[0], this.spos[1], 0);
      ssize = CACHEARR3(this.ssize[0], this.ssize[1], 0);
      
      g_app_state.raster.push_scissor(spos, ssize);
    }
    
    static mat = new Matrix4();
    mat.load(this.global_matrix);
    mat.multiply(this.mat);
    
    this.tdrawbuf.on_draw(gl, mat);
    
    if (this.ssize != undefined) {
      g_app_state.raster.pop_scissor();
    }
  }
}

var _ls_static_colors = {reallength: 0, length: 0};

function _box_process_clr(default_cs, clr) {
  var cs = default_cs;
  
  if (clr != undefined) {
    if (typeof clr == "number") {
      var cs2 = [0, 0, 0, 0]
      
      for (var i=0; i<4; i++) {
        cs2[i] = [cs[i][0], cs[i][1], cs[i][2], cs[i][3]];
        cs2[i] = darken(cs2[i], clr);
      }
      
      cs = cs2;
    } else if (typeof clr[0] == "number") {
      cs = [clr, clr, clr, clr];
    } else {
      cs = clr;
    }
  }
  
  return cs;
}

class UICanvas {
  constructor(viewport) { 
    static _id = 1;
    
    this._id = _id++;
    this.global_matrix = new Matrix4();
    
    this.iconsheet = g_app_state.raster.iconsheet;
    this.iconsheet16 = g_app_state.raster.iconsheet16;
    
    this.viewport = viewport;
    
    this.raster = g_app_state.raster;
    
    this.trilist = _talloc.alloc(this); //new TriList(this)
    
    this.textcache = {};
    this.textcachelen = 0;
    this.max_textcache = 64;

    this.trans_stack = []
    this.transmat = new Matrix4()
    
    this.drawlists = [this.trilist]
    this.stack = []
    
    this.cache = new hashtable();
    this.oldcache = new hashtable();
    
    this.uncached = new GArray([this.trilist]);
    this.scissor_stack = new GArray();
    
    this.flag = 0;
  }
  
  set_viewport(viewport) {
    var bad = false;
    
    for (var i=0; i<3; i++) {
      if (viewport[1][i] != this.viewport[1][i])
        bad = true;
    }
    
    this.viewport = viewport;
    
    if (bad) {
      this.on_resize(viewport[1], viewport[1]);
    }
  }  
  
  on_gl_lost(WebGLRenderingContext new_gl) {
    if (this.gl === new_gl) {
      console.trace();
      console.log("Warning: uicanvas.on_gl_lost() called multiple times");
      return;
    }
    
    this.gl = new_gl;
    this.drawlists = new GArray();
    
    this.iconsheet = g_app_state.raster.iconsheet;
    this.iconsheet16 = g_app_state.raster.iconsheet16;
    
    this.textcache = {};
    this.textcachelen = 0;
    
    this.stack = []
    this.raster = g_app_state.raster;
    
    this.cache = new hashtable();
    this.oldcache = new hashtable();
    
    this.new_trilist();
    
    //now that gl data is destroyed,
    //call .reset to maintain data structure integrity
    this.reset();
  }
  
  push_scissor(pos, size) {
    var oldpos = pos;
    
    pos = new Vector3([pos[0], pos[1], 0]);
    size = new Vector3([size[0], size[1], 0]);
    
    pos.multVecMatrix(this.transmat);
    size.multVecMatrix(this.transmat);
    
    var dx = pos[0] - oldpos[0], dy = pos[1] - oldpos[1];
    size[0] -= dx; size[1] -= dy;
    
    for (var i=0; i<3; i++) {
      pos[i] = Math.floor(pos[i]);
      size[i] = Math.ceil(size[i]);
    }
    
    this.scissor_stack.push([pos, size]);
    
    this.new_trilist();
  }

  pop_scissor() {
    this.scissor_stack.pop();
    this.new_trilist();
  }

  new_trilist(Boolean use_small_icons=false) {
    //flag canvas for memory leak detection, see active_canvases's definition
    active_canvases[this._id] = this;
    
    this.trilist = _talloc.alloc(this, use_small_icons); //new TriList(this, use_small_icons);
    
    if (this.scissor_stack.length > 0) {
      this.trilist.spos = this.scissor_stack[this.scissor_stack.length-1][0];
      this.trilist.ssize = this.scissor_stack[this.scissor_stack.length-1][1];
    }
    
    this.drawlists.push(this.trilist);
    
    return this.trilist;
  }
  
  translate(Array<float> off) {
    this.transmat.translate(off[0], off[1], 0.0);
  }
  
  push_transform(mat=new Matrix4()) {
    this.trans_stack.push(this.transmat)
    
    this.transmat = new Matrix4(this.transmat)
    this.transmat.multiply(mat);
  }

  pop_transform() {
    this.transmat = this.trans_stack.pop();
  }

  frame_begin(Object item) {
    if (DEBUG.ui_canvas) {
      console.log("canvas start, stack length: ", this.stack.length);
    }
    
    this.new_trilist();
    this.stack.push(this.drawlists.length-1);
  }

  frame_end(Object item) {
    var arr = new GArray([])
    var start = this.stack.pop(this.stack.length-1);
    
    if (DEBUG.ui_canvas)
      console.log(start);
    
    for (var i=start; i<this.drawlists.length; i++) {
      arr.push(this.drawlists[i]);
    }
    
    this.stack.pop();  
    this.cache.set(item, arr);
    
    this.new_trilist();
    
    if (DEBUG.ui_canvas) {
      console.log("canvas end, stack length: ", this.stack.length);
    }
    
    return arr;
  }
  
  begin(Object item) {
    //okay, individual leaf element caching may not have been a good
    //idea. . .
    
    //-XXX
    return;
    
    if (DEBUG.ui_canvas) {
      console.log("canvas start, stack length: ", this.stack.length);
    }
    
    this.new_trilist();
    this.stack.push(this.drawlists.length-1);
  }

  end(Object item) {
    //-XXX;
    return;
    
    var arr = new GArray([])
    var start = this.stack.pop(this.stack.length-1);
    
    if (DEBUG.ui_canvas)
      console.log(start);
    
    for (var i=start; i<this.drawlists.length; i++) {
      arr.push(this.drawlists[i]);
    }
    
    this.stack.pop();  
    this.cache.set(item, arr);
    
    this.new_trilist();
    
    if (DEBUG.ui_canvas) {
      console.log("canvas end, stack length: ", this.stack.length);
    }
    
    return arr;
  }

  use_cache(Object item) {
    if (this.oldcache.has(item)) {
      var arr = this.oldcache.get(item);
      
      for (var i=0; i<arr.length; i++) {
        this.drawlists.push(arr[i]);
      }
      
      this.oldcache.remove(item);
      this.cache.set(item, arr);
      
      this.new_trilist();
    }
  }

  has_cache(Object item) {
    return this.oldcache.has(item);
  }

  remove_cache(Object item) {
    if (this.oldcache.has(item))
      this.oldcache.remove(item);
  }

  textsize(text, size=default_ui_font_size) {
    var box = this.raster.get_font(size).calcsize(text);
    return [box[0], box[1]];
  }

  line(v1, v2, c1, c2=c1, width=2.0) {
    this.line_strip([[v1, v2]], [[c1, c2]], undefined, width);
  }

  line_strip(lines, colors, texcos, width, half) {//colors,texcos,width are optional
    if (colors == undefined) {
      colors = uicolors["DefaultLine"];
    }
    
    if (typeof(colors[0]) == "number") {
      var clr = colors;
      
      colors =_ls_static_colors;
      for (var i=0; i<lines.length; i++) {
        if (colors[i] == undefined) {
          colors[i] = [clr, clr];
        } else {
          colors[i][0] = clr;
          colors[i][1] = clr;
        }
      }
      
      colors.reallength = Math.max(colors.reallength, i);
      colors.length = i;
    }
    
    this.trilist.line_strip(lines, colors, texcos, width, half);
  }

  line_loop(points, colors, texcos, width, half) { //colors,texcos,width are optional
    var lines = []
    
    if (colors == undefined) {
      colors = uicolors["DefaultLine"];
    }
    
    var lcolors;
    if (typeof colors[0] != "number") 
      lcolors = []
    else
      lcolors = []
    
    for (var i=0; i<points.length; i++) {
      var i2 = (i+1)%points.length;
      
      lines.push([points[i], points[i2]]);
      if (typeof(colors[0]) != "number") {
        lcolors.push([colors[i], colors[i2]]);
      } else {
        lcolors.push([colors, colors]);
      }
    }
    
    this.line_strip(lines, lcolors, undefined, width, half);
  }

  quad(v1, v2, v3, v4, c1, c2, c3, c4) {
    if (v1.length == 2)
      v1.push(0);
    if (v2.length == 2)
      v2.push(0);
    if (v3.length == 2)
      v3.push(0);
    if (v4.length == 2)
      v4.push(0);
      
    this.trilist.add_quad(v1, v2, v3, v4, c1, c2, c3, c4);
  }

  quad_aa(v1, v2, v3, v4, c1, c2, c3, c4) {
    if (v1.length == 2)
      v1.push(0);
    if (v2.length == 2)
      v2.push(0);
    if (v3.length == 2)
      v3.push(0);
    if (v4.length == 2)
      v4.push(0);
    
    if (c2 == undefined) {
      c2 = c3 = c4 = c1;
    }
    
    this.trilist.add_quad(v1, v2, v3, v4, c1, c2, c3, c4);
    var lines = [[v1, v4], [v4, v3], [v3, v2], [v2, v1]];
    var colors = [[c1, c4], [c4, c3], [c3, c2], [c2, c1]];
    
    this.trilist.line_strip(lines, colors, undefined, undefined, true)
  }

  tri(v1, v2, v3, c1, c2, c3) {
    if (v1.length == 2)
      v1.push(0);
    if (v2.length == 2)
      v2.push(0);
    if (v3.length == 2)
      v3.push(0);
      
    this.trilist.add_tri(v1, v2, v3, c1, c2, c3);
  }

  on_draw(gl) {
    //Set the viewport and projection matrix for the scene
    gl.viewport(this.viewport[0][0], this.viewport[0][1], this.viewport[1][0], this.viewport[1][1]);
    
    var len = this.drawlists.length;
    for (var i=0; i<len; i++) {
      this.drawlists[i].on_draw(gl);
    }
  }

  arc_points(pos, start, arc, r, steps) {//steps is optional
    if (steps == undefined) {
      steps = Math.floor(6*arc/Math.PI);
    }
    
    var f, df;
    
    var f = start;
    var df = arc / steps;
    var points = [];
    for (var i=0; i<steps+1; i++) {
      var x = pos[0] + Math.sin(f)*r;
      var y = pos[1] + Math.cos(f)*r;
      
      points.push([x, y, 0]);
      f += df;
    }
    
    return points;
  }

  arc(pos, start, arc, r, clr, half) {
    if (clr == undefined) {
      clr = [0.9, 0.8, 0.7, 0.6];
    }
    
    var steps = 18/(2.0 - arc/(Math.PI*2));
    var f, df;
    
    var f = start;
    var df = arc / steps;
    var points = [];
    for (var i=0; i<steps+1; i++) {
      var x = pos[0] + Math.sin(f)*r;
      var y = pos[1] + Math.cos(f)*r;
      
      points.push([x, y, 0]);
      f += df;
    }
    
    var lines = [];
    var colors = [];
    for (var i=0; i<points.length-1; i++) {
      lines.push([points[i], points[i+1]])
      colors.push([clr, clr])
    }
    
    colors[0][0] = [1.0, 1.0, 0.0, 1.0] 
    colors[0][1] = [1.0, 1.0, 0.0, 1.0] 
    
    this.trilist.line_strip(lines, colors, undefined, undefined, half);
  }
  
  destroy() {
    this.reset();
    
    //get rid of any cache data, too
    for (var k in this.cache) {
      var arr = this.cache.get(k);
      for (var i=0; i<arr.length; i++) {
        arr[i].destroy();
        arr[i] = undefined;
      }
    }
    
    this.cache = new hashtable();
    if (this._id in active_canvases) {
      delete active_canvases[this._id];
    }
  }
  
  reset() {
    /*
    for (var i=0; i<this.uncached.length; i++) {
      this.uncached[i].destroy();
      this.uncached[i] = undefined;
    }*/
    
    var dmap = {};
    for (var k in this.cache) {
      var item = this.cache.get(k);
      
      for (var i=0; i<item.length; i++) {
        dmap[item[i]._id] = item[i];
      }
    }
    
    var dl = this.drawlists;
    for (var i=0; i<dl.length; i++) {
      if (!(dl[i]._id in dmap)) {
        dl[i].destroy();
      }
    }
    
    this.uncached.length = 0;
    this.scissor_stack.length = 0;
    
    /*destroy old cache that was used in last draw cycle, then swap it with
      the new cache that was *built* last cycle.*/
      
    for (var k in this.oldcache) {
      var arr = this.oldcache.get(k)
      
      for (var i=0; i<arr.length; i++) {
        arr[i].destroy();
        arr[i] = undefined;
      }
    }
    
    this.oldcache = this.cache;
    this.cache = new hashtable();
    
    this.drawlists.length = 0;
    
    if (this.trans_stack.length > 0) {
      this.trans_stack[0].makeIdentity();
      this.trans_stack.length = 1;
    } else {
      this.trans_stack.length = 0;
      this.trans_stack.push(new Matrix4());
    }
    
    this.transmat = this.trans_stack[0];
    this.stack.length = 0;
    
    this.new_trilist();
  }

 invbox(pos, size, clr, r) {
    var cs = uicolors["InvBox"]
    
    cs = _box_process_clr(cs, clr);
      
    this.box(pos, size, cs, r);
  }

  simple_box(pos, size, clr=undefined, r=2.0) { //clr is optional
    
    var cs = uicolors["SimpleBox"]
    
    cs = _box_process_clr(cs, clr);
       
    this.box(pos, size, cs, r);
  }

  hlightbox(pos, size, clr_mul, r) { //clr_mul is optional
    var cs = uicolors["HLightBox"]
    
    /*if (clr != undefined) {
      cs = [clr, clr, clr, clr]
    }*/
      
    if (clr_mul != undefined) {
      cs = [new Vector4(cs[0]), new Vector4(cs[1]), new Vector4(cs[2]), new Vector4(cs[3])]
      for (var i=0; i<4; i++) {
        for (var j=0; j<4; j++) {
          cs[i][j] *= clr_mul;
        }
      }
    }
    this.box(pos, size, cs, r);
  }

  box_outline(pos, size, clr, rfac) {
    this.box(pos, size, clr, rfac, true);
  }
  
  shadow_box(pos, size, steps=6, margin=[6, 6], clr=uicolors["ShadowBox"]) {
    static neg1 = [-2, -2];
    
    //arg, can't remember the correct formula to use here
    //x**steps = 0.1
    //x = 0.1**(1.0/steps)
    var fac = (1.0/steps)*0.4;
    var clr = [clr[0], clr[1], clr[2], clr[3]*fac]
    
    pos = new Vector2(pos);
    size = new Vector2(size);
    expand_rect2d(pos, size, margin);
    
    for (var i=0; i<steps; i++) {
      this.box(pos, size, clr);
      expand_rect2d(pos, size, neg1);
    }
  }
  
  box(pos, size, clr, rfac, outline_only) {
    if (IsMobile || rfac == 0.0)
      return this.box2(pos, size, clr, rfac, outline_only);
    else
      return this.box1(pos, size, clr, rfac, outline_only);
  }
  
  /* I think this word is Dutch.  it comes from photography,
     it means to dim the screen around a rectangle of
     interest.  need to look up the english word.
     and no, I'm not Dutch.
   */
  passpart(pos, size, clr=[0,0,0,0.5]) {
    var p = this.viewport[0];
    var s = this.viewport[1];
    
    this.box2([p[0], p[1]], [pos[0], s[1]], clr);
    this.box2([p[0]+pos[0]+size[0], p[1]], [s[0]-pos[0]-size[0], s[1]], clr);
    this.box2([pos[0]+p[0], pos[1]+p[1]+size[1]], [size[0], s[1]-size[1]-p[1]], clr);
    this.box2([pos[0]+p[0], p[1]], [size[0], pos[1]], clr)
  }
  
  icon(int icon, Array<float> pos, float alpha=1.0, Boolean small=false) {
    if (this.trilist.small_icons != small) {
      this.new_trilist(small);
    }
    
    this.trilist.icon_quad(icon, pos, alpha);
  }
  
  box2(Array<float> pos, Array<float> size, Array<float> clr=undefined, float rfac=undefined, Boolean outline_only=false) {
    var cs = uicolors["Box"];
    
    cs = _box_process_clr(cs, clr);
    
    var x = pos[0], y=pos[1];
    var w=size[0], h=size[1];
    
    this.trilist.add_quad(CACHEARR3(x, y, 0), CACHEARR3(x+w, y, 0), CACHEARR3(x+w, y+h, 0), CACHEARR3(x, y+h, 0), cs[0], cs[1], cs[2], cs[3]);
  }

  box1(Array<float> pos, Array<float> size, Array<float> clr=undefined, float rfac=undefined, Boolean outline_only=false) {
    var c1, c2, c3, c4;
    var cs = uicolors["Box"];
    static cache = {};
    
    if (outline_only == undefined)
      outline_only = false;
    
    cs = _box_process_clr(cs, clr);
      
    var x = Math.floor(pos[0]), y=Math.floor(pos[1]);
    var w=size[0], h=size[1];
    
    var start = 0;
    var ang = Math.PI/2;
    var r = 4 //Math.sqrt(size[0]*size[1])
    
    if (rfac == undefined) 
      rfac = 1;
    
    var hash = size[0].toString() + " " + size[1] + " " + rfac;
    if (!(hash in cache)) {
      r /= rfac;
      
      var p1 = this.arc_points(CACHEARR3(0+r+2, 0+r+2, 0), Math.PI, ang, r);
      var p2 = this.arc_points(CACHEARR3(0+w-r-2, 0+r+2, 0), Math.PI/2, ang, r);
      var p3 = this.arc_points(CACHEARR3(0+w-r-2, 0+h-r-2, 0), 0, ang, r);
      var p4 = this.arc_points(CACHEARR3(0+r+2, 0+h-r-2, 0), -Math.PI/2, ang, r);

      var plen = p1.length;
      
      p4.reverse();
      p3.reverse();
      p2.reverse();
      p1.reverse();
      var points = []
      for (var i=0; i<p1.length; i++) {
        points.push(p1[i]);
      }
      
      for (var i=0; i<p2.length; i++) {
        points.push(p2[i]);
        p1.push(p2[i]);
      }
      
      for (var i=0; i<p3.length; i++) {
        points.push(p3[i]);
      }
      
      p2 = p3;
      for (var i=0; i<p4.length; i++) {
        p2.push(p4[i]);
        points.push(p4[i]);
      }
      
      p2.reverse();
      
      cache[hash] = [p1, p2, points];
    }
    
    var cp = cache[hash];
    
    var p1 = cp[0];
    var p2 = cp[1];
    var points = cp[2];
    var plen = p1.length;
    
    function color(i) {
      if (i < plen) return cs[0];
      else if (i < plen*2) return cs[1];
      else if (i < plen*3) return cs[2];
      else if (i <= plen*4+1) return cs[3];
    }
    
    static v1 = new Vector3(), v2 = new Vector3(), v3 = new Vector3(), v4 = new Vector3();
    
#define LOAD_CLR(a, b) a[0] = b[0]+x; a[1] = b[1]+y; a[2] = b[2];
    if (!outline_only) {
      for (var i=0; i<p1.length-1; i++) {
        var i1 = i;
        var i2 = i+plen*2;
        var i3 = i + 1+plen*2;
        var i4 = i+1;
        
        LOAD_CLR(v1, p1[i]);
        LOAD_CLR(v2, p2[i]);
        LOAD_CLR(v3, p2[i+1]);
        LOAD_CLR(v4, p1[i+1]);
        
        this.trilist.add_quad(v1, v2, v3, v4, color(i1), color(i2), color(i3), color(i4));
      }
    }
    
    var lines = []
    var colors = []
    static pairs = [];
    
    for (var i=0; i<points.length; i++) {
      LOAD_CLR(v1, points[(i+1)%points.length]);
      LOAD_CLR(v2, points[i]);
      
      if (pairs.length <= i) {
        pairs.push([[0, 0], [0, 0]]);
      }
      
      pairs[i][0][0] = CACHEARR3(v1[0], v1[1], 0);
      pairs[i][0][1] = CACHEARR3(v2[0], v2[1], 0);
      lines.push(pairs[i][0]);
      
      pairs[i][1][0] = color((i+1)%points.length);
      pairs[i][1][1] = color(i);
      colors.push(pairs[i][1]);
    }
#undef LOAD_CLR
    this.trilist.line_strip(lines, colors, undefined, 4, true);
    //this.box2(pos, size, clr, rfac, outline_only);
    return this.trilist
  }
  
  on_resize(newsize, oldsize) {
    //all cache entries with old size are now bad
    for (var k in this.textcache) {
      if (!this.textcache.hasOwnProperty(k)) continue;
      
      this.textcache[k].destroy();
    }
    
    this.textcache = {};
    this.textcachelen = 0;
    
    //clear entire cache
    this.destroy();
    this.reset();
  }
  
  text(Array<float> pos, String text, Array<float> color, float size, 
       float scale, float rot, Array<float> scissor_pos, Array<float> scissor_size)
  {
    static loc = new Vector3();
    
    if (rot == undefined)
      rot = 0.0;
      
    if (size == undefined)
      size = default_ui_font_size;
    
    if (scale == undefined) {
      scale = CACHEARR3(1.0, 1.0, 1.0);
    } else if (typeof(scale) == "number") {
      scale = CACHEARR3(scale, scale, scale);
    }
    
    if (color == undefined) {
      color = uicolors["DefaultText"]
    }
    
    if (scissor_pos == undefined) {
      if (this.scissor_stack.length > 0) {
        scissor_pos = this.scissor_stack[this.scissor_stack.length-1][0];
        scissor_size = this.scissor_stack[this.scissor_stack.length-1][1];
      }
    } else {
      scissor_pos = new Vector3([scissor_pos[0], scissor_pos[1], 0]);
      scissor_size = new Vector3([scissor_size[0], scissor_size[1], 0]);
      
      scissor_pos.multVecMatrix(this.transmat);
    }
    
    loc[0] = 0; loc[1] = 0; loc[2] = 0;
    loc.multVecMatrix(this.transmat);
    loc[0] += pos[0]
    loc[1] += pos[1]
    
    //yes, raster is supposed to be a nasty global
    var port = g_app_state.raster.viewport
    var sx = port[1][0]
    var sy = port[1][1]
    
    loc[0] = (Math.floor(loc[0])/sx)*2.0; //*2.0-1.0;
    loc[1] = (Math.floor(loc[1])/sy)*2.0; //*2.0-1.0;
    
    var textdraw = new TextDraw(loc, text, color, scissor_pos, 
                                scissor_size, this.viewport, size, scale, 
                                this.global_matrix, rot);
    var hash = text.toString() + ">>" + size + "|" + JSON.stringify(this.viewport);
    
    //XXX
    // /*
    if (!(hash in this.textcache)) {
      if (this.textcachelen > this.max_textcache) {
        var keys = Object.getOwnPropertyNames(this.textcache)
        for (i=0; i<keys.length; i++) {
          var k = keys[i];
          
          this.textcache[k].destroy();
          var users = this.textcache[k].users;
          
          //possible evil!
          for (var j=0; j<users.length; j++) {
            users[j].recalc = true;
            users[j].tdrawbuf = undefined;
          }
          
          delete this.textcache[k];
          this.textcachelen--;
          
          //amortize cache destruction calls
          if (this.textcachelen < this.max_textcache/3)
            break;
        }
      }
      
      this.textcache[hash] = textdraw.gen_buffers(g_app_state.gl);
      this.textcachelen++;
    } else {
      textdraw.tdrawbuf = this.textcache[hash];
    }
    
    this.textcache[hash].users.push(textdraw);
    
    //-XXX
    if (this.drawlists[this.drawlists.length-1] == this.trilist) {
      this.drawlists.push(textdraw);
      
      this.new_trilist();
      
      if (this.stack.length == 0) {
        this.uncached.push(textdraw);
        this.uncached.push(this.trilist);
      }
    } else {
      this.drawlists.push(textdraw);
      
      if (this.stack.length == 0) {
        this.uncached.push(textdraw);
      }
    }
    // */
    return loc;
  }
}
