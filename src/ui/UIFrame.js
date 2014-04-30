"use strict";

/************** ui frame **************/
var _static_mat = new Matrix4();
var _ufbd_v1 = new Vector3();
//hack for spreading updates across frames
var _canvas_threshold = 1.0;
class UIFrame extends UIElement {
  constructor(ctx, canvas, path, pos, size) { //path, pos, size are optional
    UIElement.call(this, ctx, path, pos, size);
    
    this.ctx = ctx;
    this.children = new GArray([])
    this.active = undefined;
    
    //current mouse position relative to this.pos
    this.mpos = [0, 0];
    
    this.draw_background = false;
    
    if (canvas != undefined) {
      this.canvas = canvas;
      this.view3d = canvas.view3d;
    }
    
    this.leafcount = 0;
    this.framecount = 0;
    this.rcorner = 16.0;
    this.keymap = undefined;
  }
  
  on_gl_lost(WebGLRenderingContext new_gl) {
    if (this.canvas != undefined && !(this.canvas.gl === new_gl)) {
      this.canvas.on_gl_lost(new_gl);
    }
    
    if (this.children == undefined)
      return;
    
    for (var c in this.children) {
      c.on_gl_lost(new_gl);
    }
    
    this.do_full_recalc();
  }
  
  get_keymaps() {
    return this.keymap != undefined ? [this.keymap] : [];
  }
  
  do_full_recalc()
  {
    this.do_recalc();
    
    for (var c in this.children) {
      if (c instanceof UIFrame) 
        c.do_full_recalc();
      else
        c.do_recalc();
    }
  }

  on_resize(Array<int> newsize, Array<int> oldsize)
  {
    if (this.canvas != undefined) {
      this.canvas.on_resize(newsize, oldsize);
    }
    
    this.do_recalc();
    
    for (var c in this.children) {
      c.do_recalc();
      c.on_resize(newsize, oldsize);
    }
  }

  on_inactive() {
    if (this.active != undefined) {
      this.active.state &= ~UIFlags.HIGHLIGHT;
      this.active.do_recalc();
      this.active.on_inactive();
      this.active = undefined;
      this.do_recalc();
    }
  }

  push_modal(e) {
    UIElement.prototype.push_modal.call(this, e);
  }

  pop_modal() {
    UIElement.prototype.pop_modal.call(this);
  }

  _on_mousemove(MouseEvent event) {
    if (this.modalhandler != null) {
      if (this.modalhandler instanceof UIElement) {
        event.x -= this.modalhandler.pos[0]
        event.y -= this.modalhandler.pos[1]
      }
      this.modalhandler._on_mousemove(event);
      
      return true;
    } else {
      return this.on_mousemove(event);
    }
  }

  on_mousemove(MouseEvent e) {
    var mpos = [e.x, e.y]
    //current mouse position relative to this.pos
    this.mpos = mpos;
    
    var found = false;
    
    for (var i=this.children.length-1; i >= 0; i--) {
      var c = this.children[i];
      
      if (inrect_2d(mpos, c.pos, c.size)) {
        found = true;
        if (this.active != c && this.active != undefined) {
          this.active.state &= ~UIFlags.HIGHLIGHT;
          this.active.on_inactive();
          this.active.do_recalc();
        }
        
        if (this.active != c) {
          //console.log("active", c.constructor.name);
          
          c.state |= UIFlags.HIGHLIGHT;
          c.on_active();
          c.do_recalc();
          this.active = c;      
        }
        
        break;
      }
    }
    
    if (!found && this.active != undefined) {
      //console.log("inactive", get_type_name(this))
      this.active.state &= ~UIFlags.HIGHLIGHT;
      this.active.on_inactive();
      this.active.do_recalc();
      this.active = undefined;
    }
    
    if (this.active != undefined) {
      e.x -= this.active.pos[0];
      e.y -= this.active.pos[1];
      
      this.active.on_mousemove(e)
      
      e.x += this.active.pos[0];
      e.y += this.active.pos[1];
    }
    
    return this.active != undefined;
  }

  _on_mousedown(MouseEvent event) {
    if (this.modalhandler != null) {
      if (this.modalhandler["pos"] != undefined) {
        event.x -= this.modalhandler.pos[0]
        event.y -= this.modalhandler.pos[1]
      }
      this.modalhandler._on_mousedown(event);
    } else {
      this.on_mousedown(event);
    }
  }

  on_mousedown(MouseEvent e) {
    var mpos = [e.x, e.y];
    
    //current mouse position relative to this.pos
    this.mpos = mpos;
    
    this.on_mousemove(e);
    e.x = mpos[0];
    e.y = mpos[1];
    
    if (this.active != undefined) {
      e.x -= this.active.pos[0];
      e.y -= this.active.pos[1];
      
      this.active.on_mousedown(e);
    }
    
    return this.active != undefined;
  }


  _on_mouseup(MouseEvent event) {
    if (this.modalhandler != null) {
      if (this.modalhandler["pos"] != undefined) {
        event.x -= this.modalhandler.pos[0]
        event.y -= this.modalhandler.pos[1]
      }
      this.modalhandler._on_mouseup(event);
    } else {
      this.on_mouseup(event);
    }
  }

  on_mouseup(MouseEvent e) {
    if (this.active != undefined) {
      e.x -= this.active.pos[0];
      e.y -= this.active.pos[1];
      
      this.active.on_mouseup(e);
    }
    
    return this.active != undefined;
  }


  _on_mousewheel(MouseEvent event, float delta) {
    if (this.modalhandler != null) {
      if (this.modalhandler["pos"] != undefined) {
        event.x -= this.modalhandler.pos[0]
        event.y -= this.modalhandler.pos[1]
      }
      this.modalhandler._on_mousewheel(event, delta);
    } else {
      this.on_mousewheel(event, delta);
    }
  }

  on_mousewheel(MouseEvent e, float delta) {
    if (this.active != undefined) {
      if (this.modalhandler != null && this.modalhandler["pos"] != undefined) {
        event.x -= this.modalhandler.pos[0]
        event.y -= this.modalhandler.pos[1]
      }
      
      this.active.on_mousewheel(e, delta);
    }
    
    return this.active != undefined;
  }

  on_keydown(KeyboardEvent e) {
    if (this.active != undefined) {
      this.active._on_keydown(e);
    }
    
    return this.active != undefined;
  }


  on_keyup(KeyboardEvent e) {
    if (this.active != undefined) {
      this.active._on_keyup(e);
    }
    
    return this.active != undefined;
  }

  on_charcode(KeyboardEvent e) {
    if (this.active != undefined) {
      this.active._on_charcode(e);
    }
    
    return this.active != undefined;
  }

  add(UIElement e, int packflag) { //packflag is optional
    e.defunct = false;
    this.children.push(e);
    
    if (!(e instanceof UIFrame)) {
      this.leafcount++;
    } else {
      this.framecount++;
    }
    
    if (packflag != undefined)
      e.packflag |= packflag;
    
    e.parent = this;
    if (e.canvas == undefined)
      e.canvas = this.canvas;
    
    e.on_add(this);
    this.do_recalc();
  }

  replace(UIElement a, UIElement b) {
    if (a == this.modalhandler) {
      a.pop_modal();
    }
    a.on_remove(this);
    this.children.replace(a, b);
    if (this.canvas != undefined)
      this.canvas.remove_cache(a);
    if (a == this.active)
      this.active = b;
    
    b.parent = this;
    if (b.canvas == undefined)
      b.canvas = this.get_canvas();
    if (b.ctx == undefined)
      b.ctx = this.ctx;
    
    b.on_add(this);
    
    this.do_recalc();
  }

  remove(UIElement e) {
    e.defunct = true;
    
    if (!(e instanceof UIFrame)) {
      this.leafcount--;
    } else {
      this.framecount--;
    }
    
    if (e == this.modalhandler) {
      e.pop_modal();
    }
    
    this.children.remove(e);
    e.on_remove(this);
    
    if (this.canvas != undefined)
      this.canvas.remove_cache(e);
    
    if (e == this.active)
      this.active = undefined;
  }

  on_draw(gl) {
    function descend(n, canvas) {
      for (var c in n.children) {
        if (c.canvas != undefined) continue;
        
        c.canvas = this.canvas;
        
        if (c instanceof UIFrame)
          descend(c, canvas);
      }
    }
    
    if (this.recalc && this.is_canvas_root() && this.get_canvas() != undefined) {
      this.canvas = this.get_canvas();
      
      if (this.canvas != undefined)
        descend(this, this.canvas);
      
      this.canvas.reset();
      if (DEBUG.ui_canvas)
        console.log("------------->Build draw called in " + this.constructor.name + ".on_draw()");
      
      this.build_draw(this.canvas);
    }
    
    if (this.canvas != undefined) {
      this.canvas.on_draw(gl);
    }
  }

  set_context(ctx)
  {
    this.ctx = ctx;
    for (var c in this.children) {
      c.set_context(ctx);
    }
  }

  build_draw(canvas, skip_box) { //skip_box is optional
    var mat = _static_mat;
    
    if (this.framecount == 0) {
      canvas.frame_begin(this);
    }
    
    if (this.parent == undefined) {
      this.abspos[0] = this.pos[0]; this.abspos[1] = this.pos[1];
    }
    
    if (this.pos == undefined) {
      this.pos = [0,0];
      console.log("eek");
      console.trace();
    }
    
    if (!skip_box && this.draw_background) {
      canvas.simple_box([0, 0], this.size, undefined, this.rcorner);
    }
    
    var retag_recalc = false;
    this.recalc = 0;
    
    var viewport = g_app_state.raster.viewport;
    
    for (var c in this.children) {
      c.abspos[0] = c.pos[0] + this.pos[0];
      c.abspos[1] = c.pos[1] + this.pos[1];
     
      if (!aabb_isect_2d(c.abspos, c.size, viewport[0], viewport[1])) {
        continue;
      }
      
      if (c.pos == undefined) {
        c.pos = [0,0];
        c.size = [0, 0];
        console.log("eek2");
        console.trace();
      }
      
      mat.makeIdentity();
      _ufbd_v1.zero(); _ufbd_v1[0] = c.pos[0]; _ufbd_v1[1] = c.pos[1];
      
      mat.translate(_ufbd_v1);
      
      if (c.canvas != undefined && c.canvas != this.get_canvas())
        continue;
      if (c.is_canvas_root())
        continue;
      
      var do_skip = !c.recalc;
      
      if (!(c instanceof UIFrame) && this.constructor.name != UIMenu.name) {
        do_skip = !c.recalc || Math.random() > _canvas_threshold;
      }
      
      if (canvas.has_cache(c) && do_skip) {
        if (c.recalc) {
          retag_recalc = true;
          c.do_recalc();
        }
        
        canvas.use_cache(c);
      } else {
        var r = this.recalc;
        
        if (!(c.packflag & PackFlags.NO_REPACK))
          c.pack(canvas, false);
          
        canvas.push_transform(mat);
        
        try {
          c.build_draw(canvas);
        } catch (_err) {
          print_stack(_err);
          
          //ensure borked element isn't modal
          if (c == this.modalhandler)
            c.pop_modal();
          console.log("Error occured while drawing element ", c);
        }
        
        canvas.pop_transform(mat);
        c.recalc = 0;
      }
    }

    if (this.framecount == 0) {
      canvas.frame_end(this);
    }
    
    if (retag_recalc)
      this.do_recalc();
  }

  //pre_func is optional, and is called before each child's on_tick is executed
  on_tick(pre_func) {
    for (var c in this.children) {
      if (pre_func != undefined)
        pre_func(c);
      
      c.on_tick();
      
      if (c.status_timer != undefined) {
        c.inc_flash_timer();
        c.do_recalc();
      }
    }
  }

  pack(UICanvas canvas, Boolean isvertical) {
    for (var c in this.children) {
      if (!(c.packflag & PackFlags.NO_REPACK))
        c.pack(canvas, isvertical);
    }  
  }
  
  add_floating(e, modal=false, center=false)//center is optional, defaults to true
  {
    var off = [e.pos[0], e.pos[1]];
    var frame = this;
    
    while (frame.parent != undefined) {
      off[0] += frame.pos[0]; off[1] += frame.pos[1]
      frame = frame.parent;
    }
    
    e.canvas = frame.get_canvas();
    e.do_recalc();
    
    if (center) {
      off[0] -= e.size[0]/3
      off[1] -= e.size[1]/3
    }
    
    e.pos[0] = off[0];
    e.pos[1] = off[1];
    
    frame.add(e);
    if (modal) {
      frame.push_modal(e);
      //frame._on_mousemove({"x": e.pos[0]-frame.pos[0], "y":e.pos[1]-frame.pos[1]})
    }
  }
}
