/*
function SpatialHash(cellsize=0.25, startsize=128) {
  this.buckets = new GArray();
  this.totitems = 0;
  this.cellsize = cellsize;
  
  for (var i=0; i<startsize; i++) {
    this.buckets.push(new Array());
  }
  
  this.coordhash = function(co) {
    var vec = new Vector3(co);
    vec.divScalar(this.cellsize);
    
    var x = Math.floor(vec[0]);
    var y = Math.floor(vec[1]);
    var z = Math.floor(vec[2]);
    
    return Math.floor((x*x)<<2 + Math.abs(y)<<3 + z*z);
  }
  
  this._resize_hash = function(newsize) {
    var newbuckets = new GArray();
    for (var i=0; i<newsize; i++) {
      newbuckets.push(new GArray());
    }
    
    for (var b in this.buckets) {
      for (var item in b) {
        var hash = this.coordhash(item[0]);
        newbuckets[hash % newbuckets.length].add(item);
      }
      
      this.buckets = newbuckets;
    }
  }
  
  this.insert = function(co, item) {
    var hash = this.coordhash(co);
    this.buckets[hash % this.buckets.length].push([new Vector3(co), item])
    
    this.totitems++;
    
    if (this.totitems > this.buckets.length/3) {
      this._resize_hash(this.buckets.length*2);
    }
  }
  
  this.query = function(co, radius) {
    var retlist = new GArray();
    var start = new Vector3(co);
    var cellsize = this.cellsize;
    var range = new Vector3([1, 1, 1]);
    
    range.mulScalar(Math.ceil((radius + FLT_EPSILON*100)/cellsize));
    
    start.divScalar(cellsize);
    start.floor();
    
    var end = new Vector3(start);
    
    end.add(range);
    start.sub(range);
    
    for (var x=start[0]; x<=end[0]; x++) {
      for (var y=start[1]; y<=end[1]; y++) {
        for (var z=start[2]; z<=end[2]; z++) { 
          var bco = new Vector3([x*cellsize, y*cellsize, z*cellsize]);
          hash = this.coordhash(bco);
          b = this.buckets[hash % this.buckets.length];
          
          for (var i=0; i<b.length; i++) {
              item = b[i];
              
              // avoid duplicate returns
              var ico = new Vector3(item[0]);
              ico.divScalar(cellsize);
              ico.floor();
              if (ico[0] != x || ico[1] != y || ico[2] != z) continue;
              
              if (item[0].vectorDistance(co) <= radius) {
                retlist.push(item[1]);
              }
          }
        }
      }
    }
    
    return retlist;
  }
}
*/
