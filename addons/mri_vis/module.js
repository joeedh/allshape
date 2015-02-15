addon_define("MRI Visualization", "mri_vis", 0.01, function(util) {
  var modules = [
    "vectormath", "spline", "math", "util",
    "solver", "sim", "dicomParser", "cornerstone",
    "mridata", "meshvis", "cornerstoneWADOImageLoader",
    "draw", "shaders", "simplemesh", "texture"
  ];
  
  function SceneDBData() {
    AddOnDBData.call(this);
    
    this.a = 0;
    this.b = "yay";
    this.c = ["bleh"];
  };
  
  SceneDBData.prototype = util.inherit(SceneDBData, AddOnDBData, {
    data_link : function(block, getblock, getblock_us) { 
    },
    
    copy      : function(dest, source) {
    },
    
    unlink_block : function(block) {
    },
    
    fromSTRUCT : util.static_method(function(reader) {
      var ret = new SceneDBData();
      
      reader(ret);
      
      return ret;
    })
  });
  
  SceneDBData.STRUCT = [
    "SceneDBData {",
    "  a : int;",
    "  b : string;",
    "  c : array(string);",
    "}"
  ].join("\n");

  function MRIVis() {
    AddOn.call(this, 0.01);
    
    this.ready = false;
    
    this.mods = {};
    this.require_load();
    
    /*
    var _i = 0;
    var this2 = this;
    
    var ival;
    
    ival = window.setInterval(function() {
      if (_i++) {
        this2.ready = true;
        console.log("finished loading!!!!!!!!!!!!!!!!!!!!");
        window.clearInterval(ival);
      }
    }, 700);*/
  }

  MRIVis.prototype = util.inherit(MRIVis, AddOn, {
    datablock_classes : {
      "SCENE" : SceneDBData,
    },
    
    on_module_unload : function(ctx, appstate) {
      console.log("MRIVis: Unloading...");
      console.log("  freeing textures");
      this.mods.texture.manager.destroy(appstate.gl);
      
      if (this.mesh != undefined) {
        this.mesh.gl_destroy(appstate.gl);
      }
    },

    on_object_draw : function(gl, ob, view3d, ctx) {
      if (ob.name != this.mods.meshvis.MNAME) return false;
      if (this.mesh == undefined) return;
      
      var mesh = this.mesh;
      var program = mesh.islands[0].program;
      
      gl.useProgram(program.program);
      gl.activeTexture(0);
      
      for (var i=0; i<mesh.islands.length; i++) {
        var frame = this.frames[i];
        
        if (frame != undefined && frame.tex != undefined) {
          var tex = frame.tex;
          
          //gl.bindTexture(gl.TEXTURE_2D, tex.gltex);
          
          //gl.uniform1i(program.uniformloc("diff_map"), 0);
          this.mods.texture.manager.bind_texture(gl, tex, program, program.uniformloc("diff_map"));
          //console.log("bind texture!");
        } else continue;//diff_map
      
        mesh.islands[i].program = program;
        mesh.islands[i].draw(gl, view3d.drawmats);
        
        gl.flush();
        gl.finish();
        
        if (frame != undefined && frame.tex != undefined) {
          var tex = frame.tex;
          
          //gl.bindTexture(gl.TEXTURE_2D, tex.gltex);
          
          //gl.uniform1i(program.uniformloc("diff_map"), 0);
          this.mods.texture.manager.unbind_texture(gl, tex);
          //console.log("bind texture!");
        } else continue;//diff_map
      }
      
      return true;
    },
    
    require_load : function() {
      var done = false;
      
      var this2 = this;
      function do_load() {
        if (done) return;
        done = true;
        
        for (var i=0; i<modules.length; i++) {
          require.undef(modules[i]);
        }
        
        require.config({
          baseUrl : "/api/addon/file/get/mri_vis/scripts"
        });
        
        require(["jquery"], function() {
          require(["cornerstone"], function() {
            require(["spline", "vectormath", "math", "util", "solver", 
                     "mridata", "meshvis", "texture", "simplemesh",
                     "shaders"], 
            function(spline, vectormath, math, util, solver, mridata,
                     meshvis, texture, simplemesh, shaders) 
            {
              this2.mods.spline = spline;
              this2.mods.vectormath = vectormath;
              this2.mods.math = math;
              this2.mods.util = util;
              this2.mods.solver = solver;
              this2.mods.mridata = mridata;
              this2.mods.meshvis = meshvis;
              this2.mods.texture = texture;
              this2.mods.simplemesh = simplemesh;
              this2.mods.shaders = shaders;
              
              this2.ready = true;
            });
          });
        });
      }
      
      if (window.require == undefined) {
         var head= document.getElementsByTagName('head')[0];
         var script= document.createElement('script');
         
         script.type= 'text/javascript';
         script.src = "/api/addon/file/get/mri_vis/scripts/require.js";
         head.appendChild(script);
         
         script.onreadystatechange = function() {
          if (this.readyState == 'complete') 
            do_load();
         }
         script.onload = do_load;
      } else {
        do_load();
      }
      
      //var require = window.require;
    },
    
    on_file_open : function(ctx) {
      var sdata = ctx.scene.get_addon_data(this);
      
      //return //XXX
      
      if (sdata.a == 0)
        sdata.a = 1;
      
      //this.mods.meshvis.init_mesh_vis(ctx);
      console.log("MODS:", this.mods);
      console.trace();
      
      console.log("sdata!", sdata);
      console.log("ready", this.ready);
      
      this.mods.meshvis.init_mesh_vis(ctx);
      
      var this2 = this;
      var floor = Math.floor;
      this.frames = {};
      
      var totframe = 104, totdone=0;
      var on_frameset_finish;
      var gl = ctx.appstate.gl;
      
      function load_frame(frame) {
        var idx = ""+(frame+1)
        while (idx.length < 3) {
          idx = "0" + idx;
        }
        
        var path = "/api/addon/file/get/mri_vis/data/series1/IMG-0002-00"+idx+".jpg"
        
        var tex = this.mods.texture.manager.load_texture(gl, path);
        this.frames[frame] = {size : [512, 512], tex : tex};
        
        /*
        this.mods.mridata.load_dicom(function(data) {
          //var dataSet = dicomParser.parseDicom(data);
          
          this.mods.mridata.get_frame(data, frame+20, function(image) {
            console.log("loaded image frame", image);
            
            var pdata = image.getPixelData();
            var size = [image.width, image.height];
            var range = [image.minPixelValue, image.maxPixelValue];
            
            pdata2 = new Uint8Array(pdata.length);
            for (var i=0; i<pdata.length; i++) {
              pdata2[i] = floor(255.0*(pdata[i]-range[0]) / (range[1]-range[0]));
            }
            pdata = pdata2;
            
            this.frames[frame] = {size : size, data : pdata};
            
            totdone++;
            if (totdone == totframe) {
              on_frameset_finish.call(this);
            }      
          }, this);
        }, this);*/
      }
      
      /*
      function gen_frame_tex(frame) {
        var gl = ctx.appstate.gl;
        var texture = this.mods.texture;
        var tex = new texture.Texture()
        var pdata = frame.data;
        var size = frame.size;
        
        var fmt = gl.ALPHA;
        
        var gltex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, gltex);
        
        gl.texImage2D(gl.TEXTURE_2D, 0, fmt, size[0], size[1], 
                      0, fmt, gl.UNSIGNED_BYTE, pdata);
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        tex.gltex = gltex;
        tex.ready = true;
        
        texture.manager.add(tex);
        frame.tex = tex;
        
        gl.bindTexture(gl.TEXTURE_2D, null);
      }*/
      
      on_frameset_finish = function() {
        //console.log("\nFinished loading frames!\n");
      }
      
      for (var i=0; i<totframe; i++) {
        //console.log("Loading frame ", i+1);
        load_frame.call(this, i);
      }
      
      var simplemesh = this.mods.simplemesh;
      var shaders = this.mods.shaders;
      
      var gl = ctx.appstate.gl;
      shaders.init_shaders(gl);
      
      var lflags = simplemesh.LayerFlags;
      var mesh = this.mesh = new simplemesh.Mesh(lflags.USE_UVS|lflags.USE_IDS);
      mesh.island.program = shaders.road_shader;
      
      for (var i=0; i<totframe; i++) {
        if (i > 0) {
          mesh.add_island(lflags.USE_UVS|lflags.USE_IDS);
          mesh.island.program = shaders.road_shader;
        }
        
        var z = -i/40.0;
        var quad = this.mesh.add_quad([-1, -1, z], [-1, 1, z], [1, 1, z], [1, -1, z]);
        
        var p = 0.1;
        var ux = 0.0;
        var uy = 0.05;
        quad.uvs([p+ux, p+uy], [p+ux, 1-p+uy], [1-p+ux, 1-p+uy], [1-p+ux, p+uy]);
      }
    }
  });
  
  return MRIVis;
});
