font_file = "/content/font_out.png"

default_font_color = new Float32Array([0.9, 0.8, 0.3, 1.0]);

function FontAddCharFunc(Array<Array<float>> vrect, Array<Array<float>> trect);

var _st_vr = [0, 0, 0, 0];
var _st_tr = [0, 0, 0, 0];
//static cached return values for calc_string, to avoid 
//object (array) creation overhead
var _cs_rt = [];
for (var i=0; i<32; i++) {
  _cs_rt.push([[0,0], [0,0]]);
}

var _cs_cur_rt = 0;

function Font(WebGLRenderingContext gl, RasterState raster) {
  this.finfo = font_info;
  
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
  this.linehgt = 11;
  
  var thetex = this.tex;
  this.tex.image.onload = function() {
    var tex = thetex;
    
    gl.bindTexture(gl.TEXTURE_2D, tex);
    //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, tex.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  this.tex.image.src = font_file;
  
  this.shader = new ShaderProgram(gl, "2d_text_vshader", "2d_text_fshader", ["vPosition", "vTexCoord"]);
  
  this.calclength = function(String text) : float {
    return this.calcsize(text)[0];
  }
  
  this._static_minmax = new MinMax(2);
  this.calcsize = function(String text) : float {
    var mm = this._static_minmax;
    
    mm.reset();
    
    var ret = this.split_text(text);
    var lines = ret[0], totline=ret[1];
    
    var y = 0;
    for (var i=0; i<totline; i++) {
      var bound = this.calc_string(lines[i]);
      mm.minmax([bound[0][0], bound[1][0]+y]);
      mm.minmax([bound[0][1], bound[1][1]+y]);
      mm.minmax([bound[0][0], bound[1][1]+y]);
      mm.minmax([bound[0][1], bound[1][0]+y]);
      
      y += this.linehgt;
    }
    
    var ret = _cs_rt[_cs_cur_rt][0];
    _cs_cur_rt = (_cs_cur_rt+1) % _cs_rt.length;
    
    ret[0] = mm.max[0]-mm.min[0];
    ret[1] = mm.max[1]-mm.min[1];
    
    return ret;
  }
  
  this.calc_string = function(String text, FontAddCharFunc add_char) : Array<Array<float>> { //add_char is optional (vrect, trect) function
    var x=0, y=0, minx=23423, miny=23432, maxx=-23432, maxy=-2343;
    var sw = this.space_width;
    var tabw = this.tab_width;
    var finfo = this.finfo
    
    if (text == undefined) {
      text = " ";
    }
    
    if (add_char == undefined) {
      add_char = function(vrect, trect) {};
    }
    
    kern = this.kern_off;
    
    for (var i=0; i<text.length; i++) {
      if (text[i] == " ") {
        x += sw;
        continue;
      } else if (text[i] == "\t") {
        x += tabw;
        continue;
      }
      
      var c = text.charCodeAt(i);
      
      if (!finfo.glyphs.hasOwnProperty(c)) {
        console.log("Could not find glyph for character code", c, text[i]);
        c = "?".charCodeAt(0);
      }
      
      var g = finfo.glyphs[c];
      var vrect = _st_vr;
      
      vrect[0] = x+g.bearing[0];
      vrect[1] = y+g.bearing[1]-g.size[1];
      vrect[2] = g.size[0];
      vrect[3] = g.size[1];
      
      var trect = _st_tr;
      trect[0] = g.cellpos[0]
      trect[1] = g.cellpos[1]+g.bitmap_size[1]
      trect[2] = g.bitmap_size[0]
      trect[3] = -g.bitmap_size[1]
      
      add_char(vrect, trect);
      
      miny = Math.min(miny, 0);
      maxy = Math.max(maxy, vrect[1]);
      
      minx = Math.min(minx, vrect[0]);
      maxx = Math.max(maxx, vrect[0]+vrect[2]);
      
      x += g.advance + kern;
    }
    
    if (maxx == -23432) {
      minx = 0;
      maxx = x;
      miny = 0;
      maxy = this.linehgt;
    }
    
    var ret = _cs_rt[_cs_cur_rt];
    _cs_cur_rt = (_cs_cur_rt+1) % _cs_rt.length;
    
    ret[0][0] = minx; ret[0][1] = Math.max(maxx, x);
    ret[1][0] = miny; ret[1][1] = maxy;
    return ret;
  };
  
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
    
    var program = this.shader.program;
    gl.useProgram(program);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(gl.getUniformLocation(program, "sampler2d"), 0);
    gl.uniform4fv(gl.getUniformLocation(program, "uColor"), clr);
    
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
        texcos[i*2] = (texcos[i*2]/finfo.size[0]);
        texcos[i*2+1] = (texcos[i*2+1]/finfo.size[1]);
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
    lines[0] = ""
    
    for (var j=0; j<text.length; j++) {
      if (text[j] == "\n") {
        i++;
        if (i >= lines.length) {
          lines.push(0);
        }
        
        lines[i] = "";
      } else {
        lines[i] += text[j];
      }
    }
    
    var ret = this._st_tx_rt;
    ret[0] = lines;
    ret[1] = i+1;
    
    return ret;
  }
  
  this.gen_text_buffers = function(WebGLRenderingContext gl, int x, 
                            int y, String text, Array<float> clr,
                            Matrix4 mat, Array<float> viewport) 
  { //clr is optional, defaults to default_font_color
    var ret = this.split_text(text);
    var lines = ret[0]; totline = ret[1];
    
    if (clr == undefined) 
      clr = default_font_color;
    
    if (mat != undefined)
      mat.scale(1, 1, 1);
    x = Math.floor(x);
    y = Math.floor(y);
    
    gl.disableVertexAttribArray(2);
    gl.disableVertexAttribArray(3);
    
    var program = this.shader.program;
    gl.useProgram(program);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(gl.getUniformLocation(program, "sampler2d"), 0);
    gl.uniform4fv(gl.getUniformLocation(program, "uColor"), clr);
    
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
          v3[0] = Math.floor(v3[0]);
          v3[1] = Math.floor(v3[1]);
          
          verts[i*2] = v3[0];
          verts[i*2+1] = v3[1];
        }
        verts[i*2] = (verts[i*2]/viewport[1][0])*2.0 - 1.0;
        verts[i*2+1] = (verts[i*2+1]/viewport[1][1])*2.0 - 1.0;
      }
    }
    
    function transform_texcos(Array<float> texcos) {
      var size = finfo.size;
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
      y += this.linehgt;
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

    tbuf = gl.createBuffer();    
    gl.bindBuffer(gl.ARRAY_BUFFER, tbuf);
    gl.bufferData(gl.ARRAY_BUFFER, texcos, gl.STATIC_DRAW);
    
    return new TextDrawBuffer(vbuf, tbuf, verts.length, clr, gl, this.shader, this.tex);
  }
}

function TextDrawBuffer(vbuf, tbuf, vlen, clr, gl, shader, tex) {
  this.vbuf = vbuf;
  this.tbuf = tbuf;
  this.vlen = vlen;
  this.clr = clr;
  this.gl = gl;
  this.tex = tex;
  this.shader = shader;
}

create_prototype(TextDrawBuffer);

TextDrawBuffer.prototype.on_draw = function(gl) {
  gl.enable(gl.BLEND);
  gl_blend_func(gl);
  
  //gl.blendEquation(gl.BLEND_EQUATION);
  //gl.blendEquationSeparate(gl.BLEND_EQUATION, gl.BLEND_EQUATION);

  var program = this.shader.program;
  gl.useProgram(program);
  
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, this.tex);
  
  gl.uniform1i(gl.getUniformLocation(program, "sampler2d"), 0);
  gl.uniform4fv(gl.getUniformLocation(program, "uColor"), new Float32Array(this.clr));
  
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

TextDrawBuffer.prototype.destroy = function() {
  var gl = this.gl;
  
  gl.deleteBuffer(this.vbuf);
  gl.deleteBuffer(this.tbuf);
}
