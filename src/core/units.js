"use strict";

/*
--Unit system design--

The internal unit format is centimeters.
The UI exposes "unit strings," which allows
the user to input other units based on a
specific format.

Unit format form:

(numerical expression) (unit suffix)

E.g. "1/2in", "10cm", "2ft", "1/2''", "1/2'"

Unit suffixes:
in,'',`` : inches
ft,',`   : feet
m        : meters
mm       : milimeters
cm       : centimeters
km       : kilograms
ml       : mile
*/

var number_regexpr = /(0x[0-9a-fA-F]+)|((\d|(\d\.\d+))+(e|e\-|e\+)\d+)|(\d*\.\d+)|(\d+)/;

class Unit {
  constructor(suffices, cfactor) {
    this.cfactor = cfactor;
    this.suffix_list = suffices;
  }
  
  //expects normalized (centimeters) values
  from_normalized(v) {
    return v/this.cfactor;
  }
    
  to_normalized(v) {
    return v*this.cfactor;
  }

  static get_unit(string) {
    var lower = string.toLowerCase();
    var units = Unit.units;
    var unit = undefined;
    
    if (string == "default") {
      string = lower = g_app_state.session.settings.unit;
    }
    
    for (var i=0; i<units.length; i++) {
      var u = units[i];
      
      for (var j=0; j<u.suffix_list.length; j++) {
        if (lower.trim().endsWith(u.suffix_list[j])) {
          unit = u;
          
          string = string.slice(0, string.length-u.suffix_list[j].length);
          break;
        }
      }
      
      if (unit != undefined)
        break;
    }
    
    return [unit, string];
  }

  static parse(string, oldval, errfunc, funcparam, defaultunit) { 
    //oldval, errfunc, funcparam are optional
    var units = Unit.units;
    var lower = string.toLowerCase();
    var unit = undefined;
    
    if (defaultunit == undefined)
      defaultunit = "cm";
      
    if (oldval == undefined)
      oldval = 0.0;
    
    var ret = Unit.get_unit(string);    
    unit = ret[0];
    string = ret[1];
    
    //do no unit processing if there is no unit
    if (unit == undefined) {
      unit = Unit.get_unit(defaultunit)[0];
    }
    
    var val = -1;
    try {
      val = eval(string);
    } catch (err) {
      if (errfunc != undefined) {
        errfunc(funcparam);
      }
      
      return oldval;
    }
    
    if (val == undefined || typeof(val) != "number" || isNaN(val)) {
      console.log(["haha ", val, string]);
      errfunc(funcparam);
      return oldval;
    }
    
    if (unit != undefined) {
      val = unit.to_normalized(val);
    }
    
    return val;
  }

  static gen_string(val, suffix, max_decimal=3) { 
    //max_decimal is optional
    //if suffix is undefined, no processing is done
    //if suffix is "default", g_app_state.session.settings.unit will be used
    
    if (!(typeof val == "number") || val == undefined)
      return "?";
    
    if (suffix == undefined)
      return val.toFixed(max_decimal);
      
    if (suffix == "default")
      suffix = g_app_state.session.settings.unit;
    
    suffix = suffix.toLowerCase().trim();
    
    var unit = undefined;
    var units = Unit.units;
    
    for (var i=0; i<units.length; i++) {
      var u = units[i];
      var sl = u.suffix_list;
      
      for (var j=0; j<sl.length; j++) {
        var s = sl[j];
        
        if (s == suffix) {
          unit = u;
          break;
        }
      }
      
      if (unit != undefined)
        break;
    }
    
    var out;
    
    if (unit != undefined) {
      val = unit.from_normalized(val);
      if (val != undefined) val = val.toFixed(max_decimal);
      else val = "0";
      
      out = val.toString() + unit.suffix_list[0];
    } else {
      val = val.toFixed(max_decimal);
      out = val.toString() + Unit.internal_unit;
    }
    
    return out;
  }
}
  
Unit.units = [
  new Unit(["cm"], 1.0),
  new Unit(["in", "''", "``"], 2.54),
  new Unit(["ft", "'", "`"], 30.48),
  new Unit(["m"], 100),
  new Unit(["mm"], 0.1),
  new Unit(["km"], 0.00001),
  new Unit(["mile"], 160934.4)
];

Unit.metric_units = ["cm", "m", "mm", "km"];
Unit.imperial_units = ["in", "ft", "mile"];

Unit.internal_unit = "cm"

