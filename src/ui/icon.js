"use strict";

class IconManager {
  constructor(WebGLRenderingContext gl, String sheet_path, 
              Array<float> imgsize, Array<float> iconsize) 
  {
    this.path = sheet_path;
    this.size = new Vector2(imgsize);
    this.cellsize = new Vector2(iconsize);
    
    this.load(gl);
    this.texture = undefined;
  }
  
  load(WebGLRenderingContext gl) {
    //load texture
    this.tex = gl.createTexture();
    this.tex.image = new Image();
    this.tex.image.src = this.path;
    
    var thetex = this.tex;
    this.tex.image.onload = function() {
      var tex = thetex;
      
      gl.bindTexture(gl.TEXTURE_2D, tex);
      //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex.image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  }
  
  get_tile(int tile) : Array<float> {
    var ret = [];
    this.gen_tile(tile, ret);
    
    return ret;
  }
  
  gen_tile(int tile, Array<float> texcos) {
    var size = this.size;
    var cellsize = this.cellsize;
    
    var fx = Math.floor(size[0]/cellsize[0]);
    
    var y = Math.floor(tile/fx);
    var x = tile%fx;
    
    x = (x*cellsize[0])/size[0]; y = (y*cellsize[1])/size[1];
    
    /*
    for (var i=0; i<3*2; i++) {
      texcos.push(y);
    }
    return;
    */
    
    var u = 1.0 / size[0], v = 1.0 / size[1];
    u *= cellsize[0];
    v *= cellsize[1];
    /*
    x = 0.0;
    y = 0.0;
    u = 1.0;
    v = -1.0;
    // */
    y += v;
    texcos.push(x); texcos.push(y); //0
    texcos.push(x); texcos.push(y-v); //1
    texcos.push(x+u); texcos.push(y-v); //2
    
    texcos.push(x); texcos.push(y); //0
    texcos.push(x+u); texcos.push(y-v); //2
    texcos.push(x+u); texcos.push(y); //3
  }
}

var icon_vshader = """

"""

var icon_fshader = """
"""