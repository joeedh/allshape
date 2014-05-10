"use strict"

/*keep this and MeshEvents in mesh.js in sync!*/
var MeshRecalcFlags = {
  REGEN_TESS: 1, 
  REGEN_COLORS: 2, 
  REGEN_COS: 4, 
  REGEN_NORS: 8,
  REGEN_ALL: 1|2|4|8
};

var sel_color = [0.9, 0.6, 0.2, 1.0];
var highlight_color = [0.9, 0.4, 0.7, 1.0];
var highlight_and_sel_color = [0.9, 0.5, 0.6, 1.0];
var unsel_color = [0.6, 0.3, 0.1, 1.0];
var face_unsel_color = [0.75, 0.7, 0.8, 1.0];
var face_sel_color = [0.9, 0.5, 0.3875, 1.0];

for (var i=0; i<3; i++) {
  face_sel_color[i] = Math.pow(face_sel_color[i], 0.7);
}

function gen_tris(Mesh mesh) {
  g_app_state.jobs.kill_owner_jobs(mesh);
  
  var ls = new Array<Loop>();
  
  for (var f in mesh.faces) {
    if (ls == undefined | ls.push == undefined) {
      console.trace();
      console.log("WARNING: Chrome array error!!", ls);
      mesh.regen_render();
      return;
    }
    
    if (f.totvert == 3) {
      var l = f.looplists[0].loop;
      
      ls.push(l);
      ls.push(l.next);
      ls.push(l.next.next);
    } else if (f.totvert == 4) {
      var l = f.looplists[0].loop;
      
      ls.push(l);
      ls.push(l.next);
      ls.push(l.next.next);
      
      ls.push(l);
      ls.push(l.next.next);
      ls.push(l.next.next.next);
    } else {
     face_fill(f, ls);
    }
  }
  
  mesh.looptris = ls
}

function face_fill_with_cache(mesh, f, ls) {
  var oldls = mesh.looptris;
  
  if (f.flag & Flags.DIRTY) {
    face_fill(f, ls);
  } else {
    try {
      var i = ls.length;
      
      for (var i = ls.length; i < oldls.length; i++) {
        if (oldls[i].f == f)
          break;
      }
      
      if (oldls[i].f != f && i < oldls.length) {
        for (var i = ls.length; i >= 0; i--) {
          if (oldls[i].f == f)
            break;
        }
      }
      
      if (oldls[i].f != f) {
        face_fill(f, ls);
      } else {
        while (oldls[i] >= 1 && oldls[i].f == f) {
          i--;
        }
        
        if (oldls[i] != undefined && oldls[i].f != f && i < oldls.length-1)
          i++;
        
        var ls2 = []
        while (oldls[i] != undefined && oldls[i].f == f && i < oldls.length) {
          ls2.push(oldls[i]);
          
          i++;
        }                  
        
        var tot = Math.floor(ls2.length/3)*3.0;
        for (var i=0; i<tot; i++) {
          ls.push(ls2[i]);
        }
      }
    } catch (err) {
      console.log("face_fill_with_cache failed");
      face_fill(f, ls);
    }
  }
}
function gen_tris_job(Mesh mesh) {
  var ls = new Array<Loop>();
  
  var fi = 0, fi2 = 0;
  
  for (var f in mesh.faces) {
    yield;
    
    if (f.totvert == 3) {
      var l = f.looplists[0].loop;
      
      ls.push(l);
      ls.push(l.next);
      ls.push(l.next.next);
      fi++;
    } else if (f.totvert == 4) {
      var l = f.looplists[0].loop;
      
      ls.push(l);
      ls.push(l.next);
      ls.push(l.next.next);
      
      ls.push(l);
      ls.push(l.next.next);
      ls.push(l.next.next.next);
      fi++;
    } else {
      /*
      var fillgen = face_fill_threads(f, ls);
      
      for (var step in fillgen) {
        yield;
      }
      console.log("finished fillgen");
      
      // */
      
      face_fill_with_cache(mesh, f, ls);
      
      yield;
    }
    
    fi2++;
  }
  
  yield;
  mesh.looptris = ls;
  //console.log("fi:", fi, "fi2:", fi2, mesh.faces.length);
}

function gen_mesh_tribuf(WebGLRenderingContext gl, Mesh mesh, Loop ls, int recalcflags)
{
  /*triangle data*/
  var tri_vbuff = new Array<float>();
  var tri_nbuff = new Array<float>();
  var i = 0, j=0, c=0, k=0;
  
  for (var i=0; i<ls.length; i++) {
    if (ls[i] == undefined || ls[i].v == undefined) {
      for (var j=0; j<3; j++) {
        tri_vbuff.push(0.0);
      }
      continue;
    }
      
    tri_vbuff.push(ls[i].v.co[0]);
    tri_vbuff.push(ls[i].v.co[1]);
    tri_vbuff.push(ls[i].v.co[2]);
  }
  
  for (var i=0; i<ls.length; i++) {
    if (ls[i] == undefined || ls[i].v == undefined) {
      for (var j=0; j<3; j++) {
        tri_nbuff.push(0.0);
      }
      continue;
    }
      
    if (recalcflags & MeshRecalcFlags.REGEN_NORS) {
      if (ls[i].f.flags & Flags.SHADE_SMOOTH) {
        tri_nbuff.push(ls[i].v.no[0]);
        tri_nbuff.push(ls[i].v.no[1]);
        tri_nbuff.push(ls[i].v.no[2]);
      } else {
        tri_nbuff.push(ls[i].f.no[0]);
        tri_nbuff.push(ls[i].f.no[1]);
        tri_nbuff.push(ls[i].f.no[2]);
      }
    }
  }
  
  tri_vbuff = new Float32Array(tri_vbuff);
  if (recalcflags & MeshRecalcFlags.REGEN_NORS) {
    tri_nbuff = new Float32Array(tri_nbuff);
  }
  
  var tri_cbuff = new Array<float>();
  var i = 0;
  for (var i=0; i<ls.length; i++) {
    if (ls[i] == undefined || ls[i].v == undefined) {
      for (var j=0; j<4; j++) {
        tri_cbuff.push(j == 3 ? 1.0 : 0.0);
      }
      continue;
    }
    
    var f = ls[i].f;
   
    if ((recalcflags & MeshRecalcFlags.REGEN_COLORS) != 0) {
      var color = get_element_color(f, mesh.faces.highlight, true);
      
      tri_cbuff.push(color[0]);
      tri_cbuff.push(color[1]);
      tri_cbuff.push(color[2]);
      tri_cbuff.push(color[3]);
    }
  }
  tri_cbuff = new Float32Array(tri_cbuff);
  
  mesh.render.kill_buf("tri_vbuff");
  mesh.render.tri_vbuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.tri_vbuff);
  gl.bufferData(gl.ARRAY_BUFFER, tri_vbuff, gl.STATIC_DRAW);

  if ((recalcflags & MeshRecalcFlags.REGEN_COLORS) != 0) {
    mesh.render.kill_buf("tri_cbuff");
    mesh.render.tri_cbuff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.tri_cbuff);
    gl.bufferData(gl.ARRAY_BUFFER, tri_cbuff, gl.STATIC_DRAW);
  }
  
  if (recalcflags & MeshRecalcFlags.REGEN_NORS) {
    mesh.render.kill_buf("tri_nbuff");
    mesh.render.tri_nbuff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.tri_nbuff);
    gl.bufferData(gl.ARRAY_BUFFER, tri_nbuff, gl.STATIC_DRAW);
  }
  
  mesh.render.tri_totvert = ls.length;
}

gen_tris_job.jobtype = new gen_tris_job(undefined);
gen_tris_job.prototype.jobtype = new gen_tris_job(undefined);

function render() {
  this.norbuf = 0 : WebGLBuffer;
  this.texbuf = 0 : WebGLBuffer;
  this.vertbuf = 0 : WebGLBuffer;
  this.indexbuf = 0 : WebGLBuffer;
  this.drawprogram = 0 : WebGLBuffer;
  this.vertprogram = 0 : WebGLBuffer;
  this.vcolorbuf = 0 : WebGLBuffer;
  this.vselbuf = 0 : WebGLBuffer;
  this.outlinebuf = 0 : WebGLBuffer;
  this.edgebuf = 0 : WebGLBuffer;
  this.ecolorbuf = 0 : WebGLBuffer;
  this.eselbuf = 0 : WebGLBuffer;
  this.edgeindexbuf = 0 : WebGLBuffer;
  
  this.tri_vbuff = 0 : WebGLBuffer;
  this.tri_cbuff = 0 : WebGLBuffer;
  this.tri_nbuff = 0 : WebGLBuffer;
  this.tri_totvert = 0 : WebGLBuffer;
  this.tri_selbuff = 0 : WebGLBuffer;
  
  this.faceverts = 0 : WebGLBuffer;
  this.facecolors = 0 : WebGLBuffer;
  this.totface = 0 : WebGLBuffer;
  
  this.recalc = MeshRecalcFlags.REGEN_TESS | MeshRecalcFlags.REGEN_COLORS | MeshRecalcFlags.REGEN_COS;
  
  this.copy_programs = function(render ren) {
    this.vertprogram = ren.vertprogram;
    this.drawprogram = ren.drawprogram;
  }
  
  this.kill_buf = function(String name) {
    var buf = getattr(this, name);
    
    if (buf == undefined) {
      console.trace()
      throw "Spelling error in buffer passed to kill_buf"
    }
    
    if (buf != 0) {
      gl.deleteBuffer(buf);
    }
    
    setattr(this, name, 0);
  }
  
  this.destroy = function(WebGLRenderingContext gl) {
    this.kill_buf("norbuf");
    this.kill_buf("texbuf");
    this.kill_buf("vertbuf");
    this.kill_buf("vselbuf");
    this.kill_buf("indexbuf");
    this.kill_buf("vcolorbuf");
    this.kill_buf("outlinebuf");
    this.kill_buf("edgebuf");
    this.kill_buf("ecolorbuf");
    this.kill_buf("eselbuf");
    this.kill_buf("tri_vbuff");
    this.kill_buf("tri_cbuff");
    this.kill_buf("tri_nbuff");
    this.kill_buf("tri_selbuff");
    this.kill_buf("faceverts");
    this.kill_buf("facecolors");
  }
}

function get_element_color(Element e, Element highlight, Boolean use_face_unsel_color=false, Boolean use_highlight=false) { 
//use_face_unsel_color, use_highlight are optional

    if (use_face_unsel_color == undefined)
      use_face_unsel_color = false;
    if (use_highlight == undefined)
      use_highlight = false;
    
    if (use_highlight && e == highlight) {
      if (e.flag & Flags.SELECT)
        return highlight_and_sel_color;
      else
        return highlight_color;
    }
    
    if ((e.flag & Flags.SELECT) != 0) {
      return e.type == MeshTypes.FACE ? face_sel_color : sel_color;
    } else {
      if (use_face_unsel_color)
        return e.type == MeshTypes.FACE ? face_unsel_color : unsel_color;
      else
        return unsel_color;
    }
}

var outline_tris = false;

function pack_index2(idx, sels, i) {
  var bytes = new Uint8Array(new Int32Array([idx]).buffer, 0, 4);
  
  sels[i++] = (bytes[0]/255.0);
  sels[i++] = (bytes[1]/255.0);
  sels[i++] = (bytes[2]/255.0);
  sels[i++] = (bytes[3]/255.0);
  
  return i;
}

var _up_i_arr8 = new Uint8Array([0, 0, 0, 0]);
var _up_i_arr32 = new Int32Array(_up_i_arr8.buffer);
var _up_i_dview = new DataView(_up_i_arr8.buffer);

function pack_index(idx, sels, i) {
  var view = _up_i_dview;
  var bs = _up_i_arr8;
  
  view.setInt32(0, idx, true);
  sels[i++] = bs[0]/255.0;
  sels[i++] = bs[1]/255.0;
  sels[i++] = bs[2]/255.0;
  sels[i++] = bs[3]/255.0;
  
  return i;
}

function pack_index3(idx, sels, i) {
  var view = _up_i_dview;
  var bs = _up_i_arr8;
  
  view.setInt32(0, idx, true);
  sels[i++] = bs[0]/255.0;
  sels[i++] = bs[1]/255.0;
  sels[i++] = bs[2]/255.0;
  
  return i;
}

var _up_i_arr8 = new Uint8Array([0, 0, 0, 0]);
var _up_i_arr32 = new Int32Array(_up_i_arr8.buffer);
var _up_i_dview = new DataView(_up_i_arr8.buffer);

function unpack_index(bytes_clr) {
  var bs = _up_i_dview;
  
  bs.setUint8(0, bytes_clr[0]);
  bs.setUint8(1, bytes_clr[1]);
  bs.setUint8(2, bytes_clr[2]);
  bs.setUint8(3, bytes_clr[3]);
  
  return _up_i_arr32[0];
}

function gen_mesh_selbufs(gl, mesh)
{
  var vsels = new Array(mesh.verts.length*4);
  
  var i = 0;
  for (var v in mesh.verts) {
    i = pack_index(v.sid+1, vsels, i);
  }
  
  var esels = new Array(mesh.edges.length*8);
  i = 0;
  for (var e in mesh.edges) {
    i = pack_index(e.sid+1, esels, i);
    i = pack_index(e.sid+1, esels, i);
  }
  
  var tri_selbuff = new Array(mesh.looptris.length*4);
  var ls = mesh.looptris;
  var fmap = {}
  
  i = 0;
  for (var j=0; j<Math.floor(ls.length/3); j++) {
    try {
    i = pack_index(ls[j*3].f.sid+1, tri_selbuff, i);
    i = pack_index(ls[j*3+1].f.sid+1, tri_selbuff, i);
    i = pack_index(ls[j*3+2].f.sid+1, tri_selbuff, i);
    } catch (_error) {
    console.log("j", j);
    }
  }
  
  vsels = new Float32Array(vsels);
  esels = new Float32Array(esels);
  tri_selbuff = new Float32Array(tri_selbuff);
  
  mesh.render.kill_buf("vselbuf");
  mesh.render.vselbuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.vselbuf);
  gl.bufferData(gl.ARRAY_BUFFER, vsels, gl.STATIC_DRAW);

  mesh.render.kill_buf("eselbuf");
  mesh.render.eselbuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.eselbuf);
  gl.bufferData(gl.ARRAY_BUFFER, esels, gl.STATIC_DRAW);

  mesh.render.kill_buf("tri_selbuff");
  mesh.render.tri_selbuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.tri_selbuff);
  gl.bufferData(gl.ARRAY_BUFFER, tri_selbuff, gl.STATIC_DRAW);
}

/*this function clears any dirty flags in the elements*/
function gen_mesh_render(WebGLRenderingContext ctx, Mesh mesh, ShaderProgram drawprogram, 
                         ShaderProgram vertprogram, int recalcflags) 
{
  function tess_finish(job) {
    mesh.flag |= MeshFlags.TESS_JOB_FINISHED;
  }
      
  if (mesh.render == 0) {
    mesh.render = new render();
    mesh.regen_render();
  }
  
  //if (recalcflags & MeshRecalcFlags.REGEN_COS)
  //  recalcflags |= MeshRecalcFlags.REGEN_TESS;
    
  if ((recalcflags & MeshRecalcFlags.REGEN_TESS) != 0) {
    recalcflags |= MeshRecalcFlags.REGEN_NORS | MeshRecalcFlags.REGEN_COS | MeshRecalcFlags.REGEN_COLORS;
    
    gen_tris(mesh);
    
    /*
    var i = 0;
    
    for (var t in (new gen_tris_job(mesh))) {
      i += 1;
      if (i == 15000) {
        console.log("infitie loop in gen tris job");
        gen_tris(mesh);
        break;
      }
    }
    // */
  } else if (recalcflags & MeshRecalcFlags.REGEN_COS) {
    if (mesh.flag & MeshFlags.TESS_JOB_FINISHED) {
      recalcflags |= MeshRecalcFlags.REGEN_NORS | MeshRecalcFlags.REGEN_COS | MeshRecalcFlags.REGEN_COLORS | MeshRecalcFlags.REGEN_TESS;
      
      mesh.flag &= ~MeshFlags.TESS_JOB_FINISHED;
    } else {
      gen_tris(mesh);
      
      var gen = new gen_tris_job(mesh);
      var i = 0;
      
      var job = new Joblet(mesh, gen, undefined, 10, undefined, tess_finish);
      
      g_app_state.jobs.queue_replace(job);
      
      /*
      recalcflags |= MeshRecalcFlags.REGEN_NORS | MeshRecalcFlags.REGEN_COS | MeshRecalcFlags.REGEN_COLORS | MeshRecalcFlags.REGEN_TESS;
      for (var iter in job) {
        i++;
        if (i > 10000) {
          console.log("infinite loop")
          break;
        }
      }
      // */
    }
  }
  
  mesh.render.drawprogram = drawprogram;
  mesh.render.vertprogram = vertprogram;
  
  var totloop = 0;
  
  for (var f in mesh.faces) {
    f.flag &= ~Flags.DIRTY;
    
    for (var list in f.looplists) {
      totloop += list.length;
    }
  }
  
  mesh.verts.index_update()
  
  var normals = new Array<float>();
  var colors = new Array<float>();
  var no;
  
  for (var v in mesh.verts) {
    no = v.no;
    
    v.flag &= ~Flags.DIRTY;
    
    if (recalcflags & MeshRecalcFlags.REGEN_NORS) {
      normals.push(no[0]);
      normals.push(no[1]);
      normals.push(no[2]);
    }
    
    if ((recalcflags & MeshRecalcFlags.REGEN_COLORS) != 0) {
      var color = get_element_color(v, mesh.verts.highlight);
      colors.push(color[0]);
      colors.push(color[1]);
      colors.push(color[2]);
      colors.push(color[3]);
    }
  }
  
  if (recalcflags & MeshRecalcFlags.REGEN_NORS) {
    normals = new Float32Array(normals);
  }
  
  colors = new Float32Array(colors);
  
  var verts = new Array();
  var i = 0;
  var co;
  
  if (mesh.flag & MeshFlags.USE_MAP_CO) {
    for (var v in mesh.verts) {
      co = v.mapco;
      verts.push(co[0]);
      verts.push(co[1]);
      verts.push(co[2]);
    }
  } else {
    for (var v in mesh.verts) {
      co = v.co;
      verts.push(co[0]);
      verts.push(co[1]);
      verts.push(co[2]);
    }
  }
  verts = new Float32Array(verts);

  if (recalcflags & MeshRecalcFlags.REGEN_NORS) {
    mesh.render.kill_buf("norbuf");
    mesh.render.norbuf = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, mesh.render.norbuf);
    ctx.bufferData(ctx.ARRAY_BUFFER, normals, ctx.STATIC_DRAW);
  }
  
  mesh.render.kill_buf("vertbuf");
  mesh.render.vertbuf = ctx.createBuffer();
  ctx.bindBuffer(ctx.ARRAY_BUFFER, mesh.render.vertbuf);
  ctx.bufferData(ctx.ARRAY_BUFFER, verts, ctx.STATIC_DRAW);
  
  if ((recalcflags & MeshRecalcFlags.REGEN_COLORS) != 0) {
    mesh.render.kill_buf("vcolorbuf");
    mesh.render.vcolorbuf = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, mesh.render.vcolorbuf);
    ctx.bufferData(ctx.ARRAY_BUFFER, colors, ctx.STATIC_DRAW);
  }
  
  ctx.bindBuffer(ctx.ARRAY_BUFFER, null);
  
  var idxs = new Array<short>();
  var ls = mesh.looptris;
  
  /*
  if (recalcflags & MeshRecalcFlags.REGEN_TESS) {
    for (var i=0; i<Math.floor(ls.length/3); i++) {
      ls[i*3].f.flag &= ~Flags.DIRTY;
     
      idxs.push(ls[i*3].v.index);
      idxs.push(ls[i*3+1].v.index);
      idxs.push(ls[i*3+2].v.index);
    }
    idxs = new Uint16Array(idxs);
    
    if (outline_tris) {
        var tlines = new Array();
        var ls = mesh.looptris;
        
        for (var i=0; i<Math.floor(ls.length/3); i++) {
          for (var j=0; j<3; j++) {
            tlines.push(ls[i*3+j].v.index);
            tlines.push(ls[i*3+(j+1)%3].v.index);
          }
        }
        
        tlines = new Uint16Array(tlines);
        
        mesh.render.kill_buf("outlinebuf");
        mesh.render.outlinebuf = ctx.createBuffer();
        ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, mesh.render.outlinebuf);
        ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, tlines, ctx.STATIC_DRAW);
    }
    
    //triangles
    mesh.render.kill_buf("indexbuf");
    mesh.render.indexbuf = ctx.createBuffer();
    ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, mesh.render.indexbuf);
    ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, idxs, ctx.STATIC_DRAW);
    
    //edges, for interpolating vertex selection
    var edgeidxs = new Array<short>();
    for (var e in mesh.edges) {
      e.flag &= ~Flags.DIRTY;
      edgeidxs.push(e.v1.index);
      edgeidxs.push(e.v2.index);
    }
  
    //non-vertex-selection-interpolated edges
    edgeidxs = new Uint16Array(edgeidxs);
    mesh.render.kill_buf("edgeindexbuf");
    mesh.render.edgeindexbuf = ctx.createBuffer();
    ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, mesh.render.edgeindexbuf);
    ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, edgeidxs, ctx.STATIC_DRAW);
    
  }*/
  
  var edgebuf = new Array<float>();
  for (var e in mesh.edges) {
    for (i=0; i<3; i++) {
      edgebuf.push(e.v1.co[i]);
    }
    for (i=0; i<3; i++) {
      edgebuf.push(e.v2.co[i]);
    }
  }
  
  edgebuf = new Float32Array(edgebuf);
  
  var ecolorbuf = new Array<float>();
  for (var e in mesh.edges) {
    if ((recalcflags & MeshRecalcFlags.REGEN_COLORS) != 0) {
      var color = get_element_color(e, mesh.edges.highlight);
      for (i=0; i<2; i++) {
          ecolorbuf.push(color[0]);
          ecolorbuf.push(color[1]);
          ecolorbuf.push(color[2]);
          ecolorbuf.push(color[3]);
      }
    }
  }
  ecolorbuf = new Float32Array(ecolorbuf);
  
  mesh.render.kill_buf("edgebuf");
  mesh.render.edgebuf = ctx.createBuffer();
  ctx.bindBuffer(ctx.ARRAY_BUFFER, mesh.render.edgebuf);
  ctx.bufferData(ctx.ARRAY_BUFFER, edgebuf, ctx.STATIC_DRAW);

  if (recalcflags & MeshRecalcFlags.REGEN_COLORS) {
    mesh.render.kill_buf("ecolorbuf");
    mesh.render.ecolorbuf = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, mesh.render.ecolorbuf);
    ctx.bufferData(ctx.ARRAY_BUFFER, ecolorbuf, ctx.STATIC_DRAW);
  }
  
  ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, null);
  ctx.bindBuffer(ctx.ARRAY_BUFFER, null);

  mesh.render.numIndices = idxs.length;
  
  /*triangle data*/
  var tri_vbuff = new Array<float>();
  var tri_nbuff = new Array<float>();
  var i = 0;
  for (var i=0; i<ls.length; i++) {
    if (ls[i] == undefined || ls[i].v == undefined) {
      for (var j=0; j<3; j++) {
        tri_vbuff.push(0.0);
      }
      continue;
    }
      
    tri_vbuff.push(ls[i].v.co[0]);
    tri_vbuff.push(ls[i].v.co[1]);
    tri_vbuff.push(ls[i].v.co[2]);
  }
  
  for (var i=0; i<ls.length; i++) {
    if (ls[i] == undefined || ls[i].v == undefined) {
      for (var j=0; j<3; j++) {
        tri_nbuff.push(0.0);
      }
      continue;
    }
      
    if (recalcflags & MeshRecalcFlags.REGEN_NORS) {
      if (ls[i].f.flags & Flags.SHADE_SMOOTH) {
        tri_nbuff.push(ls[i].v.no[0]);
        tri_nbuff.push(ls[i].v.no[1]);
        tri_nbuff.push(ls[i].v.no[2]);
      } else {
        tri_nbuff.push(ls[i].f.no[0]);
        tri_nbuff.push(ls[i].f.no[1]);
        tri_nbuff.push(ls[i].f.no[2]);
      }
    }
  }
  
  tri_vbuff = new Float32Array(tri_vbuff);
  if (recalcflags & MeshRecalcFlags.REGEN_NORS) {
    tri_nbuff = new Float32Array(tri_nbuff);
  }
  
  var tri_cbuff = new Array<float>();
  var i = 0;
  for (var i=0; i<ls.length; i++) {
    if (ls[i] == undefined || ls[i].v == undefined) {
      for (var j=0; j<4; j++) {
        tri_cbuff.push(j == 3 ? 1.0 : 0.0);
      }
      continue;
    }
    
    var f = ls[i].f;
   
    if ((recalcflags & MeshRecalcFlags.REGEN_COLORS) != 0) {
      var color = get_element_color(f, mesh.faces.highlight, true);
      
      tri_cbuff.push(color[0]);
      tri_cbuff.push(color[1]);
      tri_cbuff.push(color[2]);
      tri_cbuff.push(color[3]);
    }
  }
  tri_cbuff = new Float32Array(tri_cbuff);
  
  var faceverts = new Array<float>();
  var facecolors = new Array<float>();
  var center;
  for (var f in mesh.faces) {
    if (mesh.flag & MeshFlags.USE_MAP_CO)
      center = f.mapcenter;
    else
      center = f.center;
      
    faceverts.push(center[0]);
    faceverts.push(center[1]);
    faceverts.push(center[2]);
    
    if ((recalcflags & MeshRecalcFlags.REGEN_COLORS) != 0) {
      var color = get_element_color(f, mesh.faces.highlight, false);
      
      facecolors.push(color[0]);
      facecolors.push(color[1]);
      facecolors.push(color[2]);
      facecolors.push(color[3]);
    }
  }
  
  faceverts = new Float32Array(faceverts);
  facecolors = new Float32Array(facecolors);
  mesh.render.totface = mesh.faces.length;

  mesh.render.kill_buf("faceverts");
  mesh.render.faceverts = ctx.createBuffer();
  ctx.bindBuffer(ctx.ARRAY_BUFFER, mesh.render.faceverts);
  ctx.bufferData(ctx.ARRAY_BUFFER, faceverts, ctx.STATIC_DRAW);

  if ((recalcflags & MeshRecalcFlags.REGEN_COLORS) != 0) {
    mesh.render.kill_buf("facecolors");
    mesh.render.facecolors = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, mesh.render.facecolors);
    ctx.bufferData(ctx.ARRAY_BUFFER, facecolors, ctx.STATIC_DRAW);
  }
  
  mesh.render.kill_buf("tri_vbuff");
  mesh.render.tri_vbuff = ctx.createBuffer();
  ctx.bindBuffer(ctx.ARRAY_BUFFER, mesh.render.tri_vbuff);
  ctx.bufferData(ctx.ARRAY_BUFFER, tri_vbuff, ctx.STATIC_DRAW);

  if ((recalcflags & MeshRecalcFlags.REGEN_COLORS) != 0) {
    mesh.render.kill_buf("tri_cbuff");
    mesh.render.tri_cbuff = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, mesh.render.tri_cbuff);
    ctx.bufferData(ctx.ARRAY_BUFFER, tri_cbuff, ctx.STATIC_DRAW);
  }
  
  if (recalcflags & MeshRecalcFlags.REGEN_NORS) {
    mesh.render.kill_buf("tri_nbuff");
    mesh.render.tri_nbuff = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, mesh.render.tri_nbuff);
    ctx.bufferData(ctx.ARRAY_BUFFER, tri_nbuff, ctx.STATIC_DRAW);
  }
  
  mesh.render.tri_totvert = ls.length;
  
  /*face center dots*/
  
  // Enable all of the vertex attribute arrays.
  ctx.enableVertexAttribArray(0);
  ctx.enableVertexAttribArray(2);
  //ctx.enableVertexAttribArray(1);
  ctx.enableVertexAttribArray(3);
  
  // Set up all the vertex attributes for vertices, normals and texCoords
  ctx.bindBuffer(gl.ARRAY_BUFFER, mesh.render.vertbuf);
  ctx.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  ctx.bindBuffer(gl.ARRAY_BUFFER, mesh.render.norbuf);
  ctx.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
  
  if (mesh.render.vcolorbuf != 0) {
    ctx.bindBuffer(gl.ARRAY_BUFFER, mesh.render.vcolorbuf);
    ctx.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
  }
  
  /*ctx.bindBuffer(gl.ARRAY_BUFFER, mesh.render.texbuf);
  ctx.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, 0);*/
  
  if ((recalcflags & MeshRecalcFlags.REGEN_COLORS) || (recalcflags & MeshRecalcFlags.REGEN_TESS))
    gen_mesh_selbufs(ctx, mesh);
  
  mesh.render.recalc = 0;
}

class ShaderProgram {
  constructor (WebGLRenderingContext gl, String vshader, 
               String fshader, Array<String> attribs) 
  {
   // create our shaders
      var vertexShader = loadShader(gl, vshader);
      var fragmentShader = loadShader(gl, fshader);
      this.uniforms = {}
      
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
          log("Error in program linking:"+error);

          //do nothing
          //gl.deleteProgram(program);
          //gl.deleteProgram(fragmentShader);
          //gl.deleteProgram(vertexShader);

          return null;
      }

      this.program = program;
      this.normalmat = null;
      
      this.u_normalMatrixLoc = gl.getUniformLocation(program, "u_normalMatrix");
      this.u_modelViewProjMatrixLoc =
                  gl.getUniformLocation(program, "u_modelViewProjMatrix");

      this.u_cameraMatrixLoc = gl.getUniformLocation(program, "u_cameraMatrix");
  }
  
  uniformloc(gl, name) {
    if (!(name in this.uniforms)) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name); 
    }
    
    return this.uniforms[name];
  }
}

class DrawMats {
  constructor(Matrix4 normalmat, Matrix4 cameramat, Matrix4 persmat) {
    this.normalmat = new Matrix4(normalmat);
    this.cameramat = new Matrix4(cameramat);
    this.cameramat_zoom = new Matrix4(); //cameramat with zoom applied
    this.persmat = new Matrix4(persmat);
    this.rendermat = new Matrix4(); //private
  }
  
  static fromSTRUCT(reader) {
    var ret = new DrawMats();
    reader(ret);    
    return ret;
  }

  copy() : DrawMats {
    var cpy = new DrawMats(this.normalmat, this.cameramat, 
                           this.persmat);
    cpy.rendermat = new Matrix4(this.rendermat);
    
    return cpy;
  }

  toJSON() {
    return {
      normalmat : this.normalmat.toJSON(),
      cameramat : this.cameramat.toJSON(),
      persmat : this.persmat.toJSON(),
      rendermat : this.rendermat.toJSON()
    }
  }

  static fromJSON(json) {
    var dm = new DrawMats();
    
    dm.normalmat = Matrix4.fromJSON(json.normalmat);
    dm.cameramat = Matrix4.fromJSON(json.cameramat);
    dm.persmat = Matrix4.fromJSON(json.persmat);
    dm.rendermat = Matrix4.fromJSON(json.rendermat);
    
    return dm;
  }
}

DrawMats.STRUCT = """
  DrawMats {
    normalmat : mat4;
    cameramat : mat4;
    persmat   : mat4;
    rendermat : mat4;
  }
"""

function set_program(WebGLRenderingContext gl, ShaderProgram program, DrawMats drawmats) {
  if (program == undefined)
    console.trace();
    
  gl.useProgram(program.program);
  drawmats.normalmat.setUniform(gl, program.u_normalMatrixLoc, false);
  drawmats.rendermat.setUniform(gl, program.u_modelViewProjMatrixLoc, false);
  drawmats.cameramat.setUniform(gl, program.u_cameraMatrixLoc, false);
}

function _set_buffer_wire(WebGLRenderingContext gl, int selectmode, Mesh mesh)
{
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);
  gl.enableVertexAttribArray(2);
  gl.enableVertexAttribArray(4);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.faceverts);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  
  if (mesh.render.facecolors != 0) {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.facecolors);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
  }
  
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.norbuf);
  gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
}

function _set_buffer_solid(WebGLRenderingContext gl, Mesh mesh)
{
  // Set up all the vertex attributes for vertices, normals and texCoords
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);
  gl.enableVertexAttribArray(2);
  gl.disableVertexAttribArray(3);
  gl.enableVertexAttribArray(4);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.tri_vbuff);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.tri_nbuff);
  gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
  
  if (mesh.render.tri_cbuff != 0) {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.tri_cbuff);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
  }
  
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.tri_selbuff);
  gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 0, 0);
  
  
  /*gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.texbuf);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);*/
}

function set_highlight_uniforms(gl, highlight, program)
{
  var eidstr = highlight != undefined && (highlight.flag & Flags.SELECT) ? "highsel_eid" : "sel_eid";
  var eidstr2 = highlight != undefined && (highlight.flag & Flags.SELECT) ? "sel_eid" : "highsel_eid";
  
  var clr = [0, 0, 0, 0];
  if (highlight != undefined) {
    pack_index(highlight.sid+1, clr, 0);
  }
  
  gl.uniform4fv(gl.getUniformLocation(program.program, eidstr), clr);
  
  gl.uniform4fv(gl.getUniformLocation(program.program, "high_color"), highlight_color);
  gl.uniform4fv(gl.getUniformLocation(program.program, "highsel_color"), highlight_and_sel_color);
}

function render_mesh_elements(WebGLRenderingContext gl, View3DHandler view3d, 
                             Mesh mesh, Matrix4 drawmats, float alpha, 
                             Boolean draw_edges) //draw_edges is optional, defaults to true
{
  if (draw_edges == undefined)
     draw_edges = true;
     
  if (mesh.render.recalc != 0) {
    if (mesh.render.tri_vbuff == 0)
      mesh.regen_render()
    
    gen_mesh_render(gl, mesh, mesh.render.drawprogram, mesh.render.vertprogram, mesh.render.recalc);
  }
  
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);
  gl.enableVertexAttribArray(4);
  
  gl.disableVertexAttribArray(2);
  gl.disableVertexAttribArray(3);
  
  _set_buffer_wire(gl, view3d.selectmode, mesh);
  
  // Draw vertex point pass
  set_program(gl, mesh.render.vertprogram, drawmats);
  
  gl.uniform1f(gl.getUniformLocation(mesh.render.vertprogram.program, "alpha_mul"), alpha);
  gl.uniform4fv(gl.getUniformLocation(mesh.render.vertprogram.program, "face_unsel_color"), face_unsel_color);
  
  if (view3d.selectmode == MeshTypes.VERT) {
    set_highlight_uniforms(gl, mesh.verts.highlight, mesh.render.vertprogram);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.vertbuf);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.vcolorbuf);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    
    gl.enableVertexAttribArray(4);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.vselbuf);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 0, 0);
      
    gl.drawArrays(gl.POINTS, 0, mesh.verts.length);
    
    if (0) { //XXX draw_edges) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.render.edgeindexbuf);
      gl.drawElements(gl.LINES, mesh.edges.length*2, gl.UNSIGNED_SHORT, 0);
    }
    
    gl.disableVertexAttribArray(4);
  } if (view3d.selectmode == MeshTypes.FACE) {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.faceverts);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.facecolors);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    
    gl.disableVertexAttribArray(2);
    gl.disableVertexAttribArray(3);
    gl.disableVertexAttribArray(4);
    gl.drawArrays(gl.POINTS, 0, mesh.render.totface);  
    gl.enableVertexAttribArray(2);
  }
  
  if (draw_edges) { //XXX view3d.selectmode != MeshTypes.VERT && draw_edges) {
    if (view3d.selectmode & MeshTypes.EDGE) {
      set_highlight_uniforms(gl, mesh.edges.highlight, mesh.render.vertprogram);
      
      gl.enableVertexAttribArray(4);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.eselbuf);
      gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 0, 0);
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.edgebuf);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.ecolorbuf);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    
    gl.disableVertexAttribArray(2);
    gl.drawArrays(gl.LINES, 0, mesh.edges.length*2);  
    gl.enableVertexAttribArray(2);
    
    if (view3d.seleectmode & MeshTypes.EDGE) {
      gl.disableVertexAttribArray(4);
    }
  }
}

function set_light_uniform(WebGLRenderingContext gl, ShaderProgram program, Matrix4 drawmats) {
  var l1 = new Vector3([0, 0.5, 1])
  var l2 = new Vector3([0.5, 0, 1])
  
  l1.normalize();
  l2.normalize();
  
  gl.uniform3f(gl.getUniformLocation(program.program, "lightDir1"), l1[0], l1[1], l1[2]);
  gl.uniform3f(gl.getUniformLocation(program.program, "lightDir2"), l2[0], l2[1], l2[2]);
}

function render_mesh_selbuf(WebGLRenderingContext gl, 
                            Mesh mesh, DrawMats drawmats, int typemask)
{
  if (mesh.render.recalc != 0) {
    if (mesh.render.tri_vbuff == 0)
      mesh.regen_render()
    
    gen_mesh_render(gl, mesh, mesh.render.drawprogram, mesh.render.vertprogram, mesh.render.recalc);
  }
  
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);
  gl.disableVertexAttribArray(2);
  gl.disableVertexAttribArray(3);
  
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.POLYGON_OFFSET_FILL);
  gl.enable(gl.BLEND);
  gl.disable(gl.DITHER);
  
  gl.blendFunc(gl.ONE, gl.ZERO);
  
  set_program(gl, gl.selbuf, drawmats);
  
  if (typemask & MeshTypes.FACE) {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.tri_vbuff);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.tri_selbuff);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, mesh.render.tri_totvert);
  }
  
  if (typemask & MeshTypes.EDGE) {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.edgebuf);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.eselbuf);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.LINES, 0, mesh.edges.length*2);  
  }
  
  if (typemask & MeshTypes.VERT) {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.vertbuf);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.vselbuf);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.POINTS, 0, mesh.verts.length);
  }
  
  gl.disableVertexAttribArray(0);
  gl.disableVertexAttribArray(1);
  gl.disableVertexAttribArray(2);
  gl.disableVertexAttribArray(3);
    
  gl.enable(gl.DITHER);
}

function render_mesh_intern(WebGLRenderingContext gl, View3DHandler view3d, 
                            Mesh mesh, DrawMats drawmats, Boolean draw_overlay) 
{
  if (mesh.render.recalc != 0 || mesh.render.tri_vbuff == 0) {
    if (mesh.render.tri_vbuff == 0) 
      mesh.regen_render();
    gen_mesh_render(gl, mesh, mesh.render.drawprogram, mesh.render.vertprogram, mesh.render.recalc);
  }
  
  /*
  render_mesh_selbuf(gl, mesh, drawmats, MeshTypes.EDGE|MeshTypes.FACE);
  return;
  // */
  
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.POLYGON_OFFSET_FILL);
  
  // Set shaders and draw solid pass
  set_program(gl, mesh.render.drawprogram, drawmats);
  
  //triangles
  if (mesh.render.tri_totvert > 0) {
    gl.polygonOffset(1, 1);
    _set_buffer_solid(gl, mesh);
    
    if (view3d.selectmode & MeshTypes.FACE) {
      gl.enableVertexAttribArray(4);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.tri_selbuff);
      gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 0, 0);
      
      set_highlight_uniforms(gl, mesh.faces.highlight, mesh.render.drawprogram);
    } else {
      gl.disableVertexAttribArray(4);
    }
    
    /*draw solid faces*/
    var shader = mesh.render.drawprogram;
    
    gl.polygonOffset(1, 1);
    gl.uniform1f(shader.uniformloc(gl, "alpha_mul"), 1.0);
    gl.uniform1f(shader.uniformloc(gl, "lightfac_inv"), 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.render.tri_totvert);
    
    /*draw transparent overlay, in this case even in culled select mode*/
    
    /*ignore z if not in culled select mode*/
    if (draw_overlay) {
      gl.disable(gl.DEPTH_TEST);
    }
    
    /*disable zbuffer write*/
    gl.depthMask(0);
    
    /*change polygon offset to not conflict with existing z*/
    gl.polygonOffset(0, 0);
    gl.uniform1f(shader.uniformloc(gl, "alpha_mul"), 0.3);
    gl.uniform1f(shader.uniformloc(gl, "lightfac_inv"), 1.0);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.render.tri_totvert);
    
    /*enable zbuffer write*/
    gl.depthMask(1);
    
    if (draw_overlay) {
      gl.enable(gl.DEPTH_TEST);
    }
    
    if (0) { //mesh.render.outlinebuf != null) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.render.outlinebuf);
      gl.drawElements(gl.LINES, mesh.render.numIndices*2, gl.UNSIGNED_SHORT, 0);
    }
  }
  
  if (mesh.verts.length == 0)
    return;
  
  _set_buffer_solid(gl, mesh);
  render_mesh_elements(gl, view3d, mesh, drawmats, 1.0);

  /*render transparent overlay of backfaces*/
//  gl.blendFuncSeparate(gl.SRC_COLOR, gl.ONE_MINUS_SRC_COLOR,
//                       gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  if (draw_overlay) {
    gl_blend_func(gl);

    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    
    /*
    if (mesh.render.tri_totvert > 0) {
      gl.polygonOffset(2, 2);
      
      _set_buffer_solid(gl, mesh);
      
      set_program(gl, mesh.render.drawprogram, drawmats);
      gl.uniform1f(gl.getUniformLocation(mesh.render.drawprogram.program, "alpha_mul"), 0.3);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.render.tri_totvert);
      //gl.drawArrays(gl.TRIANGLES, 0, mesh.render.tri_totvert);
    }
    */
    
    set_program(gl, mesh.render.vertprogram, drawmats);
    render_mesh_elements(gl, view3d, mesh, drawmats, 0.3);
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
  }
  
  //gl.useProgram(mesh.render.drawprogram);
}

function render_mesh_object(WebGLRenderingContext gl, View3DHandler view3d, 
                            Mesh mesh, DrawMats drawmats, use_alphamul=true, 
                            drawprogram=undefined, drawmode=gl.TRIANGLES) 
{
  if (drawprogram == undefined)
    drawprogram = mesh.render.drawprogram;
  
  if (mesh.render.recalc != 0) {
    gen_mesh_render(gl, mesh, drawprogram, mesh.render.vertprogram, mesh.render.recalc);
  }
  
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.POLYGON_OFFSET_FILL);
  
  // Set shaders and draw solid pass
  set_program(gl, drawprogram, drawmats);
  
  //triangles
  if (drawmode == gl.TRIANGLES && mesh.render.tri_totvert > 0) {
    _set_buffer_solid(gl, mesh);
    
    gl.disableVertexAttribArray(4);
    
    if (use_alphamul)
      gl.uniform1f(drawprogram.uniformloc(gl, "alpha_mul"), 1.0);
    
    gl.drawArrays(gl.TRIANGLES, 0, mesh.render.tri_totvert);
    
  } else if (drawmode == gl.LINES) {
    _set_buffer_solid(gl, mesh);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.edgebuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    
    gl.disableVertexAttribArray(1);
    gl.disableVertexAttribArray(2);
    gl.disableVertexAttribArray(3);
    gl.disableVertexAttribArray(4);
    
    //gl.lineWidth(3000.0);
    gl.drawArrays(gl.LINES, 0, mesh.edges.length*2);  
  }
}

function render_points(WebGLRenderingContext gl, Float32Array floatbuf, 
                      int totpoints, View3DHandler view3d, DrawMats drawmats) 
{
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.POLYGON_OFFSET_FILL);
  
  set_program(gl, mesh.render.vertprogram, drawmats);
  
  gl.uniform1f(gl.getUniformLocation(mesh.render.vertprogram.program, "alpha_mul"), 1);
  gl.uniform4fv(gl.getUniformLocation(mesh.render.vertprogram.program, "face_unsel_color"), [1.0, 1.0, 1.0, 1.0]);
  
  //console.log(floatbuf.length)
  
  var vertbuf = gl.createBuffer();
  
  gl.bindBuffer(gl.ARRAY_BUFFER, vertbuf);
  gl.bufferData(gl.ARRAY_BUFFER, floatbuf, gl.STATIC_DRAW);
  
  gl.disableVertexAttribArray(1);
  gl.disableVertexAttribArray(2);
  gl.disableVertexAttribArray(3);
      
  gl.bindBuffer(gl.ARRAY_BUFFER, vertbuf);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.POINTS, 0, Math.floor(totpoints/3));
  
  gl.finish();
  
  gl.deleteBuffer(vertbuf);
}

function render_mesh(WebGLRenderingContext gl, View3DHandler view3d, Mesh mesh1, DrawMats drawmats, Boolean draw_overlay) {
 
  /*
  var eid = 5442;
  var mesh2 = face_fill(mesh1.faces.get(eid), new GArray()); //mesh1.faces.__iterator__().next(), new GArray());
  
  mesh2.render = new render();
  mesh2.render.vertprogram = mesh1.render.vertprogram;
  mesh2.render.drawprogram = mesh1.render.drawprogram;
  mesh2.render.recalc = MeshRecalcFlags.REGEN_TESS|MeshRecalcFlags.REGEN_COLORS|MeshRecalcFlags.REGEN_NORS|MeshRecalcFlags.REGEN_COS;
  mesh2.api.recalc_normals();
  mesh1 = mesh2
  // */
  
  render_mesh_intern(gl, view3d, mesh1, drawmats, draw_overlay);
  //mesh2.render.destroy(gl);
}

