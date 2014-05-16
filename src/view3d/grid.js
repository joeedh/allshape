"use strict";

var grid_vshader = """//vertex
    precision mediump float;
    uniform mat4 matrix;
    uniform float alpha;
    
    attribute vec4 vPosition;
    attribute vec4 vColor;
    
    varying vec4 g_Color;
    void main()
    {
       gl_Position = matrix * vPosition;
       vec4 clr = vColor;
       
       clr[3] *= alpha;
       g_Color = clr;
    }
""";

var grid_fshader = """//fragment
  precision mediump float;
  uniform vec2 viewport; //size

  varying vec4 g_Color;
  
  void main()
  {
    vec4 clr = g_Color;
    gl_FragColor = clr;
  }
""";

var GridTypes = {CART: 1, TRIANGLE: 2};
var GridFlags = {
  XRULER: 1,
  YRULER: 2,
  ZRULER: 4,
  DEFAULT: 1|2|4
};

class GridBuffer {
  constructor(vbuf, cbuf, totline) {
    this.vbuf = vbuf;
    this.cbuf = cbuf;
    this.totline = totline;
  }
  
  destroy(gl) {
    gl.deleteBuffer(this.vbuf);
    gl.deleteBuffer(this.cbuf);
  }
  
  on_draw(gl, drawmats, shader, alpha=1.0) {
    gl.useProgram(shader.program);
    
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    
    gl.disableVertexAttribArray(2);
    gl.disableVertexAttribArray(3);
    gl.disableVertexAttribArray(4);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuf);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cbuf);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    
    drawmats.rendermat.setUniform(gl, shader.uniformloc(gl, "matrix"));
    gl.uniform1f(shader.uniformloc(gl, "alpha"), alpha);
    
    gl.drawArrays(gl.LINES, 0, this.totline*2.0);
  }
}

class ViewGrid {
  constructor(steps=8, substeps=4) {
    this.steps = steps;
    this.substeps = substeps;
    this.substep_level = 2;
    
    this.unit = g_app_state.session.settings.unit;
    this.unit_size = undefined : float;
    
    this.rulerunit = this.unit;
    this.type = GridTypes.CART;
    
    //roughly one foot grid
    this.static_range = [[-15, -15, -15], [15, 15, 15]];
    this.range = [new Vector3(this.static_range[0]), new Vector3(this.static_range[1])];
    
    this.buffers = new GArray();
    
    this.dir = new Vector3([0, 0, 1.0]);
    
    this.auto_steps = true;
    this.flag = GridFlags.DEFAULT;
    this.recalc = 1;
    this.shader = undefined;
    this.totline = 0;
    
    this.vbuf = this.cbuf = undefined;
  }
  
  on_tick() {
    this.unit = g_app_state.session.settings.unit;
    this.rulerunit = this.unit;
  }
  
  on_gl_lost(new_gl) {
    this.buffers = new GArray();
    this.shader = undefined;
    this.cbuf = undefined;
    this.vbuf = undefined;
    this.recalc = 1;
  }
  
  simplegrid(line, steps, start, ival, range, clr, xstart=0, ystart=xstart) {
    static co1 = new Vector3();
    static co2 = new Vector3();
    
    for (var x=xstart; x<steps; x++) {
      //lines aligned with x axis
      co1[0] = co2[0] = start[0] + ival[0]*x;
      co1[1] = range[0][1]; co2[1] = range[1][1];
      
      //don't overdraw axis lines
      if (co1[0] != 0)
        line(co1, co2, clr, clr);
      for (var y=ystart; y<steps; y++) {
        //lines aligned with y axis
        co1[1] = co2[1] = start[1] + ival[1]*y;
        co1[0] = range[0][0]; co2[0] = range[1][0];
        
        //don't overdraw axis lines
        if (co1[1] != 0)
          line(co1, co2, clr, clr);
      }
    }
  }
  
  gen_steps() {
    //align steps/substeps such that
    //one grid cell equals default unit
    
    this.unit = g_app_state.session.settings.unit; 
    
    var unit = Unit.get_unit(this.unit)[0];
    var usize = unit.to_normalized(1.0);
    this.unit_size = usize;
    
    console.log("usize: ", usize);
    
    if (this.static_range != undefined) {
      this.range[0].load(this.static_range[0]);
      this.range[1].load(this.static_range[1]);
    }
    
    var r = this.range;
    for (var i=0; i<3; i++) {
      r[0][i] = Math.round(r[0][i]/usize)*usize;
      r[1][i] = Math.round(r[1][i]/usize)*usize;
      
      r[0][i] = Math.min(-usize, r[0][i]);
      r[1][i] = Math.max(usize, r[1][i]);
    }
    
    var steps = (r[1][0] - r[0][0])/usize;
    var substeps;
    
    console.log("->steps1:", steps);
    if (steps < 1) {
      steps = unit.attrs.grid_steps;
      substeps = unit.attrs.grid_substeps;
    } else if (steps < 4) {
      steps *= unit.attrs.grid_steps;
      substeps = unit.attrs.grid_substeps;
    } else {
      substeps = unit.attrs.grid_substeps;
    }
    
    //sanity check
    steps = Math.min(steps, 50);
    substeps = Math.min(steps, 16);
    
    console.log("->steps2:", steps, unit.attrs.grid_steps, unit.attrs.grid_substeps);
    
    this.steps = steps;
    this.substeps = substeps;
  }
  
  _gen_buffer(gl, cos, colors, totline) {
    var buf = new GridBuffer(undefined, undefined, totline);
    
    buf.totline = totline;
    cos = new Float32Array(cos);
    colors = new Float32Array(colors);
    
    var vbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
    gl.bufferData(gl.ARRAY_BUFFER, cos, gl.STATIC_DRAW);
    buf.vbuf = vbuf;
    
    var cbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cbuf);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    buf.cbuf = cbuf;
    
    return buf;
  }
  
  destroy(gl) {
    for (var b in this.buffers) {
      b.destroy(gl);
    }
    
    this.buffers = new GArray();
    this.recalc = 1;
  }
  gen_buffers(gl) {
    if (this.auto_steps)
      this.gen_steps();
     
    if (this.shader == undefined) {
      this.shader = new ShaderProgram(gl, grid_vshader, grid_fshader, ["vPosition", "vColor"]);
    }
    
    for (var buf in this.buffers) {
      buf.destroy(gl);
    }
    this.buffers = new GArray();
    
    this.recalc = 0;
    var cos = [];
    var colors = [];
    var totline = 0;
    
    function line(a, b, ca, cb) {
      for (var i=0; i<3; i++) {
        cos.push(a[i]);
        colors.push(ca[i]);
      }
      colors.push(ca[3]);
      
      for (var i=0; i<3; i++) {
        cos.push(b[i]);
        colors.push(cb[i]);
      }
      colors.push(cb[3]);
      
      totline++;
    }
    
    var lineclr = colors3d["GridLine"];
    var boldclr = colors3d["GridLineBold"];
    var xclr = colors3d["AxisX"];
    var yclr = colors3d["AxisY"];
    var zclr = colors3d["AxisZ"];
    var range = this.range;
    
    var d = 10000;
    line([d, 0, 0], [-d, 0, 0], xclr, xclr);
    line([0, d, 0], [0, -d, 0], yclr, yclr);
    line([0, 0, d], [0, 0, -d], zclr, zclr);
   
    if (this.type == GridTypes.CART) {
      var steps = this.steps;
      var substeps = this.substeps;
      
      var ival = new Vector3(this.range[1]).sub(this.range[0]).divScalar(steps);
      
      var start = this.range[0];
      
      //generate first buffer of bolded lines
      this.simplegrid(line, steps, start, ival, range, boldclr);
      this.buffers.push(this._gen_buffer(gl, cos, colors, totline));
      
      //reset for second buffer
      cos.length = 0; colors.length = 0; totline = 0;
      
      var subval = new Vector3(ival).divScalar(substeps);
      var start2 = new Vector3();
      var subrange = [new Vector3(), new Vector3()];
      
      for (var x=0; x<steps; x++) {
        for (var y=0; y<steps; y++) {
          start2[0] = range[0][0] + ival[0]*x;
          start2[1] = range[0][1] + ival[1]*y;
          subrange[0].load(start2);
          subrange[1].load(start2).add(ival);
          
          this.simplegrid(line, substeps, start2, subval, subrange, lineclr, 1);
        }
      }
    }
    
    this.buffers.push(this._gen_buffer(gl, cos, colors, totline));
  }
  
  on_draw(gl, drawmats, zoom) { //zoom should be a camera zoff in centimeters
    gl.enable(gl.BLEND);

    if (this.unit != g_app_state.session.settings.unit)
      this.recalc = 1;
    
    if (this.recalc)
      this.gen_buffers(gl);
    
    var shader = this.shader;
    var za;
    
    //adjust substep alpha for zoom level
    if (zoom < 0) {
      za = zoom / -200;
      za = 1.0 - Math.max(Math.min(za, 1.0), 0.0);
    } else {
      za = 1.0;
    }
    //first buffer is bold .steps
    //second buffer is .substeps
    this.buffers[0].on_draw(gl, drawmats, shader, 1.0);
    
    if (za != 0.0)
      this.buffers[1].on_draw(gl, drawmats, shader, za);
  }
  
  static fromSTRUCT(reader) {
    var grid = new ViewGrid(1);
    
    reader(grid);
    reader.bb = [reader.bb_min, reader.bb_max];
    
    delete reader.bb_min 
    delete reader.bb_max
    
    return grid;
  }
}

ViewGrid.STRUCT = """
  ViewGrid {
    steps         : int;
    substeps      : int;
    substep_level : int;
    unit          : string;
    rulerunit     : string;
    type          : int;
    bb_min        : vec3 | obj.bb[0];
    bb_max        : vec3 | obj.bb[1];
    dir           : vec3;
    flag          : int;
  }
""";
