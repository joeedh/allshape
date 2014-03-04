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
  constructor(View3DHandler view3d, UICanvas canvas) {
    this.verts = [];
    this.colors = [];
    this.texcos = [];
    this.use_tex = 0;
    this.tex = 0 : WebGLTexture;
    this.view3d = view3d : View3DHandler;
    
    this.recalc = 1
    this.tottri = 0;
    this.canvas = canvas
    this.spos = undefined : Array<float>;
    this.ssize = undefined : Array<float>;
    this.gl_spos = undefined : Array<float>;
    this.gl_ssize = undefined : Array<float>;
    this.viewport = canvas.viewport;
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
      if (t1 == undefined)
        t1 = t2 = t3 = [0, 0]
      
      var ts = self.texcos
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
    
    this.line_strip([[v1, v2]], [[c1, c2]], undefined, width);
  }
  
  line_strip(lines, colors, texcos, width=2.0, half=false) {//width, width are optional
    for (var i =0; i<lines.length; i++) {
      if (lines[i][0].length == 2) lines[i][0].push(0);
      if (lines[i][1].length == 2) lines[i][1].push(0);
      
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
      
      var c1 = _trilist_c1.load(colors[i][0]); var c2 = _trilist_c2.load(colors[i][1]);
      var c3 = _trilist_c3.load(colors[i][1]); var c4 = _trilist_c4.load(colors[i][0]);
      
      c3[3] = 0.0; c4[3] = 0.0;
      n1.mulScalar(2.0);
      n2.mulScalar(2.0);
      if (this.use_tex) { 
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
    if (this.recalc) {
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

class TextDraw {
  constructor(pos, text, color, view3d, mat, spos, ssize, viewport, size) {
    this.text = text;
    this.pos = pos;
    this.color = color;
    this.view3d = view3d
    this.transmat = new Matrix4(mat)
    this.tdrawbuf = undefined : TextDrawBuffer;
    this.spos = spos;
    this.ssize = ssize;
    this.viewport = viewport;
    this.size = size;
    this.transmat.translate(pos[0], pos[1], 0.0);
    this.transmat.scale(size, size, size);
    this.raster = g_app_state.raster;
  }
  
  destroy() {
    if (this.tdrawbuf != undefined)
      this.tdrawbuf.destroy();
    this.tdrawbuf = undefined;
  }
  
  on_draw(gl) {
    gl.disableVertexAttribArray(4);
    if (this.tdrawbuf == undefined)
      this.tdrawbuf = this.raster.font.gen_text_buffers(gl, 0, 0, this.text, this.color, this.transmat, this.viewport);
    
    var spos, ssize;
    
    if (this.ssize != undefined) {
        spos = new Vector3([this.spos[0], this.spos[1], 0]);
        ssize = new Vector3([this.ssize[0], this.ssize[1], 0]);
        
        g_app_state.raster.push_scissor(spos, ssize);
    }
    
    this.tdrawbuf.on_draw(gl);
    
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
    if (viewport == undefined)
      this.viewport = [view3d.pos, view3d.size];
    else
      this.viewport = viewport;
    
    this.raster = g_app_state.raster;
    
    this.trilist = new TriList(view3d, this)
    this.view3d = view3d;
    this.trilist.view3d = view3d
    
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

  new_trilist() {
    this.trilist = new TriList(this.view3d, this);
    
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

  textsize(text, size) {
    if (size == undefined)
      size = default_ui_font_size;
    
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

  box(pos, size, clr, rfac, outline_only) {
    if (IsMobile)
      return this.box2(pos, size, clr, rfac, outline_only);
    else
      return this.box1(pos, size, clr, rfac, outline_only);
  }

  box2(pos, size, clr, rfac, outline_only) {
    var cs = uicolors["Box"];
    
    cs = _box_process_clr(cs, clr);
    
    var x = pos[0], y=pos[1];
    var w=size[0], h=size[1];
    
    this.trilist.add_quad([x, y, 0], [x+w, y, 0], [x+w, y+h, 0], [x, y+h, 0], cs[0], cs[1], cs[2], cs[3]);
  }

  box1(pos, size, clr, rfac, outline_only) {//clr,rfac,outline_only are optional
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

  text(Array<float> pos, String text, Array<float> color, Number size, Array<float> scissor_pos, Array<float> scissor_size)
  { 
    if (size == undefined) {
      size = default_ui_font_size;
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
    
    var textdraw = new TextDraw(pos, text, color, this.view3d, this.transmat, scissor_pos, scissor_size, this.viewport, size);
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
  }
}
