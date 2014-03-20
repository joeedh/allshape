var FBTypes = {
  RENDERBUFFER : 0,
  TEXTURE2D    : 1
};
  
class FrameBuffer {
  constructor(gl, size, type=FBTypes.RENDERBUFFER, format=[gl.RGBA4, gl.DEPTH_COMPONENT16]) {
    this.size = new Vector2(size);
    this.fbuf = undefined;
    this.rbuf1 = undefined;
    this.rbuf2 = undefined;
    this.gl = gl;
    this.caller = undefined;
    
    this.format = format;
    
    this.type = type;
    this.idmap = {};
    this.textures = undefined;
  }

  destroy(gl) {
    if (this.textures != undefined) {
      for (var t in this.textures) {
        gl.deleteTexture(t);
      }
    }
  }
  
  //returns true if the framebuffer needs to be redrawn
  capture(size, caller) {
    size[0] = Math.ceil(size[0]);
    size[1] = Math.ceil(size[1]);
    
    if (this.fbuf == undefined) {
      this.regen();
      return true;
    }
    
    if (size[0] != this.size[0] || size[1] != this.size[1]) {
      this.size = size;
      this.regen();
      return true;
    }
    
    var c2 = this.caller;
    this.caller = caller;
    
    return c2 != caller;
  }

  regen() {
    var gl = this.gl;
    
    gl.getExtension("WEBGL_depth_texture");
   
    this.size[0] = Math.ceil(this.size[0]);
    this.size[1] = Math.ceil(this.size[1]);
    
    if (this.fbuf != undefined) {
      gl.deleteFramebuffer(this.fbuf);
      gl.deleteRenderbuffer(this.rbuf1);
      gl.deleteRenderbuffer(this.rbuf2);  
    }

    this.fbuf = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbuf);

    if (this.type == FBTypes.RENDERBUFFER) {
      this.rbuf1 = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.rbuf1);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA4, this.size[0], this.size[1]);
      
      this.rbuf2 = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.rbuf2);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.size[0], this.size[1]);
      
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                                gl.RENDERBUFFER, this.rbuf1);
                                
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, 
                                gl.RENDERBUFFER, this.rbuf2);
    } else {
      if (this.textures != undefined) {
        for (var t in this.textures) {
          gl.deleteTexture(t);
        }
      }
      this.textures = new GArray();
      
      /*depth/stencil texture*/
      var tex = gl.createTexture();
      this.textures.push(tex);

      gl.activeTexture(gl.TEXTURE2);
      
      gl.bindTexture(gl.TEXTURE_2D, tex);
      
      var data = new Uint16Array(this.size[0]*this.size[1]);
      
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, this.size[0], this.size[1],
                    0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
      
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      
      /* rgba texture */
      var tex = gl.createTexture();
      this.textures.push(tex);
      
      gl.activeTexture(gl.TEXTURE3);
      
      gl.bindTexture(gl.TEXTURE_2D, tex);
      
      var data = new Float32Array(this.size[0]*this.size[1]*4);
      
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.size[0], this.size[1],
                    0, gl.RGBA, gl.FLOAT, data);
      
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.textures[0], 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textures[1], 0);
    }
    
    this.unbind();
  }
  
  /****                Draw Rect                   ****/
  draw_rect(gl, pos, size, color, z=2.0) {
    static verts = undefined;
    
    if (verts == undefined) {
      verts = gl.createBuffer();
    }
    
    var vs = new Float32Array(18);
    
    var d = 0;
    vs[d++] = pos[0];
    vs[d++] = pos[1];
    vs[d++] = z;
    
    vs[d++] = pos[0];
    vs[d++] = pos[1]+size[1];
    vs[d++] = z;
    
    vs[d++] = pos[0]+size[0];
    vs[d++] = pos[1]+size[1];
    vs[d++] = z;
    
    
    vs[d++] = pos[0];
    vs[d++] = pos[1];
    vs[d++] = z;
    
    vs[d++] = pos[0]+size[0];
    vs[d++] = pos[1]+size[1];
    vs[d++] = z;

    vs[d++] = pos[0]+size[0];
    vs[d++] = pos[1];
    vs[d++] = z;
    
    for (var i=0; i<12; i++) {
      vs[i] = (vs[i]-0.5)*2.0;
    }
    gl.enableVertexAttribArray(0);
    gl.disableVertexAttribArray(1);
    gl.disableVertexAttribArray(2);
    gl.disableVertexAttribArray(3);
    gl.disableVertexAttribArray(4);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, verts);
    gl.bufferData(gl.ARRAY_BUFFER, vs, gl.STATIC_DRAW);
    
    gl.useProgram(gl.rect2d.program);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, verts);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    
    gl.uniform4fv(gl.rect2d.uniformloc(gl, "color"), color);
    
    gl.depthMask(1);
    gl.depthFunc(gl.ALWAYS);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.flush();
    
    gl.depthFunc(gl.LESS);
    
    //ctx.disableVertexAttribArray(0);
  }
    
  bind() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbuf);
    
    if (this.type == FBTypes.TEXTURE2D) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.textures[0], 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textures[1], 0);
    } else {
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.rbuf1);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                                gl.RENDERBUFFER, this.rbuf1);
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.rbuf2);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, 
                                gl.RENDERBUFFER, this.rbuf2);
    }
  }

  unbind() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }
}
