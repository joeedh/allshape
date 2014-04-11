/*need to get rid of this file, it's outdated*/

limit_code = {"0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, 
              "6": 6, "7": 7, "8": 8, "9": 9}
limit_code_rev = {}

var c = 10;
for (var i=65; i<91; i++) {
  limit_code[String.fromCharCode(i)] = c++;
}
limit_code["."] = c++
limit_code["?"] = c++
max_limit_code = c;

for (var k in limit_code) {
  limit_code_rev[limit_code[k]] = k;
}

_sran_tab = [0.42858355099189227,0.5574386030715371,0.9436109711290556,
0.11901816474442506,0.05494319267999703,0.4089598843412747,
0.9617377622975879,0.6144736752713642,0.4779527665160106,
0.5358937375859902,0.6392009453796094,0.24893232630444684,
0.33278166078571036,0.23623349009987882,0.6007015401310062,
0.3705022651967115,0.0225052050200355,0.35908220770197297,
0.6762962413645864,0.7286584766550781,0.19885076794257972,
0.6066651236611478,0.23594878250486895,0.9559806203614414,
0.37878311003873877,0.14489505173573436,0.6853451367228348,
0.778201767931336,0.9629591508405009,0.10159174495809686,
0.9956652458055149,0.27241630290235785,0.4657146086929548,
0.7459995799823305,0.30955785437169314,0.7594519036966647,
0.9003876360971134,0.14415784566467216,0.13837285006138467,
0.5708662986155526,0.04911823375362412,0.5182157396751097,
0.24535476698939818,0.4755762294863617,0.6241760808125321,
0.05480018253112229,0.8345698022607818,0.26287656274013016,
0.1025239144443526];

class StupidRandom {
  constructor(int seed) {
    if (seed == undefined)
      seed = 0;
    
    this._seed = seed+1;
    this.i = 1;
  }
  
  seed(int seed) {
    this._seed = seed+1;
    this.i = 1;
  }
  
  random() : float {
    var tab = _sran_tab;
    
    var i = this.i;
    
    if (i < 0) {
      i = Math.abs(i)-1;
    }
    i = Math.max(i, 1);
    
    var i1 = Math.max(i, 0) + this._seed;
    var i2 = Math.ceil(i/4 + this._seed);
    var r1 = Math.sqrt(tab[i1%tab.length]*tab[i2%tab.length]);
    
    this.i++;
    
    return r1;
  }
}

_keyrot_rnd = new StupidRandom(0);
function key_rot(Object key) {
  key = key.toString().toUpperCase();
  s2 = ""
  
  if (key.length > 0) {
    var c = key[key.length-1]
    
    if (!(c in limit_code)) {
      throw "Invalid string for key_rot!"; //XXX disable this for production runs
    }
    
    _keyrot_rnd.seed(limit_code[c]);
  }
  
  for (var i=0; i<key.length-1; i++) {
    var c = key[i]
    
    if (!(c in limit_code)) {
      console.log(c);
      throw "Invalid string for key_rot!"; //XXX disable this for production runs
    }
    
    var limitcode = limit_code[c];
    
    var r = Math.floor(_keyrot_rnd.random()*24.0);
    
    limitcode = (limitcode + r) % max_limit_code;
    
    c = limit_code_rev[limitcode];
    s2 += c
  }
  
  if (key.length > 0) {
    s2 += key[key.length-1]
  }
  
  return s2;
}

function key_unrot(Object key) {
  key = key.toString().toUpperCase();
  s2 = ""
  
  if (key.length > 0) {
    var c = key[key.length-1]
    
    if (!(c in limit_code)) {
      console.log(c);
      throw "Invalid string for key_rot!"; //XXX disable this for production runs
    }
    
    _keyrot_rnd.seed(limit_code[c]);
  }
  
  for (var i=0; i<key.length-1; i++) {
    var c = key[i]
    
    if (!(c in limit_code)) {
      throw "Invalid string for key_rot!"; //XXX disable this for production runs
    }
    
    var limitcode = limit_code[c];
    
    var r = Math.floor(_keyrot_rnd.random()*24.0);
    
    limitcode = (limitcode + max_limit_code - r) % max_limit_code;
    
    c = limit_code_rev[limitcode];
    s2 += c
  }
  
  if (key.length > 0) {
    s2 += key[key.length-1]
  }
  
  return s2;
}

//okay. . .clearly, I never implemented this.
function SFileDB_Backend() {
}

create_prototype(SFileDB_Backend);
SFileDB_Backend.prototype.get_file = function(id) {}
SFileDB_Backend.prototype.set_file_meta = function(id, meta) {}
SFileDB_Backend.prototype.prepare_file_upload = function(id) {}
SFileDB_Backend.prototype.file_upload_chunk = function(id, token) {}
SFileDB_Backend.prototype.get_upload_cur = function(id, token) {}
SFileDB_Backend.prototype.get_upload_status = function(id, token) {}
SFileDB_Backend.prototype.file_link_dir = function(id) {}
SFileDB_Backend.prototype.create_file = function(name, mimetype, parent) {}
SFileDB_Backend.prototype.create_folder = function(name, parent) {}

function SFileDB() {
  this.cur_id = 1;
  this.userkey = 0;
  
  this.gen_id = function(filename) {
    function gen_id(cols, id) {
      hex = id.toString(16);
      var slen = cols-hex.length;
      
      for (var i=0; i<slen; i++) {
        hex = "0" + hex
      }
      
      return hex
    }
    
    return key_rot(this.userkey + "." + gen_id(8, this.cur_id++));
  }
}

function SFile(id, name) {
  this.id = id
  this.name = new String(name)
  this.mime = "application/binary"
  this.parents = new set()
  this.labels = {"trashed": false}
  this.modified_time = ""
  this.access_time = ""
  this.trashed_time = ""
}