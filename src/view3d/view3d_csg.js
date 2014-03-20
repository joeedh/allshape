var csg_prog = undefined;
var csg_prog2 = undefined;

var csg_clr_zero = [0.0, 0.0, 0.0, 1.0];
var csg_clr_one = [0.0, 1.0/255.0, 0.0, 1.0];
class CSGDraw {
  constructor(View3DHandler view3d, Scene scene) {
    this.view3d = view3d;
    this.scene = scene;
    this.fbuf = undefined;
    this.fbuf2 = undefined;
    this.ctx = view3d.ctx;
    this.prog = undefined;
    this.prog2 = undefined;
    this.size = undefined : Array<int>;
    this.gl = view3d.gl;
  }
  
  gen_buffers(gl, view3d) {
    global csg_prog, csg_prog2;
    
    this.gl = gl;
    this.size = [view3d.size[0], view3d.size[1]];
    if (csg_prog == undefined) {
      csg_prog = new ShaderProgram(gl, csg_vert_shader, csg_draw_shader, ["vPosition", "unused", "vNormal"]);
      csg_prog2 = new ShaderProgram(gl, csg_vert_shader, csg_draw_shader2, ["vPosition", "unused", "vNormal"]);
    }
    
    this.prog = csg_prog;
    this.prog2 = csg_prog2;
    
    if (this.fbuf)
      this.fbuf.destroy(gl);
    this.fbuf = new FrameBuffer(gl, view3d.size, FBTypes.TEXTURE2D);
    this.fbuf.regen();
    
    if (this.fbuf2)
      this.fbuf2.destroy();
    this.fbuf2 = new FrameBuffer(gl, view3d.size, FBTypes.TEXTURE2D);
    this.fbuf2.regen();
  }
  
  sort_obj(ob) {
    var lst = []
    var mesh = ob.data
    var t = mesh.looptris;
    for (var i=0; i<t.length/3; i++) {
      lst.push([t[i*3], t[i*3+1], t[i*3+2]]);
    }
    
    var mat = new Matrix4(this.view3d.drawmats.rendermat);
    mat.isPersp = true;
    mat.multiply(ob.matrix);
    
    lst.sort(function(a, b) {
      var acent = new Vector3().add(a[0].v.co).add(a[1].v.co).add(a[2].v.co).mul(1.0/3.0);
      var bcent = new Vector3().add(b[0].v.co).add(b[1].v.co).add(b[2].v.co).mul(1.0/3.0);
      
      acent.multVecMatrix(mat);
      bcent.multVecMatrix(mat);
      
      if (acent[2] < bcent[2])
        return -1;
      else if (acent[2] > bcent[2])
        return 1;
      else
        return 0;
    });
    
    t = mesh.looptris = new GArray()
    for (var i=0; i<lst.length; i++) {
      t.push(lst[i][0]);
      t.push(lst[i][1]);
      t.push(lst[i][2]);
    }
    
    gen_mesh_tribuf(this.gl, mesh, t, RecalcFlags.REGEN_TESS|RecalcFlags.REGEN_COLORS|RecalcFlags.REGEN_NORS);
  }
  
  draw_obj(gl, ob, clr, prog) {
    var view3d = this.view3d;
    var drawmats = view3d.drawmats;
    
    gl.uniform4fv(prog.uniformloc(gl, "color"), clr);
    if (ob.data instanceof Mesh) {
      view3d.check_subsurf(view3d.ctx, ob);
      var drawmode = gl.TRIANGLES;
      
      if (ob.subsurf) {
        subsurf_render(gl, view3d, ob.ss_mesh, ob.data, 
                      view3d.drawmats, !view3d.use_backbuf_sel, false,
                      prog, drawmode);
      } else {
        render_mesh_object(gl, view3d, ob.data, view3d.drawmats, view3d, prog, drawmode);
      }
    }
  }
  
  set_alpha_add() {
    var gl = this.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.blendEquation(gl.FUNC_ADD);
    gl.enable(gl.CULL_FACE);
  }
  
  clear() {
    var gl = this.gl;
    gl.clearColor(0, 0, 0, 1.0);
    gl.clearDepth(10000);
    gl.clear(gl.DEPTH_BUFFER_BIT|gl.COLOR_BUFFER_BIT);
  }
  
  render_obj(ob, prog, args) {
    var gl = this.gl;
    var sce = this.scene;
    var view3d = this.view3d;
    var mat = this.normalinv;
    var clr = args.clr;
    
    gl.useProgram(prog.program);
    mat.setUniform(gl, prog.uniformloc(gl, "normalinv"), false);
    
    view3d.transmat.push()
    view3d.transmat.multiply(ob.matrix);
    this.set_uniforms(prog, args);
    this.draw_obj(gl, ob, clr, prog);
    view3d.transmat.pop();
  }
  
  set_alpha_interp() {
    var gl = this.gl;
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
  
  render_fbuf_start() {
    var gl = this.gl;
    var prog = this.prog;
    gl.useProgram(prog.program);
    
    gl.enableVertexAttribArray(0);
    gl.disableVertexAttribArray(1);
    gl.enableVertexAttribArray(2);

    gl.disable(gl.DITHER);
    gl.enable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    this.set_alpha_add();
    
    gl.depthMask(1);
    gl.depthFunc(gl.LESS);
    
    this.fbuf.bind();
    this.clear();
    return gl;
  }
  
  render_fbuf_end() {
    this.set_uniforms(this.prog, {cull : gl.BACK, depthMask : 1, depthFunc : gl.LESS});
    this.fbuf.unbind();
    this.set_alpha_interp();
  }
  
  start_render2() {
    var gl = this.gl;
    gl.useProgram(this.prog2.program);
    this.bind_textbuffer(gl, this.prog2, this.normalinv);
    
    return this.prog2;
  }
  
  final_reset() {
    var gl = this.gl;
    gl.disable(gl.CULL_FACE);
  }
  
  render_sub(gl, oba, obs) {
    this.render_sub_add(gl, oba, obs);
    this.render_add_sub(gl, oba, obs);
  }
  
  //renders subtraction part of add/sub pair
  render_sub_add(gl, oba, obs) {
    var gl = this.render_fbuf_start();
    var prog = this.prog;
    
    //render back layer of subtraction object
    this.render_obj(obs, prog, {clr : csg_clr_zero, cull : gl.FRONT});
    
    /*render back, then front, layers of additive object*/
    this.render_obj(oba, prog, {clr : csg_clr_one, cull : gl.FRONT, depthMask : 1});
    this.render_obj(oba, prog, {clr : csg_clr_one, cull : gl.BACK});
    
    this.render_fbuf_end();
    
    /****************** main render ****************/
    prog = this.start_render2();
    
    //draw subtract to main drawbuffer
    var clr = [1.0, 0.2, 0.0, 1.0];
    
    gl.depthMask(0);
    this.render_obj(obs, prog, {clr : clr, is_sub : 1.0, cull : gl.FRONT});
    gl.depthMask(1);
    
    this.final_reset();
  }
  
  //renders *addition* part of add/sub pair
  render_add_sub(gl, oba, obs) {
    var gl = this.render_fbuf_start();
    var prog = this.prog;

    //addition object
    this.render_obj(oba, prog, {clr : csg_clr_zero, cull : gl.BACK});
    
    //subtraction object
    this.render_obj(obs, prog, {clr : csg_clr_one, cull : gl.FRONT});
    this.render_obj(obs, prog, {clr : csg_clr_one, cull : gl.BACK});
    
    this.render_fbuf_end();
    
    /****************** main render ****************/
    prog = this.start_render2();
    
    //draw subtract to main drawbuffer
    var clr = [1.0, 0.2, 0.0, 1.0];
    
    this.render_obj(oba, prog, {clr : clr, off: 1.0, is_sub : 0.0, cull : gl.BACK});
    this.final_reset();
  }

  set_uniforms(ShaderProgram prog, ObjectMap args) {
    if (args.off == undefined) args.off = 0;
    if (args.is_sub == undefined) args.is_sub = 0;
    if (args.cull == undefined) args.cull = gl.BACK;
    if (args.depthMask != undefined) gl.depthMask(args.depthMask);
    if (args.depthFunc != undefined) gl.depthFunc(args.depthFunc);
    
    gl.uniform1f(prog.uniformloc(gl, "off"), args.off);
    gl.uniform1f(prog.uniformloc(gl, "is_sub"), args.is_sub);
    gl.cullFace(args.cull);
  }
  
  bind_textbuffer(WebGLRenderingContext gl, ShaderProgram prog, Matrix4 normainv) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthFunc(gl.LESS);
    
    normainv.setUniform(gl, prog.uniformloc(gl, "normalinv"), false);
    
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.fbuf.textures[1]);
    gl.uniform1i(prog.uniformloc(gl, "sampler2d"), 3);
    gl.uniform1f(prog.uniformloc(gl, "width"), this.size[0]);
    gl.uniform1f(prog.uniformloc(gl, "height"), this.size[1]);
    gl.enable(gl.CULL_FACE);
  }

  on_draw(gl, view3d) {
    var mat = new Matrix4(view3d.drawmats.cameramat);
    this.normalinv = mat;
    this.gl = gl;
    this.ctx = new Context();
    
    if (this.fbuf == undefined)
      this.gen_buffers(gl, view3d);
      
    this.ctx = new Context();
    var sce = this.scene;
    var view3d = this.view3d;
    var mat = new Matrix4(view3d.drawmats.cameramat);
    
    for (var ob in sce.objects) {
      if (ob.csg && ob.csg_mode == CsgModes.SUBTRACT && ob.parent) {
        this.render_sub(gl, ob.parent, ob);
        return;
      }
    }
    
    if (this.fbuf == undefined)
      this.gen_buffers(gl, view3d);
    
    var prog = this.prog;
    gl.useProgram(prog.program);
    mat.setUniform(gl, prog.uniformloc(gl, "normalinv"), false);
    
    gl.enableVertexAttribArray(0);
    gl.disableVertexAttribArray(1);
    gl.enableVertexAttribArray(2);

    gl.disable(gl.DITHER);
    gl.enable(gl.BLEND);
    
    
    var this2 = this;
    function render(prog, clr, mode="a") {
      for (var node in sce.graph.sortlist) {
        if (!(node instanceof ASObject)) continue;
        var ASObject ob = node;
        if (!ob.csg) continue;
        
        if (mode == "a" && ob.csg_mode == CsgModes.SUBTRACT)
          continue;
        else if (mode == "s" && ob.csg_mode != CsgModes.SUBTRACT)
          continue;
        
        view3d.transmat.push()
        view3d.transmat.multiply(ob.matrix);
        
        this2.draw_obj(gl, ob, clr, prog);
        view3d.transmat.pop();
      }
    }
    
    for (var node in sce.graph.sortlist) {
      if (!(node instanceof ASObject)) continue;
      var ASObject ob = node;
      
      if (!ob.csg) continue;
      
      //this.sort_obj(ob);
    }
    
    this.fbuf.bind();
    
    gl.useProgram(prog.program);
    
    //if (!debug_fbuf) {
      gl.clearColor(0, 0, 0, 1.0);
      gl.clearDepth(10000);
      gl.clear(gl.DEPTH_BUFFER_BIT|gl.COLOR_BUFFER_BIT);
    //}
    
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.blendEquation(gl.FUNC_ADD);
    gl.depthFunc(gl.LESS);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    var clr;
    
    /************************ start *********************/
    
    //subtraction nodes
    clr = [0.0, 0.0, 0, 1.0];
    gl.cullFace(gl.FRONT);
    render(prog, clr, "s");
    
    gl.depthMask(0);
    clr = [0.0, 1.0/255.0, 0, 1.0];
    gl.cullFace(gl.FRONT);
    gl.depthFunc(gl.LESS);
    render(prog, clr, "a");
    
    clr = [0.0, 1.0/255.0, 0, 1.0];
    gl.cullFace(gl.BACK);
    render(prog, clr, "a");
    gl.depthMask(1);
    
    //subtraction nodes
    clr = [1.0/255.0, 0.0, 0, 1.0];
    gl.cullFace(gl.FRONT);
    //render(prog, clr, "s");
    
    clr = [1.0/255.0, 0, 0, 1.0];
    gl.cullFace(gl.BACK);
    gl.depthFunc(gl.LESS);
    //render(prog, clr, "a");
    
    gl.cullFace(gl.BACK);
    this.fbuf.unbind();
      
    gl.depthFunc(gl.LESS);
  
    /****************** finished generating stencil texture ****************/

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthFunc(gl.LESS);
    
    prog = this.prog2;
    gl.useProgram(prog.program);
    mat.setUniform(gl, prog.uniformloc(gl, "normalinv"), false);
    
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.fbuf.textures[1]);
    gl.uniform1i(prog.uniformloc(gl, "sampler2d"), 3);
    gl.uniform1f(prog.uniformloc(gl, "width"), this.size[0]);
    gl.uniform1f(prog.uniformloc(gl, "height"), this.size[1]);
    gl.enable(gl.CULL_FACE);
    
    //others
    var clr = [1.0, 0.2, 0.0, 1.0];
    // /*
    gl.uniform1f(prog.uniformloc(gl, "off"), 1.0);
    gl.uniform1f(prog.uniformloc(gl, "is_sub"), 0.0);
    gl.depthFunc(gl.LESS);
    gl.cullFace(gl.BACK);
    render(prog, clr, "a");
    // */
    
    //subtract
    var clr = [1.0, 0.2, 0.0, 1.0];
    gl.uniform1f(prog.uniformloc(gl, "off"), 0.0);
    gl.uniform1f(prog.uniformloc(gl, "is_sub"), 1.0);
    gl.depthFunc(gl.GREATER);
    gl.cullFace(gl.FRONT);
    //render(prog, clr, "s");
    
    gl.cullFace(gl.BACK);
    gl.disable(gl.CULL_FACE);
    gl.depthFunc(gl.LESS);
  }
  
  destroy(gl) {
    if (this.fbuf)
      this.fbuf.destroy(gl);
    this.fbuf = undefined;
  }
}
