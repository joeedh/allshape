//#include "src/core/utildefine.js"

#define CACHEARR2(a, b) [a, b]
#define CACHEARR3(a, b, c) [a, b, c]

var _fdata = {
  "10" : [fontinfo10, "content/fontgen10.png"],
  "12" : [fontinfo12, "content/fontgen12.png"],
  "14" : [fontinfo14, "content/fontgen14.png"]
};

class FontManager {
  constructor() {
    this.sizes = new set([10, 12, 14]);
    this.fonts = {};
  }
  
  get_font(WebGLRenderingContext gl, RasterState raster, int size) : Font {
    if (!(this.sizes.has(size))) {
      console.trace();
      console.log("Warning: bad font size " + size, list(this.sizes).toString());
      
      var match = undefined;
      for (var size2 in this.sizes) {
        if (match == undefined || Math.abs(size2-size) < Math.abs(match-size)) {
          match = size2;
        }
      }
      
      size = match;
    }
    
    if (!(size in this.fonts)) {
      this.fonts[size] = new Font(gl, raster, size, _fdata[size][0], _fdata[size][1]);
    }
    
    return this.fonts[size];
  }
}

default_font_color = new Float32Array([0.9, 0.8, 0.3, 1.0]);

function FontAddCharFunc(Array<Array<float>> vrect, Array<Array<float>> trect);

var _st_vr = [0, 0, 0, 0];
var _st_tr = [0, 0, 0, 0];
//static cached return values for calc_string, to avoid 
//object (array) creation overhead
var _cs_rt = [];
for (var i=0; i<128; i++) {
  _cs_rt.push([[0,0], [0,0]]);
}

var _cs_cur_rt = 0;

function Font(WebGLRenderingContext gl, RasterState raster, int size, 
              Object font_info, String font_file) 
{
  this.finfo = font_info;
  
  console.log(gl);
  this.tex = gl.createTexture();
  this.raster = raster;
  
  this.destroy = function(WebGLRenderingContext gl) {
    if (this.tex != null) {
      gl.deleteTexture(this.tex);
      this.tex = null;
    }
  }
  
  this.tex.image = new Image();
  this.space_width = 4;
  this.tab_width = this.space_width*2;
  this.kern_off = 0;
  this.linehgt = 18;
  
  var thetex = this.tex;
  this.tex.ready = false;
  this.tex.image.onload = function() {
    var tex = thetex;
    
    gl.bindTexture(gl.TEXTURE_2D, tex);
    //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, tex.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    
    tex.ready = true;
  }
  this.tex.image.src = font_file;
  
  this.shader = new ShaderProgram(gl, "2d_text_vshader", "2d_text_fshader", ["vPosition", "vTexCoord"]);
  
  this.calclength = function(String text) : float {
    return this.calcsize(text)[0];
  }
  
  this._static_minmax = new MinMax(2);
  this.calcsize = function(String text) : Array<float> {
    var mm = this._static_minmax;
    
    mm.reset();
    
    var ret = this.split_text(text);
    var lines = ret[0], totline=ret[1];
    
    var y = 0;
    for (var i=0; i<totline; i++) {
      var bound = this.calc_string(lines[i]);
      y += this.linehgt;
      
      mm.minmax(CACHEARR2(bound[0][0], bound[1][0]+y));
      mm.minmax(CACHEARR2(bound[0][1], bound[1][1]+y));
      mm.minmax(CACHEARR2(bound[0][0], bound[1][1]+y));
      mm.minmax(CACHEARR2(bound[0][1], bound[1][0]+y));
    }
    
    var ret = _cs_rt[_cs_cur_rt][0];
    _cs_cur_rt = (_cs_cur_rt+1) % _cs_rt.length;
    
    ret[0] = mm.max[0]-mm.min[0];
    ret[1] = mm.max[1]-mm.min[1];
    
    return ret;
  }
  
  this.calc_string = function(String text, FontAddCharFunc add_char) : Array<Array<float>> { //add_char is optional (vrect, trect) function
    var x=0, y=0, minx=10000, miny=10000, maxx=-10000, maxy=-10000;
    var sw = this.space_width;
    var tabw = this.tab_width;
    var finfo = this.finfo
    
    static one_space_str = "";
    static one_tab_str = "\t";
    static one_lf_str = "\n";
    static questioncode = "?".charCodeAt(0);
    static null_add_char = function(vrect, trect) {}; //be careful with static expr functions in the future
    
    if (text == undefined) {
      text = one_space_str;
    }
    
    if (add_char == undefined) {
      add_char = null_add_char;
    }
    
    kern = this.kern_off;
    
    for (var i=0; i<text.length; i++) {
      if (text[i] == one_space_str) {
        minx = Math.min(minx, x);
        x += sw;
        continue;
      } else if (text[i] == one_tab_str) {
        minx = Math.min(minx, x);
        x += tabw;
        continue;
      }
      
      var c = text.charCodeAt(i);
      
      if (!finfo.g.hasOwnProperty(c)) {
        console.log("Could not find glyph for character code", c, text[i]);
        c = questioncode;
      }
      
      var g = finfo.g[c];
      var vrect = _st_vr;
      
      vrect[0] = x+g.b[0];
      vrect[1] = y+g.b[1]-g.s[1];
      vrect[2] = g.s[0];
      vrect[3] = g.s[1];
      
      var trect = _st_tr;
      trect[0] = g.c[0]
      trect[1] = g.c[1]+g.bs[1]
      trect[2] = g.bs[0]
      trect[3] = -g.bs[1]
      
      add_char(vrect, trect);
      
      miny = Math.min(miny, 0);
      maxy = Math.max(maxy, vrect[1]+vrect[3]);
      
      minx = Math.min(minx, vrect[0]);
      maxx = Math.max(maxx, vrect[0]+vrect[2]);
      
      x += g.a + kern;
    }
    
    if (maxx == -10000) {
      minx = 0;
      maxx = x;
      miny = 0;
      maxy = this.linehgt;
    }
    
    var ret = _cs_rt[_cs_cur_rt];
    _cs_cur_rt = (_cs_cur_rt+1) % _cs_rt.length;
    
    //[[minx, maxx], [miny, maxy]].  that's stupid of me.
    ret[0][0] = minx; ret[0][1] = Math.max(maxx, x);
    ret[1][0] = miny; ret[1][1] = maxy;
    return ret;
  };
  
  //slow!
  this.draw_text = function(WebGLRenderingContext gl, int x, 
                            int y, String text, Array<float> clr,
                            Matrix4 mat) 
  { //clr is optional, defaults to default_font_color
    if (clr == undefined) 
      clr = default_font_color;
    
    x = Math.floor(x);
    y = Math.floor(y);
    
    gl.disableVertexAttribArray(2);
    gl.disableVertexAttribArray(3);
    
    var shader = this.shader;
    var program = this.shader.program;
    gl.useProgram(program);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    
    gl.uniform1i(shader.uniformloc(gl, "sampler2d"), 0);
    gl.uniform4fv(shader.uniformloc(gl, "uColor"), clr);
    gl.uniform3fv(shader.uniformloc(gl, "uLocation"), [0, 0, 0]);
    
    verts = new Array<float>();
    texcos = new Array<float>();
    
    function add_rect(arr, x1, y1, w, h) {
      var x2 = x1 + w;
      var y2 = y1 + h;
      
      arr.push(x1); arr.push(y1);
      arr.push(x1); arr.push(y2);
      arr.push(x2); arr.push(y2);
      
      arr.push(x1); arr.push(y1);
      arr.push(x2); arr.push(y2);
      arr.push(x2); arr.push(y1);
    }
    
    var raster = this.raster;
    var finfo = this.finfo;
    
    var v3 = new Vector3();
    function transform_verts(Array<float> verts) {
      for (var i=0; i<verts.length/2; i++) {
        v3.load([verts[i*2], verts[i*2+1], 0.0])
        if (mat != undefined) {
          v3.multVecMatrix(mat);
          verts[i*2] = v3[0];
          verts[i*2+1] = v3[1];
        }
        verts[i*2] = (verts[i*2]/raster.size[0])*2.0 - 1.0;
        verts[i*2+1] = (verts[i*2+1]/raster.size[1])*2.0 - 1.0;
      }
    }
    
    function transform_texcos(Array<float> texcos) {
      for (var i=0; i<texcos.length/2; i++) {
        texcos[i*2] = (texcos[i*2]/finfo.s[0]);
        texcos[i*2+1] = (texcos[i*2+1]/finfo.s[1]);
      }
    }
    
    function add_char(Array<float> vrect, Array<float> trect) {
      add_rect(verts, x+vrect[0], y+vrect[1], vrect[2], vrect[3]);
      add_rect(texcos, trect[0], trect[1], trect[2], trect[3]);
    }
    
    var ret = this.calc_string(text, add_char);
    /*move coordinates onto origin*/
    for (var i=0; i<verts.length/2; i++) {
      //verts[i*2] -= ret[0][0];
      //verts[i*2+1] -= ret[1][0];
    }
    
    transform_verts(verts);
    transform_texcos(texcos);
    
    verts = new Float32Array(verts);
    texcos = new Float32Array(texcos);
    
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    
    vbuf = gl.createBuffer();    
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    tbuf = gl.createBuffer();    
    gl.bindBuffer(gl.ARRAY_BUFFER, tbuf);
    gl.bufferData(gl.ARRAY_BUFFER, texcos, gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl_blend_func(gl);
    
    gl.drawArrays(gl.TRIANGLES, 0, verts.length/2);
    
    gl.disableVertexAttribArray(0);
    gl.disableVertexAttribArray(1);
    
    gl.deleteBuffer(vbuf);
    gl.deleteBuffer(tbuf);
  }
  
  this._static_split_text = new GArray([0,0,0,0,0]);
  this._st_tx_rt = [0, 0];
  
  this.split_text = function(text) {
    var i = 0;
    var lines = this._static_split_text;
    static empty_str = "";
    static slashn = "\n";
    
    lines[0] = empty_str
    
    for (var j=0; j<text.length; j++) {
      if (text[j] == slashn) {
        i++;
        if (i >= lines.length) {
          lines.push(0);
        }
        
        lines[i] = empty_str;
      } else {
        lines[i] += text[j];
      }
    }
    
    var ret = this._st_tx_rt;
    ret[0] = lines;
    ret[1] = i+1;
    
    return ret;
  }
  
  this.gen_text_buffers = function(WebGLRenderingContext gl, String text, 
                                   Array<float> clr, Array<float> viewport) 
  { //clr is optional, defaults to default_font_color
    var ret = this.split_text(text);
    var lines = ret[0]; totline = ret[1];
    
    if (clr == undefined) 
      clr = default_font_color;
    
    verts = new Array<float>();
    texcos = new Array<float>();
    var x=0, y=0;
    
    function add_rect(arr, x1, y1, w, h) {
      var x2 = x1 + w;
      var y2 = y1 + h;
      
      arr.push(x1); arr.push(y1);
      arr.push(x1); arr.push(y2);
      arr.push(x2); arr.push(y2);
      
      arr.push(x1); arr.push(y1);
      arr.push(x2); arr.push(y2);
      arr.push(x2); arr.push(y1);
    }
    
    var raster = this.raster;
    var finfo = this.finfo;
    
    var v3 = new Vector3();
    
    function transform_verts(Array<float> verts) {
      static ret = [undefined, undefined, undefined, undefined];
      
      ret[0] = 1e8; ret[1] = 1e8; ret[2] = -1e8; ret[3] = -1e8;
      
      for (var i=0; i<verts.length/2; i++) {
        verts[i*2] = (verts[i*2]/viewport[1][0])*2.0 - 1.0;
        verts[i*2+1] = (verts[i*2+1]/viewport[1][1])*2.0 - 1.0;
        
        ret[0] = Math.min(ret[0], verts[i*2])
        ret[1] = Math.min(ret[1], verts[i*2+1])
        ret[2] = Math.max(ret[2], verts[i*2])
        ret[3] = Math.max(ret[3], verts[i*2+1])
      }
      
      ret[0] = (ret[0]);
      ret[1] = (ret[1]);
      ret[3] = 0.0;
      
      for (var i=0; i<verts.length/2; i++) {
        //make sure origin is at center of text
        verts[i*2] -= ret[0];
        verts[i*2+1] -= ret[1];
      }
      
      return ret; //normalized display coordinates
    }
    
    function transform_texcos(Array<float> texcos) {
      var size = finfo.s;
      var len = texcos.length/2;
      
      for (var i=0; i<len; i++) {
        texcos[i*2] /= size[0];
        texcos[i*2+1] /= size[1];
      }
    }
    
    function add_char(Array<float> vrect, Array<float> trect) {
      add_rect(verts, x+vrect[0], y+vrect[1], vrect[2], vrect[3]);
      add_rect(texcos, trect[0], trect[1], trect[2], trect[3]);
    }
    
    for (var j=totline-1; j>=0; j--) {
      var ret = this.calc_string(lines[j], add_char);
      y += ret[1][1] - ret[1][0] + 4;
      //x = Math.max(ret[0][1]);
    }
    
    var cent = transform_verts(verts);
    transform_texcos(texcos);
    
    verts = new Float32Array(verts);
    texcos = new Float32Array(texcos);
    
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    
    vbuf = gl.createBuffer();    
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    tbuf = gl.createBuffer();    
    gl.bindBuffer(gl.ARRAY_BUFFER, tbuf);
    gl.bufferData(gl.ARRAY_BUFFER, texcos, gl.STATIC_DRAW);
    
    return new TextDrawBuffer(vbuf, tbuf, verts.length, clr, gl, this.shader, this.tex, cent);
  }
}

class TextDrawBuffer {
  constructor(vbuf, tbuf, vlen, clr, gl, shader, tex, origin) {
    this.vbuf = vbuf;
    this.tbuf = tbuf;
    this.is_dead = false;
    this.origin = [origin[0], origin[1], 0.0];
    this.vlen = vlen;
    this.clr = new Float32Array(clr);
    this.gl = gl;
    this.tex = tex;
    this.shader = shader;
    this.users = []; //XXX possible evil!
  }

  on_draw(gl, loc=[0,0,0], size=[1,1,1]) {
    if (!this.tex.ready)
      return;
    
    gl.enable(gl.BLEND);
    gl_blend_func(gl);
    
    //gl.blendEquation(gl.BLEND_EQUATION);
    //gl.blendEquationSeparate(gl.BLEND_EQUATION, gl.BLEND_EQUATION);
    
    var shader = this.shader;
    var program = shader.program;
    gl.useProgram(program);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    
    var origin = this.origin;
    var l = CACHEARR3(loc[0]+origin[0], loc[1]+origin[1], loc[2]+origin[2]);
    
    gl.uniform1i(shader.uniformloc(gl, "sampler2d"), 0);
    gl.uniform4fv(shader.uniformloc(gl, "uColor"), this.clr);
    gl.uniform3fv(shader.uniformloc(gl, "uLoc"), l);
    gl.uniform3fv(shader.uniformloc(gl, "uSize"), size);
    
    gl.disableVertexAttribArray(2);
    gl.disableVertexAttribArray(3);
    
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
      
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuf);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tbuf);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

    gl.disable(gl.DEPTH_TEST);
    
    gl.drawArrays(gl.TRIANGLES, 0, this.vlen/2);
    
    gl.disableVertexAttribArray(0);
    gl.disableVertexAttribArray(1);
  }

  destroy() {
    var gl = this.gl;
    
    this.is_dead = true;
    
    gl.deleteBuffer(this.vbuf);
    gl.deleteBuffer(this.tbuf);
  }
}
