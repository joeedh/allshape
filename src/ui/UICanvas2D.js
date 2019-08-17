"use strict";

#include "src/core/utildefine.js"

function get_2d_canvas() {
  static ret = {}
  
  ret.canvas = document.getElementById("canvas2d");
  ret.ctx = _canvas2d_ctx;
  return ret;
}

class UICanvas2_ {
  constructor(viewport) {
    var c = get_2d_canvas();
    
    this.scissor_stack = [];
    this.canvas = c.canvas;
    this.ctx = c.ctx;
    this._lastclip = [[0, 0], [0, 0]];
    
    this.transmat = new Matrix4();
    this.trans_stack = [];
    
    this.line_cos = [];
    this.line_clrs = [];
    this.tri_cos = [];
    this.tri_cos = [];
    this.raster = g_app_state.raster;
    
    this.trilist = this;
    this.global_matrix = new Matrix4();
    
    this.iconsheet = g_app_state.raster.iconsheet;
    this.iconsheet16 = g_app_state.raster.iconsheet16;
    
    this.viewport = viewport;

    function stub_func() {
    }
    
    for (var k in UICanvas_.prototype) {
      if (k == "constructor" || k == "prototype" || k == "toString")
        continue;
      
      if (this[k] == undefined) {
        this[k] = stub_func;
      }
    }
  }
  
  _css_color(c) {
    var s = "rgba("
    
    for (var i=0; i<4; i++) {
      if (i > 0) s += ","
      s += Math.floor(c[i]*255);
    }
    
    return s;
  }
  
  on_draw(gl) {
    return
    var ctx = get_2d_canvas().ctx;
    
    function rec(n) {
      n.do_recalc();
      
      if (n instanceof UIFrame) {
        for (var c of n.children) {
          rec(c);
        }
      }
    }
    
    rec(g_app_state.screen);
    
    g_app_state.screen.do_full_recalc();
    g_app_state.active_view3d.do_full_recalc();
    g_app_state.active_view3d.do_recalc();
    
    var v = g_app_state.raster.viewport;
    //ctx.clearRect(0, 0, v[1][0], v[1][1]);
  }
  
  set_viewport(viewport) {
    this.viewport = viewport;
  }  
  
  clear(p, size) {
    var v = this.viewport;
    var canvas = get_2d_canvas().canvas;
    var ctx = get_2d_canvas().ctx;
    
    ctx.clearRect(p[0]+v[0][0], canvas.height-(v[0][1]+p[1]+size[1]), size[0], size[1]);
  }
  
  reset() {
    var v = this.viewport;
    var canvas = get_2d_canvas().canvas;
    var ctx = get_2d_canvas().ctx;
    
    //this.clear([0, 0], [v[1][0], v[1][1]])
    //ctx.clearRect(0, 0, canvas.width, canvas.height);
    //ctx.clearRect(v[0][0], canvas.height-v[0][1] - v[1][1], v[1][0], v[1][1]);
  }
  
  has_cache(item) {
    return false;
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

  quad(v1, v2, v3, v4, c1, c2, c3, c4) {
    var canvas = get_2d_canvas().canvas;
    var ctx = get_2d_canvas().ctx;
    var v = g_app_state.raster.viewport;
    
    var m = this.transmat.$matrix;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    //ctx.translate(Math.floor(m.m41), Math.floor(canvas.height - m.m42));
    //console.log(m.m41, canvas.height-m.m42);
    
    var x = m.m41, y = m.m42;
    //v[0][0] = 0; v[0][1] = 0; //XXX
    
    //ctx.fillStyle = this._css_color(c1);
    ctx.setFillColor(c1[0], c1[1], c1[2], c1[3]);
    
    ctx.beginPath();
    ctx.moveTo(v1[0]+x+v[0][0], canvas.height-(v1[1]+y+v[0][1]));
    ctx.lineTo(v2[0]+x+v[0][0], canvas.height-(v2[1]+y+v[0][1]));
    ctx.lineTo(v3[0]+x+v[0][0], canvas.height-(v3[1]+y+v[0][1]));
    ctx.lineTo(v4[0]+x+v[0][0], canvas.height-(v4[1]+y+v[0][1]));
    ctx.fill();
  }
  
  icon(int icon, Array<float> pos, float alpha=1.0, Boolean small=false, 
       Array<float> clr=undefined) 
  {
    if (icon < 0) return;
    
    var sheet = small ? g_app_state.raster.iconsheet16 : g_app_state.raster.iconsheet;
    var img = sheet.tex.image;
    var csize = sheet.cellsize;
    
    var canvas = get_2d_canvas().canvas;
    var ctx = get_2d_canvas().ctx;
    var v = g_app_state.raster.viewport;
    
    var m = this.transmat.$matrix;
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    var x = m.m41+v[0][0]+pos[0], y = canvas.height - (m.m42+v[0][1]+pos[1]) - csize[1];
    var spos = sheet.enum_to_xy(icon);
    
    ctx.drawImage(img, spos[0], spos[1], csize[0], csize[1], x, y, csize[0], csize[1]);
  }
  
  quad_aa(v1, v2, v3, v4, c1, c2, c3, c4) {
    this.quad(v1, v2, v3, v4, c1, c2, c3, c4);
  }
  
  push_scissor(pos, size) {
    var oldpos = pos;
    
    pos = new Vector3([pos[0], pos[1], 0]);
    size = new Vector3([size[0], size[1], 0]);
    
    pos.multVecMatrix(this.transmat);
    size.multVecMatrix(this.transmat);
    
    var vx=this.viewport[0][0], vy=this.viewport[0][1];
    pos[0] += vx; pos[1] += vy;
    
    var dx = pos[0]-oldpos[0]-vx, dy = pos[1]-oldpos[1]-vy;
    size[0] -= dx; size[1] -= dy;
    
    //pos[0] += vx;
    //pos[1] += vy;
    
    for (var i=0; i<3; i++) {
      pos[i] = Math.floor(pos[i]);
      size[i] = Math.ceil(size[i]);
    }
    
    this.scissor_stack.push([pos, size]);
  }
  
  pop_scissor() {
    this.scissor_stack.pop();
  }

  _clipeq(c1, c2) {
    return c1[0][0] == c2[0][0] && 
           c1[0][1] == c2[0][1] && 
           c1[1][0] == c2[1][0] && 
           c1[1][1] == c2[1][1];
  }
  
  _set_scissor() {
    var canvas = get_2d_canvas().canvas;
    var ctx = get_2d_canvas().ctx;
    static empty_clip = [[0, 0], [0, 0]];
    
    if (!this._clipeq(empty_clip, this._lastclip) && this.scissor_stack.length == 0) {
      this._lastclip[0][0] = 0;
      this._lastclip[0][1] = 0;
      this._lastclip[1][0] = 0;
      this._lastclip[1][1] = 0;
      
      ctx.rect(0, 0, window.innerWidth, window.innerHeight);
      ctx.clip();
      
      return;
    } else if (this.scissor_stack.length == 0) {
      return;
    }
    
    //return
    
    var v = g_app_state.raster.viewport;
    var sc = this.scissor_stack[this.scissor_stack.length-1];
    
    //if (sc == undefined) return;
    //if (this._clipeq(sc, this._lastclip)) return;
    
    this._lastclip[0][0] = sc[0][0];
    this._lastclip[0][1] = sc[0][1];
    this._lastclip[1][0] = sc[1][0];
    this._lastclip[1][1] = sc[1][1];
    
    ctx.rect(sc[0][0], (v[0][1]+sc[0][1]), sc[1][0], sc[1][1]);
    //ctx.clip();
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
    
   // this.trilist.line_strip(lines, colors, undefined, undefined, half);
  }
  
   box1(Array<float> pos, Array<float> size, Array<float> clr=undefined, 
        float rfac=undefined, Boolean outline_only=false) 
  {
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
        
        this.quad(v1, v2, v3, v4, color(i1), color(i2), color(i3), color(i4));
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
    //this.trilist.line_strip(lines, colors, undefined, 4, true);
    //this.box2(pos, size, clr, rfac, outline_only);
  }
 
  tri_aa(v1, v2, v3, c1, c2, c3) {
    this.tri(v1, v2, v3, c1, c2, c3);
  }
  
  text(Array<float> pos1, String text, Array<float> color, float fontsize, 
       float scale, float rot, Array<float> scissor_pos, Array<float> scissor_size)
  {
    var canvas = get_2d_canvas().canvas;
    var ctx = get_2d_canvas().ctx;
    var v = g_app_state.raster.viewport;
    static pos = [0, 0, 0];
    var lines = text.split("\n");
    
    if (text[0] != "\n" && text[1] != "\r" && lines[0].trim() == "") {
      lines = lines.splice(1, lines.length);
    }
    
    if (rot == undefined)
      rot = 0;
    
    var ly = 0;
    for (var i=0; i<lines.length; i++, ly += 12) {
      var w = ctx.measureText(lines[i]).width;
      
      var m = this.transmat.$matrix;
      pos[0] = m.m41+v[0][0]+pos1[0];
      pos[1] = canvas.height-(m.m42+v[0][1]+pos1[1] + ly);
      pos[2] = 0;
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this._set_scissor();
      
      ctx.rotate(rot);
      
      //hack, assuming 90 degrees here
      if (rot != 0) {
        pos[1] -= w;
      }
      
      rot2d(pos, -rot);
     
      pos[1] = canvas.height - pos[1];
      //ctx.translate(Math.floor(m.m41), Math.floor(canvas.height - m.m42));
      //console.log(m.m41, canvas.height-m.m42);
      
      if (color == undefined)
        color = [0, 0, 0, 1];
      
      ctx.fillStyle = this._css_color(color);
      
      var x = pos[0], y = canvas.height - (pos[1]);
      ctx.fillText(lines[i], x, y);
    }
  }
  
  line(v1, v2, c1, c2) {
    var canvas = get_2d_canvas().canvas;
    var ctx = get_2d_canvas().ctx;
    var v = g_app_state.raster.viewport;
    
    this._set_scissor();
    
    var m = this.transmat.$matrix;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    //ctx.translate(Math.floor(m.m41), Math.floor(canvas.height - m.m42));
    //console.log(m.m41, canvas.height-m.m42);
    
    var x = m.m41, y = m.m42;
    //v[0][0] = 0; v[0][1] = 0; //XXX
    
    ctx.strokeStyle = this._css_color(c1);
    ctx.beginPath();
    ctx.moveTo(v1[0]+x+v[0][0], canvas.height-(v1[1]+y+v[0][1]));
    ctx.lineTo(v2[0]+x+v[0][0], canvas.height-(v2[1]+y+v[0][1]));
    ctx.stroke();
  }
  
  tri(v1, v2, v3, c1, c2, c3) {
    var canvas = get_2d_canvas().canvas;
    var ctx = get_2d_canvas().ctx;
    var v = g_app_state.raster.viewport;
    
    this._set_scissor();
    
    var m = this.transmat.$matrix;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    //ctx.translate(Math.floor(m.m41), Math.floor(canvas.height - m.m42));
    //console.log(m.m41, canvas.height-m.m42);
    
    var x = m.m41, y = m.m42;
    //v[0][0] = 0; v[0][1] = 0; //XXX
    
    ctx.fillStyle = this._css_color(c1);
    ctx.beginPath();
    ctx.moveTo(v1[0]+x+v[0][0], canvas.height-(v1[1]+y+v[0][1]));
    ctx.lineTo(v2[0]+x+v[0][0], canvas.height-(v2[1]+y+v[0][1]));
    ctx.lineTo(v3[0]+x+v[0][0], canvas.height-(v3[1]+y+v[0][1]));
    ctx.fill();
  }
  
  box(pos, size, clr, rfac, outline_only) {
    if (IsMobile || rfac == 0.0)
      return this.box2(pos, size, clr, rfac, outline_only);
    else //XXX
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
 
 
  box2(Array<float> pos, Array<float> size, Array<float> clr=undefined, float rfac=undefined, Boolean outline_only=false) {
    var cs = uicolors["Box"];
    cs = _box_process_clr(cs, clr);
    
    var x = pos[0], y=pos[1];
    var w=size[0], h=size[1];
    
    if (outline_only) {
      this.line([pos[0], pos[1]], [pos[0], pos[1]+size[1]], clr, clr, 1.0);
      this.line([pos[0], pos[1]+size[1]], [pos[0]+size[0], pos[1]+size[1]], clr, clr, 1.0);
      this.line([pos[0]+size[0], pos[1]+size[1]], [pos[0]+size[0], pos[1]], clr, clr, 1.0);
      this.line([pos[0]+size[0], pos[1]], [pos[0], pos[1]], clr, clr, 1.0);
    } else {
      this.quad(CACHEARR3(x, y, 0), CACHEARR3(x+w, y, 0), CACHEARR3(x+w, y+h, 0), CACHEARR3(x, y+h, 0), cs[0], cs[1], cs[2], cs[3]);
    }
  }
  
  textsize(text, size=default_ui_font_size) {
    var box = this.raster.get_font(size).calcsize(text);
    return [box[0], box[1]];
  }
  
  translate(Array<float> off) {
    this.transmat.translate(off[0], off[1], 0.0);
  }
  
  push_transform(mat=undefined) {
    this.trans_stack.push(new Matrix4(this.transmat));
    
    if (mat != undefined)
      this.transmat.multiply(mat);
  }

  pop_transform() {
    this.transmat.load(this.trans_stack.pop());
  }

  //box(
}

var UICanvas = DEBUG.use_2d_uicanvas ? UICanvas2_ : UICanvas_;

function test_canvas2d() {
  var u = new UICanvas2D();
}