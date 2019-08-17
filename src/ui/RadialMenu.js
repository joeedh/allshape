"use strict";

class UIRadialMenuEntry extends UIElement {
  constructor(label, hotkey, pos, size) {
    super();

    this.clicked = false;
    this.label = label
    this.text = ""
    this.pos = pos
    this.hotkey = hotkey
    this.size = size
    this.i = 0
    this.callback = undefined;
    this.add_sep = false;
    this.packed = false;
    this.start_angle = 0;
    this.end_angle = 0;
  }

  on_mousedown(MouseEvent event) {
    if ((event.button == 0 || (event.button==2&&this.parent.close_on_right)) && !this.clicked) {
      this.clicked = true;
      this.do_recalc();
      
      if (inrect_2d([event.x, event.y], [0,0], this.size)) {
        if (this.callback != undefined) {
          this.callback(this);
        }
      }
      
    }  
  }

  on_mouseup(MouseEvent event) {
    console.log(this.parent.call_time);
    
    if (event.button == 0 || (event.button==2&&this.parent.close_on_right)) {
      this.clicked = false;
      this.do_recalc();
      
      if (inrect_2d([event.x, event.y], [0,0], this.size)) {
        if (this.callback != undefined) {
          this.callback(this);
        }
      }
    }  
  }

  build_draw(UICanvas canvas) {
    canvas.begin(this);
    
    var tsize = canvas.textsize(this.text)
    
    //canvas.simple_box([0,0], this.size)
    canvas.text([(this.size[0]-tsize[0])*0.5+2, (this.size[1]-tsize[1])*0.25], this.text, uicolors["BoxText"]);
    if (this.hotkey != undefined) {
      var twid = canvas.textsize(this.hotkey)[0];
      
      canvas.text([this.size[0]-twid-8, 2], this.hotkey, uicolors["BoxText"]);      
    }
    
    canvas.end(this);
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    var tsize1 = canvas.textsize(this.text);
    var tsize2 = canvas.textsize(this.hotkey);
    
    //if (this.hotkey != "" && this.hotkey != undefined)
    //  tsize2[0] += 10;
    
    return [tsize1[0]+tsize2[0]+4, tsize1[1]+tsize2[1]]
  }
}

class UIRadialMenu extends UIFrame {
  constructor(name, callback) {
    super();
    
    this.name = name
    this.callback = callback;
    this.idmap = {}
    this.closed = false;
    this.chosen_id = undefined : String;
    this.minwidth = undefined : int;
    this.hkey_line_pos = 0;
    this.close_on_right = false;
    this.call_time = 0;
    this.last_active = undefined;
    this.mpos = new Vector2([0, 0])
    
    this._do_callback = false;
    this._do_end = false;
    this._have_rebuilt = false;
    
    this.radius = 0.0;
    this.radius_min = this.radius_max = 0.0;
    
    this.swap_mouse_button = undefined;
    this.had_up_event = undefined;
    
    //not related to radius_min and radius_max
    this.min_radius = 50;
  }

  add_item(text, hotkey, id) {
    var en = new UIRadialMenuEntry(text, hotkey, [0,0], [0,0]);
    
    en.close_on_right = this.close_on_right;
    en.i = this.children.length;
    if (id == undefined)
      id = en.id;
      
    this.idmap[en.i] = id;
    
    this.add(en);
    return;
  }

  on_keydown(KeyboardEvent event) {
    if (event.keyCode == charmap["Enter"]) {
      if (this.active != undefined && this.active.constructor.name == UIRadialMenuEntry.name) {
        this.active.callback(this.active);
      }
    } else if (event.keyCode == charmap["Escape"]) {
      this.end_menu(false);
    }
  }

  calc_radius(canvas)
  {
    var min_radius = this.min_radius;
    
    var clen=0;
    var children = new GArray()
    
    for (var c of this.children) {
      if (c.constructor.name == UIRadialMenuEntry.name) {
        clen++;
        c.size = c.get_min_size(canvas, false);
        children.push(c);
      }
    }
    
    function pack(rad) {
      var f = -Math.PI/2;
      var df = (Math.PI*2)/(clen);
      for (var c of children) {
        c.pos[0] = rad + Math.cos(f)*rad - c.size[0]*0.5;
        c.pos[1] = rad + Math.sin(f)*rad - c.size[1]*0.5;
        
        f += df;
      }
    }
    var r1 = 1.0; //Math.sqrt(this.size[1]*this.size[1])*0.1;
    
    var f = -Math.PI/2;
    var df = (Math.PI*2)/(clen);
    
    var minx, miny;
    var maxx, maxy;
    var r2;
    
    var c_mm = new MinMax(2);
    
    pack(r1);
    for (var c of children) {
      c_mm.minmax_rect(c.pos, c.size)
      f += df;
    }
    
    /*
    this.radius = r2;
    this.radius_min = r2;
    this.radius_max = r2;
    return
    // */
    
    r2 = Math.sqrt(this.size[1]*this.size[1])*2.0; //Math.max(c_mm.max[0]-c_mm.min[0], c_mm.max[1]-c_mm.min[1])/2;
    var last_valid_r = r2*2;
    
    //we use a simple binary search to find
    //the minimum valid radius that doesn't cause
    //the menu entries to intersect with each other.
    //last_valid_r = r2*2;
    var n = 64; //this.children > 4 ? 7 : 2
    
    for (var i=0; i<n; i++) {
      var rmid = (r1+r2)*0.5
      var found=false;
      
      pack(rmid);
      
      for (var c1 of children) {
        for (var c2 of children) {
          if (c1 == c2) continue;
          
          if (aabb_isect_2d(c1.pos, c1.size, c2.pos, c2.size)) {
            found = true;
            break;
          }
        }
        
        if (found) break;
      }
      
      if (found) {
        r1 = rmid;
      } else {
        r2 = rmid;
        last_valid_r = rmid;
      }
    }
    
    //find minimum and maximum radii for 2-dimensional torus
    var r_mm = new MinMax(1);
    var c_mm = new MinMax(2);
    
    for (var j=0; j<6; j++) {
      pack(last_valid_r);
      
      c_mm.reset();
      r_mm.reset();
      r_mm = new MinMax(1);
      c_mm = new MinMax(2);
      for (var c of children) {
        c_mm.minmax_rect(c.pos, c.size);
      }
      
      var cent = new Vector2(c_mm.max).add(c_mm.min).mulScalar(0.5);
      
      for (var c of children) {
        //find c.pos with origin in the center of the circle 
        var pos = [c.pos[0], c.pos[1]];
        
        var p1 = [(pos[0]), (pos[1])]
        var p2 = [(pos[0]+c.size[0]), (pos[1]+c.size[1])]
        
        var minx = Math.min(p1[0], p2[0]);
        var miny = Math.min(p1[1], p2[1]);
        var maxx = Math.max(p1[0], p2[0]);
        var maxy = Math.max(p1[1], p2[1]);
        
        minx = pos[0]; miny = pos[1];
        maxx = pos[0]+c.size[0]; maxy = pos[1]+c.size[1];
        
        var size = new Vector2(c.size)
        size.mulScalar(0.5);
        
        var cs = get_rect_points(pos, size);
        for (var i=0; i<4; i++) {
          //var r2 = Math.sqrt(cs[i][1]*cs[i][1])
          //r_mm.minmax(r2);
          var x = cs[i][0]-cent[0], y = cs[i][1]-cent[1];
          var r2 = Math.sqrt(x*x+y*y)
          //var r1 = cs[i][0]*cs[i][0] + cs[i][1]*cs[i][1];
          //console.log(r2, cs[i][0], cs[i][1], pos[0], pos[1], c.size[0], c.size[1]);
          r_mm.minmax(r2);  
        }   
        
        f += df;
      }
      //break
      if (r_mm.min < 20 && j < 5) {
        if (r_mm.min > 1.0) {
          last_valid_r += (20.0-r_mm.min)*0.5;
        } else {
          last_valid_r = (last_valid_r+1.0)*1.1;
        }
      }
    }
    
    this.radius_min = Math.floor(r_mm.min);
    this.radius_max = Math.ceil(r_mm.max);
    this.radius = last_valid_r
    var r = this.radius_max;
    
    this.cent = new Vector2([r, r])
    
    for (var c of children) {
      c.pos[0] += this.radius_max - this.radius
      c.pos[1] += this.radius_max - this.radius
    }
    
    console.log(this.radius_min, this.radius_max, this.radius);
  }

  packmenu(canvas)
  {
    var maxwid=-1;
    var y = 0;
    
    var ehgt = 25
    var padx = 2
    
    this.ehgt = ehgt
    
    var this2 = this;
    function menu_callback(e) {
      if (this2.closed) return;

      this2.end_menu();
      
      if (this2.callback != undefined) {
        this2.chosen_id = this2.idmap[e.i];
        this2.callback(e, this2.idmap[e.i]);
      }
    }
      
    for (var c of this.children) {
      if (c.constructor.name != "UIRadialMenuEntry") continue; //there may be other elements present
      
      c.callback = menu_callback;
    }
    
    y = 5;
      
    var maxcol = 0
    var hkey_line_pos = 0
    for (var c of this.children) {
      if (c.constructor.name != UIRadialMenuEntry.name) continue; //there may be other elements present
      
      var st = c.label + " " + c.hotkey;    
      maxwid = Math.max(canvas.textsize(st)[0]+30, maxwid)
      hkey_line_pos = Math.max(canvas.textsize(c.label + "    ")[0]+18, hkey_line_pos);
      maxcol = Math.max(st.length, maxcol)
      y += ehgt;
    }
    
    this.hkey_line_pos = hkey_line_pos;
    
    if (this.minwidth != undefined) 
      maxwid = Math.max(this.minwidth, maxwid);
    
    //assign final text values
    for (var c of this.children) {
      if (c.constructor.name != UIRadialMenuEntry.name) continue; //there may be other elements present

      c.text = c.label
      c.text = c.text.replace(" ", "\n");
    }
    
    this.size = [maxwid, y]
    this.calc_radius(canvas);
    
    var mm = new MinMax(2)
    for (var c of this.children) {
      if (c.constructor.name != UIRadialMenuEntry.name) continue; //there may be other elements present
      
      mm.minmax_rect(c.pos, c.size);
    }
    
    var sz = Math.max(mm.max[0]-mm.min[0], mm.max[1]-mm.min[1])
    this.size = [sz, sz]
    
    this.size = [this.radius_max*2, this.radius_max*2]
    
    var a_mm = new MinMax(1);
    var ax = new Vector2([0, 1]);
    var n1 = new Vector2([0, 0]);
    
    var starts = []
    var ends = []
    console.log("start")
    
    var off = new Vector2(this.size);
    off.sub(new Vector2(mm.max).sub(mm.min))
    off.mulScalar(0.5);
    off.sub(mm.min)
    
    off.zero();
    //this.cent.add(off);
    
    for (var c of this.children) {
      if (c.constructor.name != UIRadialMenuEntry.constructor.name)
        continue;
       
      //XXX
      //c.pos[0] += off[0];
      //c.pos[1] += off[1];
      
      var pos = [c.pos[0]-this.cent[0], c.pos[1]-this.cent[1]];
      
      a_mm.reset();
      
      var cs2 = get_rect_points(pos, c.size);
      
      for (var i=0; i<4; i++) {
        n1.load(cs2[i]).normalize();
      
        var ang = Math.acos(ax.dot(n1))
        var sign = ang > 0.0 ? 1.0 : -1.0
        
        if (!winding([0.0, 0.0], n1, ax)) {
          ang = -ang; //Math.PI*2-ang;
          
        }
        
        if (c == this.children[0]) {
          while (ang < -0.0) {
            ang += Math.PI*2.0*sign;
          }
        
          while (ang > Math.PI*2) {
            ang -= Math.PI*2.0;
          }
        }
        a_mm.minmax(ang);
      }
      
      if (starts.length > 0) {
        var s = starts[starts.length-1];
        var e = ends[starts.length-1];
        
        sign = a_mm.min < e ? 1.0 : -1.0
        while (Math.abs(a_mm.min-e) > Math.PI) {
          a_mm.min += Math.PI*2.0*sign;
        }
        
        sign = a_mm.max < a_mm.min ? 1.0 : -1.0
        while (Math.abs(a_mm.max-a_mm.min) > Math.PI) {
          a_mm.max += Math.PI*2.0*sign;
        }
        
        s = a_mm.min; e = a_mm.max;
        
        a_mm.min = Math.min(s, e);
        a_mm.max = Math.max(s, e);
      }
      
      console.log(a_mm.min, a_mm.max);
      c.start_angle = a_mm.min;
      c.end_angle = a_mm.max;
    }
    
    var children = []
    for (var c of this.children) {
      if (c.constructor.name == UIRadialMenuEntry.constructor.name)
        children.push(c);
    }
    
    for (var i=0; i<children.length; i++) {
      var c = children[i];
      var s = c.start_angle, e = c.end_angle;
      
      c.start_angle = Math.min(s, e);
      c.end_angle = Math.max(s, e); 
      starts.push(c.start_angle);
      ends.push(c.end_angle); 
     }
    
    for (var i2=0; i2<children.length; i2++) {
      var i1 = (i2 + children.length - 1) % children.length;
      var i3 = (i2+1) % children.length;
      
      var e1 = ends[i1];
      var s2 = starts[i2];
      var e2 = ends[i2];
      var s3 = starts[i3];
      
      if (0) {
        var sign = s2 < e1 ? 1.0 : -1.0;
        
        while (Math.abs(e1-s2) > Math.PI) {
            s2 += Math.PI*2.0*sign;
        /*
          if (s2 < e1)
            s2 += Math.PI*2.0;
          else
            e1 += Math.PI*2.0;
        // */
        }
        //if (s2 < e1) s2 += Math.PI*2.0;
        
        if (s2 < e1) {
          var t = s2;
          s2 = e1;
          e1 = t;
        }
        
        var sign = e2 < s2 ? 1.0 : -1.0;
        while (Math.abs(e2-s2) > Math.PI) {
          e2 += Math.PI*2.0*sign;
          /*
          if (s2 < e2)
            s2 += Math.PI*2.0;
          else
            e2 += Math.PI*2.0;
            
          // */
        }
        
        if (e2 < s2) {
          t = s2;
          s2 = e2;
          e2 = t;
        }
        
        var sign = s3 < e2 ? 1.0 : -1.0;
        while (Math.abs(e2-s3) > Math.PI) {
          s3 += Math.PI*2.0*sign;
          /*
          if (s3 < e2)
            s3 += Math.PI*2.0;
          else
            e2 += Math.PI*2.0;
          // */
        }
        
        if (s3 < e2) {
          t = s3;
          s3 = e2;
          e2 = t;
        }
      }
      
      var c1 = children[i1];
      var c2 = children[i2];
      var c3 = children[i3];
      var s = (s2 + e1)*0.5
      var e = (e2 + s3)*0.5
      
      //c2.start_angle -= Math.abs(s2-e1)*0.5;
      if (i2 == children.length-1) {
        //c3.end_angle -= (c2.start_angle - e)*0.5;
        c2.start_angle = (c3.end_angle + c2.start_angle - Math.PI*2)*0.5;
        c3.end_angle = c2.start_angle + Math.PI*2; //-= (c2.start_angle - e)*0.5;
      }
      
      if (i2 != children.length-1) {
        c2.start_angle = (e2+s3)*0.5;
      }
      
      if (i2 != 0) {
        c2.end_angle = (s2+e1)*0.5;
      } else if (i2 == 1) {
        //c1.end_angle += Math.abs(c2.start_angle-(s2+e1)*0.5)*0.25;
        c1.start_angle = c2.end_angle
      }
      if (i2 != 1 && i2 != children.length-1) {
        //c1.end_angle  = c2.start_angle;
      }
      
      //c2.end_angle = Math.max(e, s);
    }
    this.do_recalc();
  }

  end_menu(do_callback) //do_callback is optional, false
  {
    if (do_callback == undefined)
     do_callback = false;
   
    this._do_end = true;
    this._have_rebuilt = false;
    
    if (!this.closed) {
      this.do_recalc();
      this.closed = true;
      
      if (this.parent.active == this) {
        this.parent.active = this.last_active;
        this.last_active.on_active();
        /*var e = new MouseEvent(this.pos[0], this.pos[1], 0, 0)
        e.shiftKey = 0;
        e.ctrlKey = 0;
        e.altKey = 0;*/
        
        //this.parent._on_mousemove(e)
      }
      
      if (do_callback) {
        this._do_callback = true;
        this._do_callback_active = this.active;
      }
    }
  }

  on_tick(event) {
    if (!this._have_rebuilt) return;
    
    if (this._do_end) {
      this.parent.remove(this);
      this.parent.do_recalc();
      this.pop_modal();
      
      this._do_end = false;
      this._have_rebuilt = false;
    }
    
    if (this._do_callback) {
      this._do_callback = false;
      
      if (this.callback != undefined && this._do_callback_active != undefined) {
        var en = this._do_callback_active;
        
        this.chosen_id = this.idmap[en.i];
        this.callback(this.active, this.idmap[en.i]);
      }
    }
  }

  on_mousedown(event)
  {
    var mpos = this.off_mpos([event.x, event.y])
    
    if (Math.sqrt(mpos[0]*mpos[0]+mpos[1]*mpos[1]) < this.radius_min) {
      this.end_menu(false);
    } else {
      //UIFrame.prototype.on_mousedown.call(this, event);
    }
  }

  on_mouseup(event)
  {
    var mpos = this.off_mpos([event.x, event.y])
    
    this.had_up_event = event.button;
    
    var dis = Math.sqrt(mpos[0]*mpos[0]+mpos[1]*mpos[1]);
    if (dis > this.radius_min) {
      this.end_menu(true);
    } else {
      //UIFrame.prototype.on_mousedown.call(this, event);
    }
  }

  off_mpos(mpos) {
    return new Vector2([mpos[0]-this.size[0]*0.5, mpos[1]-this.size[1]*0.5])
  }

  on_mousemove(event)
  {
    this.mpos.load([event.x, event.y])
    
    var mpos = this.off_mpos([event.x, event.y])
    
    if (Math.sqrt(mpos[0]*mpos[0]+mpos[1]*mpos[1]) < this.radius_min-3) {
      if (this.active != undefined) {
        this.active.state &= ~UIFlags.HIGHLIGHT;
        this.active.on_inactive();
        this.active.do_recalc();
        this.active = undefined;
        this.active = undefined;
      }
      //return;
    }
    
    //UIFrame.prototype.on_mousemove.call(this, event);
    
    /*find active radial menu entry*/
    var n1 = new Vector2(this.off_mpos([event.x, event.y]))
    var ax = new Vector2([0, 1]);
    
    n1.normalize();
    var ang = Math.acos(ax.dot(n1));
    
    if (!winding([0, 0], n1, ax))
      ang = -ang;
    
    for (var c of this.children) {
      if (c.constructor.name != UIRadialMenuEntry.name) continue;
      
      var a1 = Math.min(c.start_angle, c.end_angle);
      var a2 = Math.max(c.start_angle, c.end_angle);
      
      if (ang >= a1 && ang <= a2) {
        if (this.active && this.active != c) {
          this.active.state &= ~UIFlags.HIGHLIGHT;
          this.active.on_inactive();
        }
        
        this.active = c;
        c.state |= UIFlags.HIGHLIGHT;
        c.on_active();
        this.do_recalc();
        break
      }
    }
    /*the menu code is designed so that client users can insert
      hidden elements for, as an example, switching between menus on
      a menu bar.  theoretically, the client could also insert icon
      elements and the like.*/
    
    var radius = this.radius_max+5
    if (this.had_up_event != undefined) {
      radius += 50;
    }
    
    console.log("---", this.had_up_event)
    if (Math.sqrt(mpos[0]*mpos[0]+mpos[1]*mpos[1]) > radius) {
      this.end_menu(this.had_up_event == undefined);
      
      if (this.had_up_event == undefined) {
        //ensure we don't cancel any tools 
        if (this.swap_mouse_button != undefined) {
          ignore_next_mouseup_event(this.swap_mouse_button);
        }
      }
    }
  }

  build_arc(canvas, start, arc, color) {
    var cent = this.cent;
    
    var steps = 40
    
    var points1 = canvas.arc_points(cent, start, arc, this.radius_min, steps);
    var points2 = canvas.arc_points(cent, start, arc, this.radius_max, steps);
    
    points1.reverse();
    
    var lines1 = []
    var lines2 = []
    
    //for (var i=0; i<points1.length-1; i++) {
     // var i2 =
      //lines1.push([
    //}
    
    for (var i=0; i<points1.length-1; i += 1) {
      var v1, v2, v3, v4;
      
      var i2 = points1.length-i-1;
      
      v1 = points1[i];
      v2 = points2[i2];
      v3 = points2[i2-1];
      v4 = points1[i+1];
      
      canvas.quad(v1, v2, v3, v4, color);
    }
    
    canvas.line_loop(points1.concat(points2), color, undefined, 2, true);
  }

  build_circle(canvas) {
    var cent = this.cent; //this.size[0]/2.0, this.size[1]/2.0];
    
    var steps = 40
    
    var points1 = canvas.arc_points(cent, 0, -Math.PI*2, this.radius_min, steps);
    var points2 = canvas.arc_points(cent, 0, Math.PI*2, this.radius_max, steps);
    
    var clr = uicolors["RadialMenu"]
    var menu = this;
    function color(v) {
      var c = new Vector3(clr);
      
      var fac = v[1]/menu.size[1]
      fac = fac*0.5 + 0.5
      c.mulScalar(fac);
      return [c[0], c[1], c[2], clr[3]]
    }
    
    var colors1 = []
    var colors2 = []
    
    for (var i=0; i<points1.length; i++) {
      colors1.push(color(points1[i]))
      colors2.push(color(points2[i]))
    }
    
    canvas.line_loop(points1, colors1, undefined, 2, true);
    canvas.line_loop(points2, colors2, undefined, 2, true);
    
    for (i=0; i<points1.length-1; i += 1) {
      var v1, v2, v3, v4;
      
      var i2 = points1.length-i-1;
      
      v1 = points1[i];
      v2 = points2[i2];
      v3 = points2[i2-1];
      v4 = points1[i+1];
      
      canvas.quad(v1, v2, v3, v4, color(v1), color(v2), color(v3), color(v4));
    }
  }

  angle_line(angle, cent) {
    var px1 = cent[0] + Math.sin(angle)*this.radius_min;
    var py1 = cent[1] + Math.cos(angle)*this.radius_min;
    
    var px2 = cent[0] + Math.sin(angle)*this.radius_max;
    var py2 = cent[1] + Math.cos(angle)*this.radius_max;
    
    return [[px1, py1], [px2, py2]]
  }

  build_draw(canvas, isVertical) {
    if (!this.packed) {
      this.packmenu(canvas);
      this.packed = true;
    }
    
    UIFrame.prototype.build_draw.call(this, canvas, true);
    canvas.begin(this);
    
    if (this.closed) {
      this._have_rebuilt = true;
      canvas.end(this);
      return;
    }
    
    //canvas.simple_box([0, 0], this.size, undefined, 35.0);
    //canvas.text([24, this.size[1]-22], this.name, uicolors["BoxText"])
    
    this.build_circle(canvas);
    
    var cent = this.cent; //this.size[0]*0.5, this.size[1]*0.5]
    for (var c of this.children) {
      if (c.constructor.name != UIRadialMenuEntry.name) continue;
      
      var lin1 = this.angle_line(c.start_angle, cent);
      var lin2 = this.angle_line(c.end_angle, cent);
      
      /*if (c == this.children[0]) {
        canvas.line(lin1[0], lin1[1], uicolors["Highlight"], undefined, 15.0);
        canvas.line(lin2[0], lin2[1], uicolors["DefaultText"], undefined, 12.0);
      } else{
        canvas.line(lin1[0], lin1[1], uicolors["Highlight"], undefined, 2.0);*/
        canvas.line(lin2[0], lin2[1], uicolors["DefaultText"], undefined, 2.0);
      //}
      
      var hcolor = uicolors["RadialMenuHighlight"]
      if (c.state & UIFlags.HIGHLIGHT) {
        this.build_arc(canvas, c.start_angle, c.end_angle-c.start_angle, hcolor) 
      }
    }
    
    var v1 = this.off_mpos(this.mpos);
    v1.normalize()
    v1.mulScalar(100.0);
    var sz2 = cent;
    
    v1.add(sz2);
    
    var v2 = sz2;
    
    //canvas.line(v1, v2, uicolors["DefaultText"], undefined, 2.0);
    
    //v1 = new Vector2([0, 100]).add(sz2)
    //canvas.line(v1, v2, uicolors["DefaultText"], undefined, 2.0);
     
    canvas.end(this);
    
    this._have_rebuilt = true;
  }
}

function is_menu_open(frame) {
  while (frame.parent != undefined) {
    frame = frame.parent;
  }
  
  for (var c of frame.children) {
    if (c.constructor.name == UIRadialMenu.constructor.name && !c.closed)
      return true;      
    if (c.constructor.name == UIMenu.constructor.name && !c.closed)
      return true;      

    }
  
  return false;
}

function ui_call_radial_menu(menu, frame, pos) {
  var off = [pos[0], pos[1]];
  
  while (frame.parent != undefined) {
    off[0] += frame.pos[0]; off[1] += frame.pos[1]
    frame = frame.parent;
  }  
  
  menu.closed = false;
  menu.canvas = frame.canvas;
  menu.packmenu(frame.canvas);
  menu.do_recalc();
  menu.had_up_event = undefined;
  
  menu.pos[0] = off[0]-menu.size[0]/2;
  menu.pos[1] = off[1]-menu.size[1]/2;
  
  menu.call_time = time_ms()
  menu.last_active = frame.active
  
  frame.do_recalc();
  frame.add(menu);
  frame.push_modal(menu);
  frame._on_mousemove({"x": off[0]-frame.pos[0], "y":off[1]-frame.pos[1]})
}

function toolop_radial_menu(ctx, name, oplist) {
  var oplist_instance = []
  
  function op_callback(entry, id) {
    ctx.toolstack.exec_tool(oplist_instance[id]);
  }
  
  var menu = new UIRadialMenu(name, op_callback);
  for (var i=0; i<oplist.length; i++) {
    var opstr = oplist[i];
    var op = opstr;
    
    if (typeof opstr == "string") {
      op = ctx.api.get_op(ctx, opstr);
    }
    
    if (op == undefined)
      continue;
    
    var hotkey;
    
    if (op.hotkey != undefined)
      hotkey = op.build_str(true);
    else
      hotkey = ""
      
    oplist_instance.push(op);
    menu.add_item(op.uiname, hotkey, oplist_instance.length-1);
  }
  
  return menu;
}