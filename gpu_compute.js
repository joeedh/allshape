function ComputeShaderProgram(WebGLRenderingContext gl, ShaderProgram vshader, 
                              ShaderProgram fshader, Array<String> attribs) 
{
 // create our shaders
    var vertexShader = loadShader(gl, vshader);
    var fragmentShader = loadShader(gl, fshader);

    // Create the program object
    var program = gl.createProgram();

    // Attach our two shaders to the program
    gl.attachShader (program, vertexShader);
    gl.attachShader (program, fragmentShader);

    // Bind attributes
    for (var i = 0; i < attribs.length; ++i)
        gl.bindAttribLocation (program, i, attribs[i]);

    // Link the program
    gl.linkProgram(program);

    // Check the link status
    var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked && !gl.isContextLost()) {
        // something went wrong with the link
        var error = gl.getProgramInfoLog (program);
        //console.log("Error in program linking:"+error);

        gl.deleteProgram(program);
        gl.deleteProgram(fragmentShader);
        gl.deleteProgram(vertexShader);

        return null;
    }

    this.program = program;
}

timeoff = 0.0;

_rnd_tab = [];
for (var x=0; x<32*32*32*4; x++) {
  _rnd_tab.push(Math.random());
}

function GPUCompute(WebGLRenderingContext gl, ShaderProgram vshader, 
                    ShaderProgram fshader, Array<String> attribs) 
{
  if (attribs == undefined)
    attribs = []
    
  attribs.push("vPosition");
  this.program = new ComputeShaderProgram(gl, vshader, fshader, attribs);
  this.gl = gl;
  this.data = null;
  this.datalength = 0;
  this.fbuf = 0;
  
  this.compute = function(do_draw) { //do_draw is optional
    var program = this.program
    var gl = this.gl
    
    /*create the texture that stores various utility tables*/
    gl.activeTexture(gl.TEXTURE1);
    var utiltex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, utiltex);
    
    
    /*format of util tex:
      
      0-64: lookup table for integer shift operation
         [mul_part_1, mul_part_2],...
      use by multiplying by part 1 and part 2
      64-35: float precision information
        precision
        rangemin
        rangemax
    */
    
    var data = new Uint8Array(new ArrayBuffer(67))
    for (var i=0; i<32; i++) {
      if (i < 8) {
        data[i*2] = 1<<(i);
        data[i*2+1] = 1;
      } else {
        data[i*2] = 128;
        data[i*2+1] = 1<<(i-7);
      }
    }
    
    /*float precision information*/
    var float_prec = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    //console.log("float precision:", float_prec.precision, float_prec.rangeMin, float_prec.rangeMax)

    data[64] = float_prec.precision;
    data[65] = float_prec.rangeMin;
    data[66] = float_prec.rangeMax;
      
    /*upload util texture*/
    var util_w = data.length;
    data = new Uint8Array(data);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, data.length, 1,
                  0, gl.ALPHA, gl.UNSIGNED_BYTE, data);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    gl.activeTexture(gl.TEXTURE0);
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    var size = [1024, 1024]
    
    //console.log(gl.getSupportedExtensions());
    
    /*build texture for random function*/
    var data = new ArrayBuffer(32*32*4*4);
    data = new Float32Array(data);
    for (var x=0; x<_rnd_tab.length; x++) {
      data[x] = _rnd_tab[x];
    }
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 32, 32,
                  0, gl.RGBA, gl.FLOAT, data);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    
    var fbuf = null, rbuf = null;
    if (!do_draw) {
      if (!this.fbuf) {
        this.fbuf = gl.createFramebuffer()
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbuf);
    
        this.rbuf = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.rbuf);
      
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA4, size[0], size[1]);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                                  gl.RENDERBUFFER, this.rbuf);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbuf);
      }
      //console.log("status: " + gl.checkFramebufferStatus(gl.FRAMEBUFFER));
    }
    
    var d = 1.0;
    var points = [
      -d, -d, 0.5,  -d,  d, 0.5,  d,  d, 0.5,
      -d, -d, 0.5,   d,  d, 0.5,  d, -d, 0.5
    ];
    
    //points.reverse();
    points = new Float32Array(points);
    
    gl.disableVertexAttribArray(0);
    gl.disableVertexAttribArray(1);
    gl.disableVertexAttribArray(2);
    gl.disableVertexAttribArray(3);
    
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.DITHER);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    
    var vport = gl.getParameter(gl.VIEWPORT);
    
    gl.viewport(0, 0, size[0], size[1]);
    
    gl.useProgram(program.program);
    gl.uniform1i(gl.getUniformLocation(program.program, "sampler2d"), 0);
    gl.uniform1i(gl.getUniformLocation(program.program, "sampler2d_util_tab"), 1);
    gl.uniform1f(gl.getUniformLocation(program.program, "width"), size[0]);
    gl.uniform1f(gl.getUniformLocation(program.program, "height"), size[1]);
    gl.uniform1f(gl.getUniformLocation(program.program, "util_w"), util_w);
    
    timeoff = (timeoff+0.04)// % 3.141592654;
    gl.uniform1f(gl.getUniformLocation(program.program, "time"), timeoff);
    
    gl.enableVertexAttribArray(0);
    var cubebuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubebuf);
    gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
    
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    if (!do_draw) {
      gl.flush();
      gl.finish();
    }
    
    if (this.data == null || this.datalength < size[0]*size[1]*4*4) {
      this.data = new ArrayBuffer(size[0]*size[1]*4*4);
      this.datalength = size[0]*size[1]*4*4;
      console.log("Creating data buffer");
    }
    
    pixels = new Uint8Array(this.data);
    gl.readPixels(0, 0, size[0], size[1], 
                  gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    
    //console.log(pixels[0], pixels[1], pixels[2], pixels[3])
    //console.log(pixels[4], pixels[5], pixels[6], pixels[7])
    
    //var tst = new Uint8Array([pixels[0], pixels[1], pixels[2], pixels[3]])
    floatbuf = new Float32Array(this.data); //, 0, Math.floor(size[0]*size[1]));

    /*console.log(floatbuf[0], floatbuf[1], floatbuf[2], floatbuf[3]);
    console.log(floatbuf[62], floatbuf[63], floatbuf[64], floatbuf[65]);
    */
    
    /*tst = new Float32Array(tst.buffer, 0, Math.floor(size[0]*size[1]));
    tst[0] = 0.2345;
    tst = new Uint8Array(tst.buffer, 0, 4);*/
    //console.log(tst[0], tst[1], tst[2], tst[3])
    
    
    /*
    **example of casting array types:
    **
    var tst = new Uint8Array([255, 255, 0, 0])
    tst = new Int32Array(tst.buffer, 0, tst.length/4);
    
    console.log(tst[0])
    */
    
    gl.deleteTexture(tex);
    gl.deleteTexture(utiltex);
    gl.deleteBuffer(cubebuf);
    
    if (!do_draw) {
      gl.bindRenderbuffer(gl.RENDERBUFFER, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      
      gl.clearColor(0, 0, 0.5, 1);
      gl.clearDepth(10000);
    }
    
    gl.viewport(vport[0], vport[1], vport[2], vport[3]);        
    
    gl.enableVertexAttribArray(2);
    gl.enableVertexAttribArray(3);
    return [size, floatbuf];
  }
}

function test_gpu_compute(WebGLRenderingContext gl)
{
  gpuc = new GPUCompute(gl, "compute_vshader", "compute_fshader");
  
  return gpuc;
}