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
    
    this.canvas = c.canvas;
    this.ctx = c.ctx;
    
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
        for (var c in n.children) {
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
    
    ctx.fillStyle = this._css_color(c1);
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
  
  tri_aa(v1, v2, v3, c1, c2, c3) {
    this.tri(v1, v2, v3, c1, c2, c3);
  }
  
  text(Array<float> pos, String text, Array<float> color, float fontsize, 
       float scale, float rot, Array<float> scissor_pos, Array<float> scissor_size)
  {
    var canvas = get_2d_canvas().canvas;
    var ctx = get_2d_canvas().ctx;
    var v = g_app_state.raster.viewport;
    
    var m = this.transmat.$matrix;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    //ctx.translate(Math.floor(m.m41), Math.floor(canvas.height - m.m42));
    //console.log(m.m41, canvas.height-m.m42);
    
    if (color == undefined)
      color = [0, 0, 0, 1];
    
    ctx.fillStyle = this._css_color(color);
    
    var x = m.m41+v[0][0]+pos[0], y = canvas.height - (m.m42+v[0][1]+pos[1]);
    ctx.fillText(text, x, y);
  }
  
  line(v1, v2, c1, c2) {
    var canvas = get_2d_canvas().canvas;
    var ctx = get_2d_canvas().ctx;
    var v = g_app_state.raster.viewport;
    
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
  
  box(Array<float> pos, Array<float> size, Array<float> clr=undefined, float rfac=undefined, Boolean outline_only=false) {
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