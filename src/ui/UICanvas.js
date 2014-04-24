"use strict";

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

class TriList {
  constructor(View3DHandler view3d, UICanvas canvas, Boolean use_small_icons=false) {
    this.verts = [];
    this.colors = [];
    this.texcos = [];
    this.use_tex = 1;
    this.tex = 0 : WebGLTexture;
    this.view3d = view3d : View3DHandler;
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

  add_tri(Vector3 v1, Vector3 v2, Vector3 v3, 
                          Array<float> c1, Array<float> c2, Array<float> c3,
                          Array<float> t1, Array<float> t2, Array<float> t3) 
  {
    var vs = this.verts;
    
    this.tottri++;
    
    _trilist_v1.load(v1); _trilist_v2.load(v2); _trilist_v3.load(v3);
    v1 = _trilist_v1; v2 = _trilist_v2; v3 = _trilist_v3;
    
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
    
    var dx = 1.0 / this.viewport[0];
    var dy = 1.0 / this.viewport[1];
    
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
    if (v.length == 2) v.push(0);
    
    var v3 = _trilist_v9;
    v3[0] = v[0]; v3[1] = v[1]; v3[2] = v[2];
    
    v3.multVecMatrix(this.canvas.transmat);
    
    v[0] = (v3[0]/this.viewport[1][0])*2.0 - 1.0;
    v[1] = (v3[1]/this.viewport[1][1])*2.0 - 1.0;
  }
  
  line(v1, v2, c1, c2=undefined, width=undefined) { //c2 and width are optional
    if (c2 == undefined) {
      c2 = c1;
    }
    
    if (v1.length == 2) v1.push(0);
    if (v2.length == 2) v2.push(0);
    
    this.line_strip(objcache.getarr(objcache.getarr(v1, v2), objcache.getarr(c1, c2)), undefined, width);
  }
  
  line_strip(lines, colors, texcos, width=2.0, half=false) {//width, width are optional
    static black = new Vector4([0.0, 0.0, 0.0, 1.0]);
    
    for (var i =0; i<lines.length; i++) {
      var lc1 = colors[i][0], lc2 = colors[i][1];
      
      if (lines[i][0].length == 2) lines[i][0].push(0);
      if (lines[i][1].length == 2) lines[i][1].push(0);
      if (lc1 == undefined) lc1 = black;
      if (lc2 == undefined) lc2 = black;
      
      var v1 = _trilist_v5.load(lines[i][0])
      var v2 = _trilist_v6.load(lines[i][1])
      var v0=_trilist_v7, v3=_trilist_v8, n0=_trilist_n1, n1=_trilist_n2, n2=_trilist_n3;
      var c3=_trilist_c3, c4=_trilist_c4
      
      n0.zero(); n1.zero(); n2.zero();
      
      var z = 0.0
      
      v1.load(lines[i][1]);
      v1.sub(lines[i][0]);
      v1.normalize();
      
      n1[0] = v1[1];
      n1[1] = -v1[0];
      n1[2] = z;
      n1.normalize()
      
      if (i > 0) {
        v0.load(lines[i-1][1]);
        v0.sub(lines[i-1][0])
        v0.normalize();
        
        n0[0] = v0[1];
        n0[1] = -v0[0];
        n0[2] = z;
        n0.normalize()
      } else {
        n0.load(n1);
      }
      
      v1.load(lines[i][1]);
      v1.sub(lines[i][0])
      
      if (i < lines.length-1) {
        v3.load(lines[i+1][1]);
        v3.sub(lines[i+1][0]);
        v3.normalize();
        
        n2[0] = v3[1];
        n2[1] = -v3[0];
        n2[2] = z;
        n2.normalize()
      } else {
        n2.load(n1);
      }
      
      n0.normalize();
      n1.normalize();
      n2.normalize();
      
      n0.mulScalar(0.5);
      n1.mulScalar(0.5);
      n2.mulScalar(0.5);
      
      n2.add(n1).normalize();
      n1.add(n0).normalize();
      
      n1.mulScalar(width*0.5);
      n2.mulScalar(width*0.5);
      
      v0.load(lines[i][0]);
      v1.load(lines[i][1]);
      
      v2.load(lines[i][1]);
      v2.add(n1);
      v3.load(lines[i][0]);
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
  
  destroy() {
    var gl = this.view3d.gl
    
    if (this.vbuf) {
      gl.deleteBuffer(this.vbuf);
      gl.deleteBuffer(this.cbuf);
    }
    
    if (this.tbuf) {
      gl.deleteBuffer(this.tbuf);
    }  
    
    this.vbuf = this.cbuf = this.tbuf = undefined;
    this.recalc = 1;
  }
  
  gen_buffers(gl) {
    this.verts = new Float32Array(this.verts)
    this.colors = new Float32Array(this.colors)
    if (this.use_tex)
      this.texcos = new Float32Array(this.texcos);
    
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    
    if (this.use_tex)
      gl.enableVertexAttribArray(2);
    else
      gl.disableVertexAttribArray(2);
          
    var vbuf = gl.createBuffer();    
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.verts, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);

    var cbuf = gl.createBuffer();    
    gl.bindBuffer(gl.ARRAY_BUFFER, cbuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, cbuf);

    if (this.use_tex) {
      var tbuf = gl.createBuffer();    
      gl.bindBuffer(gl.ARRAY_BUFFER, tbuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.texcos, gl.STATIC_DRAW);
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
    
    gl.useProgram(gl.basic2d.program);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.iconsheet.tex);
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

function _new_trilist(View3DHandler view3d, UICanvas canvas) {
  if (_trilist_frame_counter = 0 >= MAX_TRILIST_CACHE) {
    return new TriList(view3d, canvas);
  } else {
    var list = objcache.fetch(_trilist_template)
    TriList.call(list, view3d, canvas);
  }
}

function _save_trilist(TriList trilist) {
  if (objcache.is_cache_obj(trilist)) {
    objcache.cache_remove(trilist);
  }
}
*/

class TextDraw {
  constructor(pos, text, color, view3d, spos, ssize, viewport, size) {
    this.text = text;
    this.pos = [pos[0], pos[1], pos[2]];
    this.color = color;
    this.view3d = view3d
    this.tdrawbuf = undefined : TextDrawBuffer;
    this.spos = spos;
    this.ssize = ssize;
    this.viewport = viewport;
    this.size = [size[0], size[1], 0];
    this.raster = g_app_state.raster;
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
  
  gen_buffers(gl) {
    this.tdrawbuf = this.raster.font.gen_text_buffers(gl, this.text, this.color, this.viewport);
    return this.tdrawbuf;
  }
  
  on_draw(gl) {
    static identitymat = new Matrix4();
    
    gl.disableVertexAttribArray(4);
    if (this.tdrawbuf == undefined)
      this.gen_buffers(gl);
    
    var spos, ssize;  
    if (this.ssize != undefined) {
      spos = objcache.getarr(this.spos[0], this.spos[1], 0);
      ssize = objcache.getarr(this.ssize[0], this.ssize[1], 0);
      
      g_app_state.raster.push_scissor(spos, ssize);
    }
    
    this.tdrawbuf.on_draw(gl, this.pos, this.size);
    
    if (this.ssize != undefined) {
      g_app_state.raster.pop_scissor();
    }
  }
}

var __uicanvas_id = 1;
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

//viewport is optional, defaults to view3d.size
class UICanvas {
  constructor(view3d, viewport) { 
    this.iconsheet = g_app_state.raster.iconsheet;
    this.iconsheet16 = g_app_state.raster.iconsheet16;
    
    if (viewport == undefined)
      this.viewport = [view3d.pos, view3d.size];
    else
      this.viewport = viewport;
    
    this.raster = g_app_state.raster;
    
    this.trilist = new TriList(view3d, this)
    this.view3d = view3d;
    this.trilist.view3d = view3d
    
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
    this._id = __uicanvas_id++;
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
    this.trilist = new TriList(this.view3d, this, use_small_icons);
    
    if (this.scissor_stack.length > 0) {
      this.trilist.spos = this.scissor_stack[this.scissor_stack.length-1][0];
      this.trilist.ssize = this.scissor_stack[this.scissor_stack.length-1][1];
    }
    
    this.drawlists.push(this.trilist);
    
    return this.trilist;
  }

  push_transform(mat) {
    this.trans_stack.push(this.transmat)
    
    this.transmat = new Matrix4(this.transmat)
    this.transmat.multiply(mat);
  }

  pop_transform() {
    this.transmat = this.trans_stack.pop();
  }

  begin(Object item) {
    if (DEBUG.ui_canvas) {
      console.log("canvas start, stack length: ", this.stack.length);
    }
    
    this.new_trilist();
    this.stack.push(this.drawlists.length-1);
  }

  end(Object item) {
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
    var box = this.raster.font.calcsize(text);
    return [box[0]*size, box[1]*size];
  }

  line(v1, v2, c1, c2, width) {
    if (c2 == undefined) {
      c2 = c1;
    }
    
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

  reset() {
    for (var i=0; i<this.uncached.length; i++) {
      this.uncached[i].destroy();
    }
    
    this.uncached = new GArray();
    this.scissor_stack = new GArray();
    
    /*destroy old cache that was used in last draw cycle, then swap it with
      the new cache that was *built* last cycle.*/
      
    for (var k in this.oldcache) {
      var arr = this.oldcache.get(k)
      
      for (var i=0; i<arr.length; i++) {
        arr[i].destroy();
      }
    }
    
    this.oldcache = this.cache;
    this.cache = new hashtable();
    
    this.drawlists = [];
    this.trans_stack = [new Matrix4()]
    this.transmat = this.trans_stack[0];
    this.stack = []
    
    this.new_trilist();
  }

 invbox(pos, size, clr, r) {
    var cs = uicolors["InvBox"]
    
    cs = _box_process_clr(cs, clr);
      
    this.box(pos, size, cs, r);
  }

  simple_box(pos, size, clr, r) { //clr is optional
    
    var cs = uicolors["SimpleBox"]
    
    cs = _box_process_clr(cs, clr);
    
    if (r == undefined)
      r = 2.0;
      
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
    if (IsMobile)
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
    
    this.trilist.add_quad([x, y, 0], [x+w, y, 0], [x+w, y+h, 0], [x, y+h, 0], cs[0], cs[1], cs[2], cs[3]);
  }

  box1(Array<float> pos, Array<float> size, Array<float> clr=undefined, float rfac=undefined, Boolean outline_only=false) {
    var c1, c2, c3, c4;
    var cs = uicolors["Box"];
    
    if (outline_only == undefined)
      outline_only = false;
    
    cs = _box_process_clr(cs, clr);
      
    var x = pos[0], y=pos[1];
    var w=size[0], h=size[1];
    
    //this.trilist.add_quad([x, y, 0], [x+w, y, 0], [x+w, y+h, 0], [x, y+h, 0], c1, c2, c3, c4);
    
    var start = 0;
    var ang = Math.PI/2;
    var r = 4 //Math.sqrt(size[0]*size[1])
    
    if (rfac == undefined) 
      rfac = 1;
    
    r /= rfac;
    
    var p1 = this.arc_points([x+r+2, y+r+2, 0], Math.PI, ang, r);
    var p2 = this.arc_points([x+w-r-2, y+r+2, 0], Math.PI/2, ang, r);
    var p3 = this.arc_points([x+w-r-2, y+h-r-2, 0], 0, ang, r);
    var p4 = this.arc_points([x+r+2, y+h-r-2, 0], -Math.PI/2, ang, r);

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
    
    function color(i) {
      if (i < plen) return cs[0];
      else if (i < plen*2) return cs[1];
      else if (i < plen*3) return cs[2];
      else if (i <= plen*4+1) return cs[3];
    }
    
    if (!outline_only) {
      for (var i=0; i<p1.length-1; i++) {
        var i1 = i;
        var i2 = i+plen*2;
        var i3 = i + 1+plen*2;
        var i4 = i+1;
        
        var v1 = p1[i];
        var v2 = p2[i];
        var v3 = p2[i+1]
        var v4 = p1[i+1]
        
        this.trilist.add_quad(v1, v2, v3, v4, color(i1), color(i2), color(i3), color(i4));
      }
    }
    
    var lines = []
    var colors = []
    for (var i=0; i<points.length; i++) {
      var v1 = points[(i+1)%points.length];
      var v2 = points[i];
      
      lines.push([v1, v2]);    
      colors.push([color((i+1)%points.length), color(i)]);
    }
    
    this.trilist.line_strip(lines, colors, undefined, 4, true);
    
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
    this.reset();
    this.reset();
  }
  
  text(Array<float> pos, String text, Array<float> color, Number size, Array<float> scissor_pos, Array<float> scissor_size)
  { 
    static loc = new Vector3();
    
    if (size == undefined) {
      size = objcache.getarr(default_ui_font_size, default_ui_font_size, default_ui_font_size);
    } else if (typeof(size) == "number") {
      size = objcache.getarr(size, size, size);
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
    var sx = port[1][0] - port[0][0]
    var sy = port[1][1] - port[0][1]
    
    loc[0] = (Math.floor(loc[0])/sx)*2.0; //*2.0-1.0;
    loc[1] = (Math.floor(loc[1])/sy)*2.0; //*2.0-1.0;
    
    var textdraw = new TextDraw(loc, text, color, this.view3d, scissor_pos, scissor_size, this.viewport, size);
    var hash = text.toString() + ">>" + this.viewport.toString()
    
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
    
    return loc;
  }
}
